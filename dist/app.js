(function () {
  'use strict';
  const { categories, questions } = QuizData;
  const { Game, BestScores } = QuizEngine;
  const $ = id => document.getElementById(id);
  const icon = name => `<svg class="icon" aria-hidden="true"><use href="#i-${name}"/></svg>`;
  let storage;
  try { storage = window.localStorage; } catch { storage = null; }
  const bests = new BestScores(storage, categories.map(category => category.id));
  let game = null;
  let category = null;
  let timer = null;
  let resultSaved = false;
  const formatScore = score => score === null ? '—' : score.toLocaleString();
  function storageNotice() { $('storage-notice').hidden = bests.available; }
  function stopTimer() { clearInterval(timer); timer = null; }
  function show(view) {
    for (const id of ['home', 'quiz', 'results']) $(id).hidden = id !== view;
    window.scrollTo({ top: 0, behavior: 'instant' });
    storageNotice();
  }
  function renderCategories() {
    $('categories').replaceChildren();
    for (const item of categories) {
      const card = document.createElement('button');
      card.className = 'category-card';
      card.style.setProperty('--accent', item.color);
      card.style.setProperty('--tint', item.tint);
      const best = bests.get(item.id);
      card.setAttribute('aria-label', `Play ${item.name}. Personal best: ${best === null ? 'not played yet' : best + ' points'}.`);
      card.innerHTML = `<span class="category-icon">${icon(item.icon)}</span><h3>${item.name}</h3><p class="category-description">${item.description}</p><span class="card-bottom"><span class="best-score">${icon('trophy')}${best === null ? 'Set your first best' : `Best: ${formatScore(best)} / 1,000`}</span><span class="card-arrow">${icon('arrow')}</span></span>`;
      card.addEventListener('click', () => start(item));
      $('categories').append(card);
    }
  }
  function home() {
    stopTimer();
    game = null;
    renderCategories();
    show('home');
    $('categories').querySelector('button').focus({ preventScroll: true });
  }
  function start(item) {
    stopTimer();
    category = item;
    game = new Game(questions[item.id]);
    resultSaved = false;
    $('quiz-category').innerHTML = `${icon(item.icon)}${item.name}`;
    $('session-best').textContent = formatScore(bests.get(item.id));
    show('quiz');
    renderQuestion();
  }
  function updateScore() {
    $('current-score').textContent = formatScore(game.score);
    $('correct-count').textContent = `${game.score / 100} / 10`;
    $('progress').value = game.answers.length;
  }
  function renderQuestion() {
    stopTimer();
    $('question-count').textContent = `QUESTION ${String(game.index + 1).padStart(2, '0')} OF 10`;
    $('question-text').textContent = game.question.question;
    $('answers').replaceChildren();
    $('feedback').hidden = true;
    $('next-question').hidden = true;
    game.question.options.forEach((option, i) => {
      const button = document.createElement('button');
      button.className = 'answer';
      const letter = document.createElement('span');
      letter.className = 'answer-letter';
      letter.setAttribute('aria-hidden', 'true');
      letter.textContent = String.fromCharCode(65 + i);
      const text = document.createElement('span');
      text.textContent = option;
      button.append(letter, text);
      button.addEventListener('click', () => submit(i));
      $('answers').append(button);
    });
    updateScore();
    tick();
    timer = setInterval(tick, 100);
    $('question-text').focus({ preventScroll: true });
  }
  function tick() {
    if (!game || game.answered) return;
    const seconds = game.remaining;
    $('time-left').textContent = seconds;
    $('timer').classList.toggle('urgent', seconds <= 5);
    if (seconds === 0) submit(null);
  }
  function submit(choice) {
    if (!game) return;
    const answer = game.submit(choice);
    if (!answer) return;
    stopTimer();
    $('time-left').textContent = game.remaining;
    Array.from($('answers').children).forEach((button, i) => {
      button.disabled = true;
      if (i === answer.question.correct || (i === answer.selected && !answer.correct)) {
        const correct = i === answer.question.correct;
        button.classList.add(correct ? 'correct' : 'incorrect');
        const status = document.createElement('span');
        status.className = 'answer-status';
        status.textContent = correct ? '✓' : '×';
        status.setAttribute('aria-hidden', 'true');
        button.append(status);
        button.setAttribute('aria-label', `${answer.question.options[i]}. ${correct ? 'Correct answer' : 'Your answer, incorrect'}.`);
      }
    });
    const title = document.createElement('strong');
    title.textContent = answer.timedOut ? 'Time’s up. Here’s something to remember.' : answer.correct ? 'You got it! +100 points' : 'Good try. You just learned something new.';
    const explanation = document.createElement('span');
    explanation.textContent = `${answer.correct ? '' : `Correct answer: ${answer.question.options[answer.question.correct]}. `}${answer.question.explanation}`;
    $('feedback').replaceChildren(title, explanation);
    $('feedback').hidden = false;
    $('next-question').innerHTML = `${game.complete ? 'See my results' : 'Next question'} ${icon('arrow')}`;
    $('next-question').hidden = false;
    updateScore();
    $('next-question').focus({ preventScroll: true });
  }
  function results() {
    if (!game || !game.complete || resultSaved) return;
    stopTimer();
    resultSaved = true;
    const { isBest, best } = bests.record(category.id, game.score);
    const count = game.score / 100;
    $('results-category').innerHTML = `${icon(category.icon)}${category.name}`;
    $('result-title').textContent = count === 10 ? 'A perfect ten.' : count >= 7 ? 'Look at you go.' : count >= 4 ? 'Nicely played.' : 'Curiosity looks good on you.';
    $('result-message').textContent = count === 10 ? 'You knew your stuff. Ready to do it again?' : 'A little more knowledge. A fresh score to beat.';
    $('final-score').textContent = formatScore(game.score);
    $('result-correct').textContent = `${count} / 10`;
    $('result-accuracy').textContent = `${count * 10}%`;
    $('result-best').textContent = formatScore(best);
    $('new-best').hidden = !isBest;
    $('review-list').replaceChildren();
    $('review-list').parentElement.open = false;
    for (const answer of game.answers) {
      const li = document.createElement('li');
      const question = document.createElement('strong');
      question.textContent = answer.question.question;
      const selected = document.createElement('div');
      selected.className = answer.correct ? 'review-right' : 'review-wrong';
      selected.textContent = answer.timedOut ? 'Time expired — no answer.' : `Your answer: ${answer.question.options[answer.selected]} ${answer.correct ? '✓' : '×'}`;
      const explanation = document.createElement('p');
      explanation.className = 'review-explanation';
      explanation.textContent = `Correct: ${answer.question.options[answer.question.correct]}. ${answer.question.explanation}`;
      li.append(question, selected, explanation);
      $('review-list').append(li);
    }
    show('results');
    $('result-title').focus({ preventScroll: true });
  }
  $('next-question').addEventListener('click', () => {
    if (!game || !game.answered) return;
    if (game.complete) results();
    else if (game.next()) renderQuestion();
  });
  $('play-again').addEventListener('click', () => start(category));
  $('choose-category').addEventListener('click', home);
  $('leave-quiz').addEventListener('click', home);
  $('brand').addEventListener('click', event => { event.preventDefault(); home(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && game && !game.answered) tick(); });
  renderCategories();
  storageNotice();
})();
