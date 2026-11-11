/* Deterministic public-beta UI tests. All API traffic is intercepted locally.
   This suite never writes to the real leaderboard. Start server.js first. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const API = 'https://xdtbodt7p2.execute-api.us-east-1.amazonaws.com';
const URL = process.env.QUIZCLOUD_URL || 'http://127.0.0.1:8000';
const artifacts = path.join(__dirname, '..', 'artifacts');
fs.mkdirSync(artifacts, { recursive: true });
const requests = [];
let passed = 0;
function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}
async function json(route, data, status = 200) {
  await route.fulfill({ status, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(data) });
}
async function status(page, id, text) {
  await page.locator('#' + id).filter({ hasText: text }).waitFor({ timeout: 5000 });
}
async function finish(page, categoryIndex = 3, correctCount = 8) {
  await page.locator('.category-card').nth(categoryIndex).click();
  for (let i = 0; i < 10; i++) {
    const correct = await page.evaluate(() => {
      const q = Object.values(QuizData.questions).flat().find(q => q.question === document.getElementById('question-text').textContent);
      return [...document.querySelectorAll('.answer')].findIndex(button => button.children[1].textContent === q.options[q.correct]);
    });
    await page.locator('.answer').nth(i < correctCount ? correct : (correct + 1) % 4).click();
    await page.locator('#next-question').click();
  }
  await page.locator('#results').waitFor();
}
async function noOverflow(page) {
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Horizontal overflow');
}
(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  try {
    async function check(label, run, options = {}) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, ...options });
      const page = await context.newPage();
      const errors = [];
      const calls = [];
      let handler = route => json(route, { success: true, leaderboard: [] });
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => {
        // Deliberately simulated network/HTTP failures can produce browser diagnostics.
        if (message.type() === 'error' && !/Failed to load resource/.test(message.text())) errors.push(message.text());
      });
      await context.route(API + '/**', async route => {
        calls.push({ method: route.request().method(), url: route.request().url(), body: route.request().postDataJSON() });
        requests.push(route.request().url());
        await handler(route);
      });
      try {
        await page.clock.install();
        await page.goto(URL);
        await run({ page, context, calls, setHandler: next => { handler = next; } });
        assert.deepEqual(errors, [], 'Uncaught JavaScript or unexpected console errors');
        console.log('PASS: ' + label);
        passed++;
      } finally { await context.close(); }
    }

    await check('opt-in only, exact score payload, duplicate guard, nickname/ID persistence, and lower-best response', async ({ page, calls, setHandler }) => {
      await page.evaluate(() => localStorage.setItem('quizcloud.player-id.v1', 'invalid player id!'));
      const gate = deferred();
      let saved = true;
      setHandler(async route => { await gate.promise; await json(route, { success: true, saved }); });
      await finish(page);
      assert.equal(calls.length, 0, 'No network request before a deliberate leaderboard action');
      assert.equal(await page.locator('#result-best').textContent(), '800');
      await page.locator('#cloud-nickname').fill('  QuizFan  ');
      await page.locator('#cloud-submit-button').click();
      await status(page, 'cloud-submit-status', 'Submitting');
      await page.locator('#cloud-submit-form').evaluate(form => form.requestSubmit());
      gate.resolve();
      await status(page, 'cloud-submit-status', 'Saved 800');
      assert.equal(calls.length, 1);
      assert.equal(calls[0].method, 'POST');
      assert.equal(calls[0].url, API + '/scores');
      assert.deepEqual(Object.keys(calls[0].body).sort(), ['category', 'name', 'playerId', 'score']);
      const id = calls[0].body.playerId;
      assert.match(id, /^[A-Za-z0-9_-]{8,64}$/);
      assert.deepEqual(calls[0].body, { playerId: id, name: 'QuizFan', category: 'movies', score: 800 });
      assert.equal(await page.locator('#cloud-submit-button').isDisabled(), true);
      await page.locator('#cloud-submit-form').evaluate(form => form.requestSubmit());
      assert.equal(calls.length, 1);
      await page.screenshot({ path: path.join(artifacts, 'leaderboard-submit-desktop.png'), fullPage: true });
      await page.reload();
      assert.equal(await page.locator('#cloud-nickname').inputValue(), 'QuizFan');
      assert.match(await page.locator('.category-card').nth(3).textContent(), /Best: 800/);
      saved = false;
      await finish(page, 3, 5);
      await page.locator('#cloud-submit-button').click();
      await status(page, 'cloud-submit-status', 'already as high or higher');
      assert.equal(calls[1].body.playerId, id);
      assert.equal(calls[1].body.score, 500);
      assert.equal(await page.locator('#result-best').textContent(), '800');
    });

    await check('rankings in all categories, empty state, top ten limit, and hostile text rendered safely', async ({ page, calls, setHandler }) => {
      const hostile = '<img src=x onerror=1>';
      let empty = false;
      setHandler(route => {
        const category = new globalThis.URL(route.request().url()).searchParams.get('category');
        const rows = empty ? [] : [{ name: hostile, score: 1000 }, ...Array.from({ length: 12 }, () => ({ name: category + ' Player', score: 800 })), { name: 'Invalid', score: -1 }];
        return json(route, { success: true, leaderboard: rows });
      });
      await page.locator('#cloud-open-board').click();
      await status(page, 'cloud-board-status', 'Movies · Top 10');
      assert.equal(await page.locator('.cloud-rank').count(), 10);
      assert.equal(await page.locator('.cloud-rank span').first().textContent(), hostile);
      assert.equal(await page.locator('#cloud-rankings img, #cloud-rankings script').count(), 0);
      for (const category of ['sports', 'technology', 'geography', 'movies']) {
        await page.locator('#cloud-category').selectOption(category);
        await status(page, 'cloud-board-status', category[0].toUpperCase() + category.slice(1) + ' · Top 10');
      }
      assert.ok(calls.every(call => call.method === 'GET'));
      empty = true;
      await page.locator('#cloud-refresh').click();
      await page.locator('.cloud-empty').waitFor();
      await page.locator('#cloud-close-board').click();
      assert.equal(await page.locator('#cloud-open-board').evaluate(e => e === document.activeElement), true);
    });

    await check('category switches cancel stale responses and retain the newest ranking', async ({ page, setHandler }) => {
      const started = deferred();
      const gate = deferred();
      setHandler(async route => {
        const category = new globalThis.URL(route.request().url()).searchParams.get('category');
        if (category === 'movies') { started.resolve(); await gate.promise; }
        try { await json(route, { success: true, leaderboard: [{ name: category + ' Player', score: 900 }] }); } catch { /* canceled stale request */ }
      });
      await page.locator('#cloud-open-board').click();
      await started.promise;
      assert.equal(await page.locator('#cloud-refresh').isDisabled(), true);
      await page.locator('#cloud-category').selectOption('sports');
      await status(page, 'cloud-board-status', 'Sports · Top 1');
      gate.resolve();
      assert.match(await page.locator('#cloud-rankings').textContent(), /sports Player/);
      assert.equal(await page.locator('#cloud-refresh').isDisabled(), false);
    });

    await check('GET failures and invalid responses recover; the quiz remains playable', async ({ page, setHandler }) => {
      let mode = 'http';
      setHandler(route => {
        if (mode === 'http') return json(route, { success: false }, 503);
        if (mode === 'invalid') return json(route, { success: true, leaderboard: [null, { name: 'Bad', score: '1000' }] });
        if (mode === 'offline') return route.abort('failed');
        return json(route, { success: true, leaderboard: [{ name: 'Recovered', score: 600 }] });
      });
      await page.locator('#cloud-open-board').click();
      for (const next of ['invalid', 'offline', 'ok']) {
        await status(page, 'cloud-board-status', 'Could not load');
        mode = next;
        await page.locator('#cloud-refresh').click();
      }
      await status(page, 'cloud-board-status', 'Movies · Top 1');
      await page.locator('#cloud-close-board').click();
      await finish(page, 0, 5);
      assert.equal(await page.locator('#result-best').textContent(), '500');
    });

    await check('8-second GET and POST timeouts release controls without losing local bests', async ({ page, setHandler }) => {
      const gate = deferred();
      const getStarted = deferred();
      const postStarted = deferred();
      setHandler(async route => {
        if (route.request().method() === 'POST') postStarted.resolve(); else getStarted.resolve();
        await gate.promise;
        try { await json(route, { success: true, leaderboard: [], saved: true }); } catch { /* timed out */ }
      });
      await page.locator('#cloud-open-board').click();
      await getStarted.promise;
      await page.clock.fastForward(9000);
      await status(page, 'cloud-board-status', 'Could not load');
      assert.equal(await page.locator('#cloud-refresh').isDisabled(), false);
      await page.locator('#cloud-close-board').click();
      await finish(page, 1, 6);
      await page.locator('#cloud-nickname').fill('TimeoutTest');
      await page.locator('#cloud-submit-button').click();
      await postStarted.promise;
      await page.clock.fastForward(9000);
      await status(page, 'cloud-submit-status', 'Could not confirm');
      assert.equal(await page.locator('#cloud-submit-button').isDisabled(), false);
      assert.equal(await page.locator('#result-best').textContent(), '600');
      gate.resolve();
    });

    await check('nickname validation, HTTP/malformed POST handling, and explicit retry', async ({ page, calls, setHandler }) => {
      let mode = 'http';
      setHandler(route => mode === 'http' ? json(route, { success: false }, 429) : json(route, { success: true, saved: mode === 'malformed' ? 'yes' : true }));
      await finish(page, 2, 7);
      await page.locator('#cloud-nickname').fill('   ');
      await page.locator('#cloud-submit-button').click();
      await status(page, 'cloud-submit-status', '1–24');
      assert.equal(calls.length, 0);
      await page.locator('#cloud-nickname').fill('RetryTest');
      await page.locator('#cloud-submit-button').click();
      await status(page, 'cloud-submit-status', 'Could not confirm');
      mode = 'malformed';
      await page.locator('#cloud-submit-button').click();
      await status(page, 'cloud-submit-status', 'Could not confirm');
      mode = 'ok';
      await page.locator('#cloud-submit-button').click();
      await status(page, 'cloud-submit-status', 'Saved 700');
      assert.equal(calls.length, 3);
      assert.equal(await page.locator('#result-best').textContent(), '700');
    });

    await check('a pending old submission cannot overwrite a replayed round', async ({ page, setHandler }) => {
      const gate = deferred();
      const started = deferred();
      let first = true;
      setHandler(async route => {
        if (first) { first = false; started.resolve(); await gate.promise; }
        await json(route, { success: true, saved: true });
      });
      await finish(page, 3, 8);
      await page.locator('#cloud-nickname').fill('ReplayTest');
      await page.locator('#cloud-submit-button').click();
      await started.promise;
      await page.locator('#play-again').click();
      await page.locator('#leave-quiz').click();
      await finish(page, 0, 2);
      gate.resolve();
      await page.waitForTimeout(100);
      assert.equal(await page.locator('#cloud-submit-status').textContent(), '');
      assert.equal(await page.locator('#cloud-submit-button').isDisabled(), false);
      await page.locator('#cloud-submit-button').click();
      await status(page, 'cloud-submit-status', 'Saved 200 points to the Sports');
    });

    await check('score submission works when browser storage is blocked', async ({ page, calls, context, setHandler }) => {
      await context.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw new Error('Storage blocked'); } }));
      await page.reload();
      setHandler(route => json(route, { success: true, saved: true }));
      await finish(page, 1, 3);
      await page.locator('#cloud-nickname').fill('PrivateMode');
      await page.locator('#cloud-submit-button').click();
      await status(page, 'cloud-submit-status', 'Saved 300');
      assert.match(calls[0].body.playerId, /^[A-Za-z0-9_-]{8,64}$/);
      assert.equal(await page.locator('#storage-notice').isVisible(), true);
      assert.equal(await page.locator('#result-best').textContent(), '300');
    });

    await check('localized perfect scores, 320/390px layout, keyboard board access, and category-specific results link', async ({ page, calls, setHandler }) => {
      setHandler(route => json(route, route.request().method() === 'POST'
        ? { success: true, saved: true }
        : { success: true, leaderboard: [{ name: 'ABCDEFGHIJKLMNOPQRSTUVWX', score: 1000 }] }));
      for (const width of [320, 390]) {
        await page.setViewportSize({ width, height: 844 });
        await page.locator('#cloud-open-board').focus();
        await page.keyboard.press('Enter');
        await status(page, 'cloud-board-status', 'Movies · Top 1');
        assert.equal(await page.locator('#cloud-board-title').evaluate(e => e === document.activeElement), true);
        await noOverflow(page);
        if (width === 390) await page.screenshot({ path: path.join(artifacts, 'leaderboard-mobile.png'), fullPage: true });
        await page.locator('#cloud-close-board').click();
      }
      await finish(page, 1, 10);
      assert.equal(await page.locator('#final-score').textContent(), '1.000');
      await noOverflow(page);
      await page.screenshot({ path: path.join(artifacts, 'leaderboard-results-mobile.png'), fullPage: true });
      await page.locator('#cloud-nickname').fill('LocaleTest');
      await page.locator('#cloud-submit-button').click();
      await status(page, 'cloud-submit-status', 'Saved 1.000');
      assert.equal(calls.find(call => call.method === 'POST').body.score, 1000);
      await page.locator('#cloud-result-rankings').click();
      await status(page, 'cloud-board-status', 'Technology · Top 1');
      assert.equal(await page.locator('#home').isVisible(), true);
      assert.equal(await page.locator('#cloud-category').inputValue(), 'technology');
    }, { locale: 'de-DE' });

    console.log(`Leaderboard UI: ${passed} checks passed, 0 failed; ${requests.length} intercepted API requests; no live score submissions.`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
