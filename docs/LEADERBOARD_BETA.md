# Leaderboard beta: security and reliability

The frontend reads rankings from `https://xdtbodt7p2.execute-api.us-east-1.amazonaws.com` and submits a completed round only after an explicit nickname/form action. This is a public beta, not a verified competition.

## API contract

| Route | Request | Successful response |
| --- | --- | --- |
| `GET /leaderboard?category=movies` | Category: `sports`, `technology`, `geography`, or `movies` | `{ "success": true, "leaderboard": [{ "name": "Player", "score": 800 }] }` |
| `POST /scores` | JSON `{ playerId, name, category, score }` | `{ "success": true, "saved": true, "score": 800 }`, or `saved: false` for an equal/higher stored best |

The frontend accepts 1–24-character trimmed nicknames without control characters and integer scores in 100-point steps from 0 to 1,000. It checks response shapes, ignores invalid ranking rows, and renders up to ten valid rows using `textContent`, not HTML.

The supplied Lambda validates player ID length (8–64), trimmed nickname length (1–24), category, and integer score/step. It rejects boolean/float/string scores. Its conditional DynamoDB update replaces only a lower score. That rule was tested with table doubles; it does not establish honest gameplay or live persistence.

## Implemented client behavior

- No automatic network request on page load or round completion. Opening/refreshing the board requests rankings; submitting the form sends a score.
- The form discloses that nicknames/scores are public and sends a browser ID, nickname, category, and score. Avoid personal information.
- A browser ID and last successfully submitted nickname are stored separately from local personal bests; unavailable storage falls back to the current tab.
- Requests omit cookies/referrer, reject redirects, and time out after eight seconds. The API URL is public configuration, not a secret.
- A newer category request cancels/supersedes stale results. Old POST responses cannot overwrite a new round's UI.
- Successful repeated submissions are disabled for that round. Failed requests offer an explicit retry with an ambiguity warning; the service may already have accepted the score. No automatic POST retry occurs.
- Network/HTTP/malformed-response errors show recoverable feedback without interrupting the core quiz.

## Unresolved limitations

1. **Client-controlled scores and identities:** a caller can forge scores, dispatch fake round events, replace browser IDs, or call the endpoint directly. There is no proof of quiz completion in the supplied handler, and browser IDs are not authentication. Nicknames are not verified accounts.
2. **Scans and ranking completeness:** the supplied handler reads one filtered Scan page and does not follow `LastEvaluatedKey`. Larger tables can produce incomplete rankings and inefficient reads. This behavior is preserved in the backup, not silently rewritten.
3. **Server validation and moderation:** validate independently of the frontend. The supplied handler has no control-character/moderation checks, explicit application request-size limit, or replay/session verification. No abuse or load testing was performed.
4. **Unknown effective AWS controls:** IAM role/trust policies, API authorizers, rate limits, logging, bucket access controls, and table settings were not inspected without usable AWS credentials. The source needs `dynamodb:Scan` and `dynamodb:UpdateItem` scoped to the intended table; actual least privilege is unverified. No configuration changes were made.
5. **POST ambiguity and failure handling:** conditional best updates protect against lower scores, but are not an authenticated idempotency scheme. Unexpected SDK errors propagate from the handler. Live POST acceptance/persistence has not been tested; a timeout may follow a write.
6. **CORS is a browser boundary:** it does not authenticate callers or prevent direct API abuse. The final live review confirmed permission for the CloudFront origin; localhost can remain blocked. Do not bypass browser security with `no-cors` or disabled protections.

Client validation is bypassable; see [OWASP input-validation guidance](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html). [API Gateway CORS documentation](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-cors.html) describes origin/preflight behavior.

## What was verified

The mocked browser suite exercises opt-in, payload structure, duplicate prevention, invalid/empty responses, markup injection, stale requests, timeouts, storage failures, localized score display, and mobile/keyboard behavior. Python tests exercise the supplied Lambda against SDK/table doubles.

Separate real-origin Chrome checks read rankings in all four categories, complete quiz rounds, verify local bests/replay, and check layouts/errors. Live GET/preflight permissions for CloudFront now work; earlier observations of missing headers are superseded. No production POST was sent and no AWS configuration was changed. See [CHECKS.md](../CHECKS.md) for actual results and [backend provenance](../backend/README.md) for the unverified deployment comparison.
