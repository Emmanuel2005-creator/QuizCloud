'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { Game, BestScores, prepareQuestions } = require('../dist/game');
const { categories, questions } = require('../dist/questions');
const ids = categories.map(category => category.id);
function seeded(seed) { return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; }
function memoryStorage(value = null) { return { getItem: () => value, setItem: (key, next) => { value = next; } }; }

test('all four banks have 20 valid, unique questions and four distinct options', () => {
  assert.deepEqual(ids, ['sports', 'technology', 'geography', 'movies']);
  const seen = new Set();
  for (const id of ids) {
    assert.equal(questions[id].length, 20);
    for (const q of questions[id]) {
      assert.ok(!seen.has(q.id)); seen.add(q.id);
      assert.equal(q.options.length, 4);
      assert.equal(new Set(q.options).size, 4);
      assert.ok(q.options[q.correct]);
      assert.ok(q.question && q.explanation);
    }
  }
});
test('rounds select ten unique questions, preserve correct answers, and do not mutate banks', () => {
  for (const id of ids) {
    const original = JSON.stringify(questions[id]);
    for (let seed = 1; seed <= 50; seed++) {
      const round = prepareQuestions(questions[id], seeded(seed));
      assert.equal(round.length, 10);
      assert.equal(new Set(round.map(q => q.id)).size, 10);
      for (const q of round) assert.equal(q.options[q.correct], questions[id].find(source => source.id === q.id).options[0]);
    }
    assert.equal(JSON.stringify(questions[id]), original);
  }
});
test('different seeds produce different rounds and varied answer positions', () => {
  const a = prepareQuestions(questions.sports, seeded(1));
  const b = prepareQuestions(questions.sports, seeded(2));
  assert.notDeepEqual(a.map(q => q.id), b.map(q => q.id));
  assert.ok(new Set(a.map(q => q.correct)).size > 1);
});
test('correct answers score once; advancing requires a submitted answer', () => {
  const game = new Game(questions.technology);
  assert.equal(game.next(), false);
  assert.equal(game.submit(game.question.correct).correct, true);
  assert.equal(game.submit(game.question.correct), null);
  assert.equal(game.score, 100);
  assert.equal(game.next(), true);
  assert.equal(game.index, 1);
  assert.equal(game.submit((game.question.correct + 1) % 4).correct, false);
  assert.equal(game.score, 100);
});
test('exact deadline expires the answer and a new question gets a fresh timer', () => {
  let now = 1000;
  const game = new Game(questions.geography, { now: () => now });
  assert.equal(game.remaining, 20);
  assert.equal(game.submit(null), null);
  now = 20999;
  assert.equal(game.remaining, 1);
  now = 21000;
  const answer = game.submit(game.question.correct);
  assert.equal(answer.timedOut, true);
  assert.equal(answer.selected, null);
  assert.equal(game.score, 0);
  now += 60000;
  game.next();
  assert.equal(game.remaining, 20);
});
test('a long background pause times out, and invalid inputs cannot award points', () => {
  let now = 0;
  const game = new Game(questions.movies, { now: () => now });
  for (const value of [-1, 4, 0.5, undefined, '0']) assert.equal(game.submit(value), null);
  assert.equal(game.answers.length, 0);
  now = 120000;
  assert.equal(game.remaining, 0);
  assert.equal(game.submit(null).timedOut, true);
});
test('a full round ends at 1000 points and cannot advance or score further', () => {
  const game = new Game(questions.sports);
  for (let i = 0; i < 10; i++) { game.submit(game.question.correct); if (i < 9) assert.equal(game.next(), true); }
  assert.equal(game.complete, true);
  assert.equal(game.score, 1000);
  assert.equal(game.answers.length, 10);
  assert.equal(game.next(), false);
  assert.equal(game.submit(0), null);
});
test('personal best persists, never decreases, and is separate per category', () => {
  const storage = memoryStorage();
  const bests = new BestScores(storage, ids);
  assert.equal(bests.get('sports'), null);
  assert.equal(bests.record('sports', 700).isBest, true);
  assert.equal(bests.record('sports', 300).best, 700);
  assert.equal(bests.record('sports', 700).isBest, false);
  bests.record('movies', 400);
  const reloaded = new BestScores(storage, ids);
  assert.equal(reloaded.get('sports'), 700);
  assert.equal(reloaded.get('movies'), 400);
  assert.equal(reloaded.get('technology'), null);
});
test('malformed or invalid stored scores are ignored and repaired', () => {
  for (const raw of ['{broken', 'null', '[]', '{"sports":-100,"movies":9999,"technology":"500","geography":55}']) {
    const bests = new BestScores(memoryStorage(raw), ids);
    for (const id of ids) assert.equal(bests.get(id), null);
    assert.equal(bests.record('sports', 200).best, 200);
  }
});
test('unavailable storage keeps scores in memory without interrupting play', () => {
  for (const storage of [null, { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('quota'); } }]) {
    const bests = new BestScores(storage, ids);
    assert.equal(bests.available, false);
    bests.record('sports', 500);
    assert.equal(bests.get('sports'), 500);
  }
  const bests = new BestScores({ getItem: () => null, setItem() { throw new Error('quota'); } }, ids);
  bests.record('sports', 300);
  assert.equal(bests.available, false);
  assert.equal(bests.get('sports'), 300);
});
test('invalid best scores and undersized banks are rejected', () => {
  const bests = new BestScores(null, ids);
  for (const value of [-1, 1001, 550, NaN, '100']) assert.throws(() => bests.record('sports', value));
  assert.throws(() => bests.record('unknown', 100));
  assert.throws(() => prepareQuestions([]));
});
