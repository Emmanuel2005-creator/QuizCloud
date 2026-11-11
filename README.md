# QuizCloud

A responsive trivia game and cloud engineering portfolio project built with HTML, CSS, and vanilla JavaScript. The core game runs locally, with an optional public-beta leaderboard connected to an existing API. This repository provisions no cloud resources.

## Features

- Sports, Technology, Geography, and Movies categories.
- 80 questions, with 10 unique questions randomly selected per game and independently shuffled answer choices.
- A 20-second countdown per question, including while the tab is in the background.
- Progress tracking, 100 points per correct answer, and a maximum score of 1,000.
- Locked answers, feedback, and explanations for correct, incorrect, and expired answers.
- Results, accuracy, answer review, Play Again, and category navigation.
- Per-category personal bests saved with localStorage and an in-memory fallback when storage is blocked.
- Responsive layouts, keyboard support, visible focus, live feedback, and reduced-motion styles.
- Offline core gameplay with no account, API key, remote fonts, or production dependencies.
- Optional category rankings and explicit public score submission through an existing AWS API; no automatic submission.

## Run locally

**Without installing anything:** open `dist/index.html` in a modern browser. All application assets and questions are local.

**Recommended for consistent saved scores:** install Node.js 22 or later, open a terminal in this project folder, and run:

```sh
node server.js
```

Open **http://127.0.0.1:8000**. Stop with **Ctrl+C**. The server binds only to this computer's loopback interface and serves only `dist/`. No package installation is needed to run the app or unit tests. Recorded verification used Node.js 24.19.0.

Alternatively, with Python 3 installed:

```sh
python -m http.server 8000 --bind 127.0.0.1 --directory dist
```

On Windows, `py` can replace `python`.

Use the same browser and address each time. Scores are scoped to the origin: `localhost`, `127.0.0.1`, different ports, and directly opened files can have separate storage. Persistence on `file:` pages varies by browser. Private browsing or clearing site data may remove scores. If storage is blocked, a notice appears and bests last for the current tab only.

## Play and test manually

1. Pick a category and answer ten questions. Verify four choices per question and progress updates.
2. Answer correctly and incorrectly; check that only correct answers add 100 points and a question cannot score twice.
3. Let a timer expire and check the explanation. Switching tabs does not pause the deadline; Next starts a fresh timer.
4. Finish and select **See my results**. Verify score, accuracy, and the expandable answer review.
5. Select **Play again**. Verify a fresh round, zero current score, and reset progress. Randomization can legitimately repeat questions between games.
6. Return home and reload. Check that bests persist separately and never decrease. Bests save when the results page opens.
7. Resize to phone width and play with Tab, Shift+Tab, Enter, and Space.

The logo and **Back to categories** leave an unfinished round. Refreshing resets the current session; incomplete rounds do not save a new best.

## Public-beta leaderboard

Use **View rankings** on the homepage to load up to ten scores; switch categories or select Refresh to reload. After a completed round, optionally enter a public nickname and select **Submit score**. The browser sends `{ playerId, name, category, score }` only after that action. Nicknames and scores are public: avoid personal information. A browser player ID and last successfully submitted nickname are saved locally when storage permits; they are separate from personal bests.

The connector uses `https://xdtbodt7p2.execute-api.us-east-1.amazonaws.com`: `GET /leaderboard?category=movies` (or another category) and `POST /scores`. It expects `{ success: true, leaderboard: [{ name, score }] }` for rankings and `{ success: true, saved: true|false }` for submissions. The API URL is public configuration, not a secret.

Rankings are fetched only when requested. Failed requests show a recoverable message; the quiz and local bests continue working. A completed round can be submitted once successfully through the UI. If a request times out or fails, check rankings before manually retrying: the server may already have accepted it. There is no automatic POST retry.

**Local-origin limitation:** the API did not return CORS permission for `http://127.0.0.1:8000` during verification, and Chrome blocked live ranking reads from that origin. Browser tests intercept API requests and do not require production CORS changes. For a real local integration test, the API owner must separately allow the exact local origin, GET/POST, and the JSON `content-type` header. Do not disable browser security or use `no-cors`, which would hide responses. Direct-file origins may also be blocked.

Scores, nicknames, and player IDs are untrusted client input. This is not a cheat-proof or authenticated leaderboard. See [the beta contract, verification notes, and security limitations](docs/LEADERBOARD_BETA.md) before a public release.

## Automated tests

Run syntax checks and Node built-in unit tests without installing packages:

```sh
npm run check
npm test
```

Or run the unit tests directly: `node --test tests/game.test.js`.

For browser tests, install the locked development dependency and ensure **Google Chrome** is installed:

```sh
npm ci
```

Start `node server.js` in one terminal. In another terminal in the project folder:

```sh
npm run test:browser
```

The suite uses Playwright with the installed Chrome channel; no separate Playwright browser download is required. It uses isolated contexts rather than a personal Chrome profile. Screenshots are generated in `artifacts/`, which is excluded from Git. `QUIZCLOUD_URL` can override the preview address.

`npm run test:browser` runs the original game regression suite followed by the leaderboard UI suite. Run just the latter with `npm run test:leaderboard`. All leaderboard-suite API traffic is intercepted, including POSTs: tests do not publish fabricated scores or require credentials. Live API reachability/CORS checks are recorded separately from these deterministic tests.

Unit tests cover question data, seeded randomization, answer mapping, scoring, deadlines, background expiration, round completion, and storage validation/fallback. Browser tests cover complete games, timeouts, saved bests, replay, review, keyboard focus, mobile overflow, corrupt/blocked storage, and direct-file opening. See [CHECKS.md](CHECKS.md) for actual results and limitations.

## Architecture

```text
QuizCloud/
  dist/                     Hand-authored application source; no build step
    index.html              Home, quiz, and results views; inline SVG icons
    styles.css              Responsive layout and visual design
    questions.js            80 questions and category metadata
    game.js                 Randomization, game state, timing, personal bests
    app.js                  DOM rendering, navigation, timer events, feedback
    leaderboard.js          Opt-in beta API connector; isolated request/round state
    leaderboard.css         Leaderboard and submission form styles
  tests/
    game.test.js            Node built-in unit tests
    browser.cjs             Playwright/Chrome interaction and layout checks
    leaderboard.cjs         Isolated leaderboard UI, safety, and failure checks
  docs/
    AWS_PLAN.md             Future deployment design; no deployed resources
    GITHUB_PREPARATION.md    Proposed publication manifest and approval boundary
    LEADERBOARD_BETA.md      API contract, security limits, and integration checks
  server.js                 Optional localhost preview server
  package.json              Commands and development-only Playwright dependency
  package-lock.json         Reproducible development dependency versions
  CHECKS.md                 Recorded verification
```

The UI follows home -> question -> feedback -> results. The engine owns scoring and locks submitted answers. A wall-clock deadline handles delayed callbacks and background tabs. Fisher-Yates shuffling samples without replacement and randomizes choices. The versioned `quizcloud.personal-bests.v1` localStorage key stores validated local scores per category. Two small DOM events from `app.js` notify the optional connector of a new/completed round; it does not parse locale-formatted score text. Those events provide no proof to the server that a score is legitimate.

`dist/` contains original source despite its name: include it in Git. Its contents are the only files needed for future static hosting. The preview server, tests, dependency files, and documentation do not belong in the hosting bucket.

## Future AWS deployment

The planned architecture is **browser -> HTTPS CloudFront -> private S3 bucket** with Origin Access Control. A custom domain can optionally use Route 53 and ACM. Future GitHub Actions deployment should use OIDC and a narrowly scoped IAM role rather than stored AWS access keys. See [the AWS plan](docs/AWS_PLAN.md) for caching, verification, rollback, and teardown.

Deployment is a future phase requiring separate approval. No AWS commands, deployment workflows, credentials, account identifiers, or infrastructure state are included. The plan follows [AWS private S3 origin guidance](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html) and [GitHub AWS OIDC guidance](https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws).

## Repository hygiene and limitations

`.gitignore` excludes dependencies, screenshots, logs, temporary/editor files, environments, credentials, private keys, and future infrastructure state. `.gitattributes` normalizes text for Windows/Linux collaboration. Review staged files before every push. Never place secrets in frontend assets, which are visible to visitors once hosted.

Chrome was tested automatically. Firefox, Safari, physical devices, and a formal accessibility audit remain future checks. The local starter question bank should receive an editorial review before public launch. No license has been chosen; no open-source license grant is included.
