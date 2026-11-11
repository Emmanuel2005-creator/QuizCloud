/* Adapted from QuizCloud_Leaderboard_Upgrade.zip.
   Optional public-beta integration; client scores and player IDs are untrusted. */
(() => {
  'use strict';
  const API = 'https://xdtbodt7p2.execute-api.us-east-1.amazonaws.com';
  const LABELS = { sports: 'Sports', technology: 'Technology', geography: 'Geography', movies: 'Movies' };
  const CATEGORIES = Object.keys(LABELS);
  const $ = id => document.getElementById(id);
  const categorySection = document.querySelector('#home .category-section');
  const resultsCard = document.querySelector('#results .results-card');
  if (!categorySection || !resultsCard) return;

  // Only static, locally authored markup uses innerHTML. API content uses textContent.
  const promo = document.createElement('div');
  promo.className = 'cloud-promo';
  promo.innerHTML = `
    <div><span class="cloud-eyebrow">COMMUNITY CHALLENGE · PUBLIC BETA</span>
      <h3>Global leaderboard</h3>
      <p>Discover community scores. Rankings are unverified.</p>
    </div>
    <button class="cloud-button" type="button" id="cloud-open-board">View rankings →</button>`;
  const leaderboard = document.createElement('section');
  leaderboard.className = 'cloud-board';
  leaderboard.id = 'cloud-board';
  leaderboard.hidden = true;
  leaderboard.setAttribute('aria-labelledby', 'cloud-board-title');
  leaderboard.innerHTML = `
    <div class="cloud-board-header">
      <div><span class="cloud-eyebrow">THE GLOBAL SCOREBOARD · BETA</span>
        <h2 id="cloud-board-title" tabindex="-1">Top quiz minds.</h2>
        <p>Highest submitted score per browser player, for each category.</p>
      </div>
      <button id="cloud-close-board" type="button" class="cloud-link">Close</button>
    </div>
    <div class="cloud-board-controls">
      <label for="cloud-category">Category</label>
      <select id="cloud-category">
        ${CATEGORIES.map(c => `<option value="${c}">${LABELS[c]}</option>`).join('')}
      </select>
      <button id="cloud-refresh" class="cloud-button" type="button">Refresh</button>
    </div>
    <p id="cloud-board-status" class="cloud-status" role="status"></p>
    <ol id="cloud-rankings" class="cloud-rankings"></ol>
    <p class="cloud-footnote">Public beta: scores and browser identities are community-submitted and not independently verified.</p>`;
  categorySection.after(promo, leaderboard);
  const form = document.createElement('form');
  form.id = 'cloud-submit-form';
  form.className = 'cloud-submit';
  form.innerHTML = `
    <div class="cloud-submit-title">Share your score globally?</div>
    <p id="cloud-privacy">Optional public beta. Your nickname, score, category, and browser player ID will be sent to the leaderboard service. Nicknames and scores are public; avoid personal information. Local bests stay on this device.</p>
    <label for="cloud-nickname">Public nickname</label>
    <div class="cloud-submit-controls">
      <input id="cloud-nickname" name="nickname" type="text" minlength="1" maxlength="24"
        required autocomplete="nickname" placeholder="Your nickname" aria-describedby="cloud-privacy cloud-submit-status" />
      <button id="cloud-submit-button" class="cloud-button" type="submit" disabled>Submit score</button>
    </div>
    <p id="cloud-submit-status" class="cloud-status" role="status"></p>
    <button type="button" class="cloud-link" id="cloud-result-rankings">View global rankings →</button>`;
  resultsCard.insertBefore(form, $('play-again'));

  const nicknameKey = 'quizcloud.nickname.v1';
  const idKey = 'quizcloud.player-id.v1';
  let playerId = null;
  let currentRound = null;
  let rankingRequest = null;
  let rankingSequence = 0;
  try { $('cloud-nickname').value = (localStorage.getItem(nicknameKey) || '').slice(0, 24); } catch { /* optional storage */ }

  function validScore(score) {
    return Number.isInteger(score) && score >= 0 && score <= 1000 && score % 100 === 0;
  }
  function validName(name) {
    return typeof name === 'string' && name.trim().length > 0 && name.length <= 24 && !/[\u0000-\u001f\u007f]/.test(name);
  }
  function getPlayerId() {
    if (playerId) return playerId;
    try { playerId = localStorage.getItem(idKey); } catch { /* current tab only */ }
    if (typeof playerId !== 'string' || !/^[A-Za-z0-9_-]{8,64}$/.test(playerId)) {
      playerId = globalThis.crypto?.randomUUID
        ? crypto.randomUUID()
        : `qc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
      try { localStorage.setItem(idKey, playerId); } catch { /* current tab only */ }
    }
    return playerId;
  }
  async function requestJSON(path, options, controller) {
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(API + path, {
        ...options, signal: controller.signal, credentials: 'omit', referrerPolicy: 'no-referrer', redirect: 'error'
      });
      if (!response.ok) throw new Error('Leaderboard service unavailable');
      const data = await response.json();
      if (!data || data.success !== true) throw new Error('Unexpected API response');
      return data;
    } finally { clearTimeout(timeout); }
  }
  function showRanks(items) {
    if (!Array.isArray(items)) throw new Error('Unexpected rankings response');
    const rows = items.filter(item => item && validName(item.name) && validScore(item.score)).slice(0, 10);
    if (items.length && !rows.length) throw new Error('No valid rankings returned');
    const list = $('cloud-rankings');
    list.replaceChildren();
    if (!rows.length) {
      const entry = document.createElement('li');
      entry.className = 'cloud-empty';
      entry.textContent = 'No scores submitted yet. Be the first!';
      list.append(entry);
    }
    rows.forEach((item, i) => {
      const entry = document.createElement('li');
      entry.className = 'cloud-rank';
      const rank = document.createElement('strong');
      rank.textContent = `#${i + 1}`;
      const name = document.createElement('span');
      name.textContent = item.name;
      const score = document.createElement('b');
      score.textContent = `${item.score.toLocaleString()} pts`;
      entry.append(rank, name, score);
      list.append(entry);
    });
    return rows.length;
  }
  async function refresh() {
    const sequence = ++rankingSequence;
    rankingRequest?.abort();
    const controller = new AbortController();
    rankingRequest = controller;
    const category = $('cloud-category').value;
    if (!CATEGORIES.includes(category)) return;
    $('cloud-refresh').disabled = true;
    $('cloud-board').setAttribute('aria-busy', 'true');
    $('cloud-board-status').textContent = 'Loading rankings…';
    $('cloud-rankings').replaceChildren();
    try {
      const data = await requestJSON(`/leaderboard?category=${encodeURIComponent(category)}`, { cache: 'no-store' }, controller);
      if (sequence !== rankingSequence) return;
      const count = showRanks(data.leaderboard);
      $('cloud-board-status').textContent = `${LABELS[category]} · Top ${count} scores`;
    } catch {
      if (sequence === rankingSequence) $('cloud-board-status').textContent = 'Could not load rankings. Check your connection or allowed site origin, then try Refresh. The quiz still works offline.';
    } finally {
      if (sequence === rankingSequence) {
        rankingRequest = null;
        $('cloud-refresh').disabled = false;
        $('cloud-board').setAttribute('aria-busy', 'false');
      }
    }
  }
  function scrollTo(element) {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    element.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  }
  function openLeaderboard(category = 'movies') {
    if (CATEGORIES.includes(category)) $('cloud-category').value = category;
    if ($('home').hidden) $('brand').click();
    leaderboard.hidden = false;
    scrollTo(leaderboard);
    $('cloud-board-title').focus({ preventScroll: true });
    void refresh();
  }
  $('cloud-open-board').addEventListener('click', () => openLeaderboard());
  $('cloud-close-board').addEventListener('click', () => {
    ++rankingSequence;
    rankingRequest?.abort();
    rankingRequest = null;
    leaderboard.hidden = true;
    leaderboard.setAttribute('aria-busy', 'false');
    $('cloud-refresh').disabled = false;
    scrollTo(promo);
    $('cloud-open-board').focus({ preventScroll: true });
  });
  $('cloud-refresh').addEventListener('click', refresh);
  $('cloud-category').addEventListener('change', refresh);
  $('cloud-result-rankings').addEventListener('click', () => openLeaderboard(currentRound?.category || 'movies'));

  // Explicit round events avoid parsing localized result text. These client events
  // improve integration only; they are not server-side proof of a legitimate score.
  document.addEventListener('quizcloud:round-start', () => {
    currentRound = null;
    $('cloud-submit-button').disabled = true;
    $('cloud-submit-status').textContent = '';
  });
  document.addEventListener('quizcloud:round-complete', event => {
    const { category, score } = event.detail || {};
    if (!CATEGORIES.includes(category) || !validScore(score)) return;
    currentRound = { category, score, state: 'ready' };
    $('cloud-submit-button').disabled = false;
    $('cloud-submit-status').textContent = '';
  });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const round = currentRound;
    if (!round || round.state !== 'ready' || $('results').hidden) return;
    const name = $('cloud-nickname').value.trim();
    if (!validName(name)) {
      $('cloud-submit-status').textContent = 'Enter a public nickname of 1–24 characters, without control characters.';
      return;
    }
    round.state = 'posting';
    $('cloud-submit-button').disabled = true;
    $('cloud-submit-status').textContent = 'Submitting your score…';
    try {
      const data = await requestJSON('/scores', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: getPlayerId(), name, category: round.category, score: round.score })
      }, new AbortController());
      if (typeof data.saved !== 'boolean') throw new Error('Unexpected submission response');
      round.state = 'submitted';
      try { localStorage.setItem(nicknameKey, name); } catch { /* optional storage */ }
      if (currentRound === round) {
        $('cloud-submit-status').textContent = data.saved
          ? `Saved ${round.score.toLocaleString()} points to the ${LABELS[round.category]} leaderboard!`
          : 'Your saved global best for this category is already as high or higher.';
      }
    } catch {
      round.state = 'ready';
      if (currentRound === round) $('cloud-submit-status').textContent = 'Could not confirm submission. Check rankings before retrying; the service may have received your score. Your local best is safe.';
    } finally {
      // A late response from an old round must not overwrite the next round's UI.
      if (currentRound === round) $('cloud-submit-button').disabled = round.state !== 'ready';
    }
  });
})();
