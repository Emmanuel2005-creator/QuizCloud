# Verification — November 11, 2026

Finalization was tested with Node.js 24.22.1, Python 3.12.14, Playwright 1.62.1, and installed Google Chrome. No production score submissions or AWS configuration changes were made.

## Automated local checks

| Check actually run | Result | Boundary |
| --- | --- | --- |
| `npm run check` | All 9 JavaScript syntax checks passed | Source/test parsing, not a build or deployment |
| `npm test` | 11 passed, 0 failed, 0 skipped | Game rules, randomization, timing, scoring, and local bests |
| `npm run test:browser` | Original 5 reported game groups and 9 leaderboard checks passed | Leaderboard suite intercepted all 26 API requests; no AWS writes |
| `python -m unittest discover -s tests -p test_backend.py -v` | 16 passed | Python 3.12; supplied handler with SDK/table doubles, no DynamoDB access |
| `node tests/live.cjs` | Passed | Real CloudFront site/API GET, all API writes blocked |

Gameplay tests cover all four categories, ten unique questions per round, shuffled correct-answer mapping, deadlines/timeouts, answer locking, score/accuracy, review, replay, and best scores surviving reload without decreasing.

Mocked leaderboard tests cover explicit opt-in, payload fields, nickname/ID persistence, successful-repeat prevention, all categories, empty/top-ten states, safe hostile-text rendering, stale requests, HTTP/offline/invalid-response recovery, GET/POST timeout, retry, replay isolation, blocked storage, localized scores, keyboard focus, and small layouts. No uncaught JavaScript errors occurred; deliberate mock network failures were handled by the UI.

Backend tests cover all categories/boundary scores, missing and invalid input, non-object JSON, trimmed nicknames, composite keys, atomic higher-best conditions, equal/higher existing scores, unknown routes, propagated SDK errors, and the current single-page Scan limitation. These test the supplied source and do not prove its identity with the deployed package.

## Actual AWS/public-site checks

- All seven CloudFront frontend files returned HTTP 200 and matched `dist/` after CRLF-to-LF normalization: `index.html`, `styles.css`, `questions.js`, `game.js`, `app.js`, `leaderboard.js`, and `leaderboard.css`.
- Real Chrome ranking reads passed for Sports, Technology, Geography, and Movies on the CloudFront origin. Empty categories rendered correctly.
- Four complete live-site quiz rounds passed, including a countdown expiration, correct/incorrect scoring, results/review, replay, and persistent browser-local bests. These rounds created no production records.
- Desktop (1280px) and phone (390px) layout checks passed. Local suites also checked 320/390/768px layouts. Desktop leaderboard and mobile results screenshots were visually inspected.
- No JavaScript or console errors occurred in the live-site test. No API write was attempted.
- Read-only API GETs returned HTTP 200 in all four categories. POST OPTIONS returned 204 and allowed the CloudFront origin, GET/POST, and `content-type`. This supersedes the earlier missing-CORS observation; no change was made by this task.
- A separate current localhost-origin check confirmed CORS blocks that origin. The UI recovered with an error message and zero uncaught JavaScript exceptions.
- No frontend upload or CloudFront invalidation is needed for the current unchanged assets. Details: [deployment notes](docs/DEPLOYMENT.md). Ignored local screenshots/report: `artifacts/`.

## Source and security review

The owner supplied the Lambda console Python. `backend/lambda_function.py` preserves it without refactoring; the recorded source hash is in [backend/README.md](backend/README.md). The AWS CLI had no usable credentials, so an independent deployed-source comparison and IAM/private-resource audit were not possible. No secrets, access keys, or private account identifiers were added.

Frontend rendering and validation, request lifecycle, failure handling, local best isolation, and the supplied handler's input/conditional-write behavior were reviewed. Effective IAM, bucket privacy, API authorization/rate limits, and live POST persistence remain unverified. Scores/IDs are forgeable, the scan is limited to one page, and unexpected database errors propagate. See [security limitations](docs/LEADERBOARD_BETA.md).

No Safari, Firefox, physical-device, formal accessibility, performance, load/abuse, or production POST test was performed. No AWS resources were created, modified, redeployed, or invalidated.
