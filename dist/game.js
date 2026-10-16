(function (root) {
  'use strict';
  const ROUND_SIZE = 10;
  const QUESTION_MS = 20000;
  const POINTS = 100;
  function shuffle(items, random = Math.random) {
    const result = items.slice();
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
  function prepareQuestions(bank, random = Math.random) {
    if (!Array.isArray(bank) || bank.length < ROUND_SIZE) throw new Error('A category needs at least ten questions.');
    return shuffle(bank, random).slice(0, ROUND_SIZE).map(question => {
      const options = shuffle(question.options.map((text, index) => ({ text, correct: index === question.correct })), random);
      return { ...question, options: options.map(option => option.text), correct: options.findIndex(option => option.correct) };
    });
  }
  class Game {
    constructor(bank, { random = Math.random, now = Date.now } = {}) {
      this.questions = prepareQuestions(bank, random);
      this.now = now;
      this.index = 0;
      this.answers = [];
      this.score = 0;
      this.deadline = now() + QUESTION_MS;
    }
    get question() { return this.questions[this.index]; }
    get complete() { return this.answers.length === ROUND_SIZE; }
    get answered() { return this.answers.length > this.index; }
    get remaining() { return Math.max(0, Math.ceil((this.deadline - this.now()) / 1000)); }
    submit(choice) {
      if (this.answered || this.complete) return null;
      const expired = this.now() >= this.deadline;
      if (choice === null && !expired) return null;
      if (!expired && (!Number.isInteger(choice) || choice < 0 || choice >= this.question.options.length)) return null;
      const selected = expired ? null : choice;
      const correct = selected === this.question.correct;
      const answer = { question: this.question, selected, correct, timedOut: expired };
      this.answers.push(answer);
      if (correct) this.score += POINTS;
      return answer;
    }
    next() {
      if (!this.answered || this.complete) return false;
      this.index++;
      this.deadline = this.now() + QUESTION_MS;
      return true;
    }
  }
  // Storage is optional: restricted/private browser modes still allow a full game.
  class BestScores {
    constructor(storage, categoryIds) {
      this.storage = storage;
      this.key = 'quizcloud.personal-bests.v1';
      this.categoryIds = categoryIds;
      this.scores = {};
      this.available = Boolean(storage);
      if (!storage) return;
      try {
        const saved = JSON.parse(storage.getItem(this.key) || '{}');
        for (const id of categoryIds) {
          const value = saved && saved[id];
          if (Number.isInteger(value) && value >= 0 && value <= ROUND_SIZE * POINTS && value % POINTS === 0) this.scores[id] = value;
        }
      } catch (error) {
        // Malformed JSON is repairable; blocked storage uses in-memory scores.
        if (!(error instanceof SyntaxError)) this.available = false;
      }
    }
    get(id) { return this.scores[id] ?? null; }
    record(id, score) {
      if (!this.categoryIds.includes(id) || !Number.isInteger(score) || score < 0 || score > ROUND_SIZE * POINTS || score % POINTS !== 0) throw new Error('Invalid best score.');
      const previous = this.get(id);
      const isBest = previous === null || score > previous;
      this.scores[id] = Math.max(previous ?? 0, score);
      if (this.storage) {
        try { this.storage.setItem(this.key, JSON.stringify(this.scores)); }
        catch { this.available = false; }
      }
      return { isBest: isBest && score > 0, best: this.scores[id] };
    }
  }
  const api = { Game, BestScores, prepareQuestions, shuffle, ROUND_SIZE, QUESTION_MS, POINTS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.QuizEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
