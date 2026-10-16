/* Optional development check. Requires Playwright and an installed Chrome.
   Start server.js first; QUIZCLOUD_URL can override the local preview URL. */
'use strict';
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');
const url = process.env.QUIZCLOUD_URL || 'http://127.0.0.1:8000';
const artifacts = path.join(__dirname, '..', 'artifacts');
fs.mkdirSync(artifacts, { recursive: true });
const errors = [];
async function correctIndex(page) {
  return page.evaluate(() => {
    const prompt = document.getElementById('question-text').textContent;
    const question = Object.values(QuizData.questions).flat().find(q => q.question === prompt);
    return [...document.querySelectorAll('.answer')].findIndex(button => button.children[1].textContent === question.options[question.correct]);
  });
}
async function noOverflow(page) {
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'page has horizontal overflow');
}
async function round(page, categoryIndex, correctCount, timeoutLast = false) {
  await page.locator('.category-card').nth(categoryIndex).click();
  const prompts = new Set();
  for (let i = 0; i < 10; i++) {
    assert.equal(await page.locator('#question-count').textContent(), `QUESTION ${String(i + 1).padStart(2, '0')} OF 10`);
    prompts.add(await page.locator('#question-text').textContent());
    if (timeoutLast && i === 9) {
      await page.clock.fastForward(21000);
      await page.getByText('Time’s up. Here’s something to remember.').waitFor();
      assert.equal(await page.locator('#time-left').textContent(), '0');
    } else {
      const correct = await correctIndex(page);
      await page.locator('.answer').nth(i < correctCount ? correct : (correct + 1) % 4).click();
    }
    assert.equal(await page.locator('.answer:disabled').count(), 4);
    assert.equal(await page.locator('#progress').getAttribute('value'), String(i + 1));
    await page.locator('#next-question').click();
  }
  assert.equal(prompts.size, 10);
  assert.equal(await page.locator('#final-score').textContent(), (correctCount * 100).toLocaleString());
  assert.equal(await page.locator('#result-accuracy').textContent(), `${correctCount * 10}%`);
  assert.equal(await page.locator('#review-list li').count(), 10);
}
(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.clock.install();
    const response = await page.goto(url);
    assert.equal(response.status(), 200);
    assert.equal(await page.locator('.category-card').count(), 4);
    await noOverflow(page);
    await page.screenshot({ path: path.join(artifacts, 'home-desktop.png'), fullPage: true });
    await round(page, 1, 7, true);
    assert.equal(await page.locator('#result-best').textContent(), '700');
    await page.locator('.answer-review summary').click();
    assert.equal(await page.locator('#review-list li:visible').count(), 10);
    await page.screenshot({ path: path.join(artifacts, 'results-desktop.png'), fullPage: true });
    await page.reload();
    assert.match(await page.locator('.category-card').nth(1).textContent(), /Best: 700/);
    await round(page, 1, 0);
    assert.equal(await page.locator('#result-best').textContent(), '700');
    assert.equal(await page.locator('#new-best').isVisible(), false);
    await page.locator('#play-again').click();
    assert.equal(await page.locator('#current-score').textContent(), '0');
    assert.equal(await page.locator('#time-left').textContent(), '20');
    assert.equal(await page.locator('#progress').getAttribute('value'), '0');
    await page.locator('#leave-quiz').click();
    await round(page, 0, 10);
    assert.equal(await page.locator('#new-best').isVisible(), true);
    assert.equal(await page.locator('#result-title').textContent(), 'A perfect ten.');
    await page.locator('#choose-category').click();
    await round(page, 2, 5);
    await page.locator('#choose-category').click();
    await round(page, 3, 0);
    await page.locator('#choose-category').click();
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('quizcloud.personal-bests.v1')));
    assert.deepEqual(stored, { technology: 700, sports: 1000, geography: 500, movies: 0 });
    console.log('PASS: complete rounds in all categories, timeout, scores, review, replay, and persisted bests.');
    // Exercise actual keyboard navigation and question focus.
    await page.locator('.category-card').first().focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('#question-text').evaluate(element => element === document.activeElement), true);
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('.answer:disabled').count(), 4);
    assert.equal(await page.locator('#next-question').evaluate(element => element === document.activeElement), true);
    await page.locator('#brand').click();
    for (const width of [320, 390, 768]) {
      await page.setViewportSize({ width, height: 844 });
      await noOverflow(page);
      if (width === 390) await page.screenshot({ path: path.join(artifacts, 'home-mobile.png'), fullPage: true });
      await page.locator('.category-card').nth(2).click();
      await noOverflow(page);
      if (width === 390) await page.screenshot({ path: path.join(artifacts, 'quiz-mobile.png'), fullPage: true });
      await page.locator('#leave-quiz').click();
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await round(page, 2, 8);
    await noOverflow(page);
    await page.screenshot({ path: path.join(artifacts, 'results-mobile.png'), fullPage: true });
    console.log('PASS: keyboard play and responsive home, quiz, and results at phone/tablet widths.');
    const blocked = await browser.newContext();
    await blocked.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw new Error('Storage blocked'); } }));
    const privatePage = await blocked.newPage();
    privatePage.on('pageerror', error => errors.push(error.message));
    await privatePage.goto(url);
    assert.equal(await privatePage.locator('#storage-notice').isVisible(), true);
    await round(privatePage, 0, 3);
    assert.equal(await privatePage.locator('#result-best').textContent(), '300');
    const corrupt = await browser.newContext();
    await corrupt.addInitScript(() => localStorage.setItem('quizcloud.personal-bests.v1', '{invalid'));
    const corruptPage = await corrupt.newPage();
    await corruptPage.goto(url);
    assert.equal(await corruptPage.locator('.category-card').count(), 4);
    await round(corruptPage, 0, 4);
    assert.equal(await corruptPage.locator('#result-best').textContent(), '400');
    console.log('PASS: unavailable and corrupt browser storage do not interrupt gameplay.');
    const filePage = await context.newPage();
    filePage.on('pageerror', error => errors.push(error.message));
    await filePage.goto(pathToFileURL(path.join(__dirname, '..', 'dist', 'index.html')).href);
    await round(filePage, 3, 6);
    assert.equal(await filePage.locator('#result-best').textContent(), '600');
    console.log('PASS: direct-file opening supports a complete game.');
    assert.deepEqual(errors, [], 'Browser console/runtime errors');
    console.log('PASS: no browser console or runtime errors. Screenshots saved in artifacts/.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
