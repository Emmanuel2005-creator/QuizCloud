/* Explicit read-only live check. It never submits production scores. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { chromium } = require('playwright');
const SITE = 'https://d17wyxi8cpi412.cloudfront.net';
const API = 'https://xdtbodt7p2.execute-api.us-east-1.amazonaws.com';
const root = path.join(__dirname, '..');
const artifacts = path.join(root, 'artifacts');
const hash = content => crypto.createHash('sha256').update(content.replace(/\r\n/g, '\n')).digest('hex');
(async () => {
  fs.mkdirSync(artifacts, { recursive: true });
  const report = { site: SITE, checkedAt: new Date().toISOString(), assets: [], categories: [], attemptedPosts: 0 };
  for (const file of ['index.html', 'styles.css', 'questions.js', 'game.js', 'app.js', 'leaderboard.js', 'leaderboard.css']) {
    const response = await fetch(`${SITE}/${file}`, { cache: 'no-store', signal: AbortSignal.timeout(20000) });
    const text = await response.text();
    report.assets.push({ file, http: response.status, matches: response.ok && hash(text) === hash(fs.readFileSync(path.join(root, 'dist', file), 'utf8')) });
  }
  console.log('Live asset comparison: ' + JSON.stringify(report.assets));
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const errors = [];
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await context.route(API + '/**', async route => {
      if (!['GET', 'OPTIONS'].includes(route.request().method())) {
        report.attemptedPosts++;
        await route.abort('blockedbyclient');
      } else await route.continue();
    });
    await page.clock.install();
    const response = await page.goto(SITE);
    assert.equal(response.status(), 200);
    await page.locator('#cloud-open-board').click();
    for (const category of ['sports', 'technology', 'geography', 'movies']) {
      await page.locator('#cloud-category').selectOption(category);
      const label = category[0].toUpperCase() + category.slice(1);
      await page.locator('#cloud-board-status').filter({ hasText: label + ' · Top' }).waitFor({ timeout: 15000 });
      const rows = await page.locator('.cloud-rank').count();
      report.categories.push({ category, browserRead: 'passed', rows });
    }
    await page.screenshot({ path: path.join(artifacts, 'live-leaderboard-desktop.png'), fullPage: true });
    await page.locator('#cloud-close-board').click();
    for (let category = 0; category < 4; category++) {
      await page.locator('.category-card').nth(category).click();
      const questions = new Set();
      for (let i = 0; i < 10; i++) {
        questions.add(await page.locator('#question-text').textContent());
        if (category === 0 && i === 9) {
          await page.clock.fastForward(21000);
          await page.locator('#feedback').filter({ hasText: 'Time’s up' }).waitFor();
        } else {
          const answer = await page.evaluate(() => {
            const prompt = document.getElementById('question-text').textContent;
            const question = Object.values(QuizData.questions).flat().find(q => q.question === prompt);
            return [...document.querySelectorAll('.answer')].findIndex(button => button.children[1].textContent === question.options[question.correct]);
          });
          await page.locator('.answer').nth(i < 7 ? answer : (answer + 1) % 4).click();
        }
        assert.equal(await page.locator('.answer:disabled').count(), 4);
        await page.locator('#next-question').click();
      }
      assert.equal(questions.size, 10);
      assert.equal(await page.locator('#final-score').textContent(), '700');
      assert.equal(await page.locator('#result-best').textContent(), '700');
      assert.equal(await page.locator('#review-list li').count(), 10);
      if (category === 3) {
        await page.setViewportSize({ width: 390, height: 844 });
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        await page.screenshot({ path: path.join(artifacts, 'live-results-mobile.png'), fullPage: true });
        await page.locator('#play-again').click();
        assert.equal(await page.locator('#current-score').textContent(), '0');
        await page.locator('#leave-quiz').click();
      } else await page.locator('#choose-category').click();
    }
    await page.reload();
    for (let i = 0; i < 4; i++) assert.match(await page.locator('.category-card').nth(i).textContent(), /Best: 700/);
    await page.locator('#cloud-open-board').click();
    await page.locator('#cloud-board-status').filter({ hasText: 'Movies · Top' }).waitFor();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    assert.equal(report.attemptedPosts, 0);
    assert.deepEqual(errors, []);
    report.gameplay = 'four completed categories, randomized questions, timeout, scores/review, replay, and persistent local bests passed';
    report.layout = '1280px desktop and 390px phone passed';
    report.javascriptErrors = errors.length;
    fs.writeFileSync(path.join(artifacts, 'live-status.json'), JSON.stringify(report, null, 2));
    assert.ok(report.assets.every(asset => asset.matches), 'Some live assets differ from dist/; inspect live-status.json before uploading.');
    console.log('PASS: real CloudFront-origin leaderboard GET in all 4 categories.');
    console.log('PASS: live quiz, timeout, scoring, review, replay, local bests, desktop/mobile layout.');
    console.log('PASS: all 7 live assets match dist/ after line-ending normalization; no JavaScript errors.');
    console.log('Live POST submissions: 0. Source backup/IAM are separate from this browser check.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
