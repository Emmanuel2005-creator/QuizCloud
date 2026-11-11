# Leaderboard beta integration

Integrated from the two connector assets in `QuizCloud_Leaderboard_Upgrade.zip`. The archive's preparation script and deployment instructions were not executed. No AWS configuration or S3 deployment is part of this feature branch.

## Contract

Base URL: `https://xdtbodt7p2.execute-api.us-east-1.amazonaws.com`

| Operation | Request | Expected JSON response |
| --- | --- | --- |
| Rankings | `GET /leaderboard?category=movies` | `{ "success": true, "leaderboard": [{ "name": "Player", "score": 800 }] }` |
| Submit | `POST /scores` with JSON `{ playerId, name, category, score }` | `{ "success": true, "saved": true }`, or `saved: false` for an existing equal/higher best |

Categories: `sports`, `technology`, `geography`, `movies`. Nicknames contain 1–24 characters after trimming, without control characters. Scores are integer multiples of 100 from 0 through 1,000. The client filters malformed ranking rows and renders at most ten valid entries in API-provided order. Successful submissions require a boolean `saved` field. These are the connector's expected rules, not an audit of the backend implementation.

Core gameplay is preserved. `game.js`, the question bank, quiz timer, and personal-best storage are unchanged. `app.js` emits new-round and completed-round events; `leaderboard.js` captures the numeric category/score pair. This also handles localized displays such as `1.000` points. Ranking requests supersede stale category requests, and late POST responses cannot overwrite a newer round's status.

## Privacy and request behavior

- No leaderboard request is made on page load or merely by completing a round. Rankings require opening/refreshing the board; submission requires a deliberate form action.
- A nickname, score, category, and browser-generated player ID are sent on submission. Nicknames and scores are public. The form explains this before submission.
- `quizcloud.nickname.v1` stores the last successfully submitted nickname; `quizcloud.player-id.v1` stores the browser ID on the first attempted submission. Clearing browser data creates a new identity. Blocked storage falls back to the current tab.
- The client sends no cookies or authorization credentials, follows no redirects, and omits the referrer. The service can still observe normal connection metadata such as IP address. No cloud secret is embedded.
- Requests time out after eight seconds. The UI blocks overlapping/successfully repeated submissions for the current round. It offers explicit retry after failures, warning that the server may already have received the score. This is not server-side idempotency.

## Security limitations requiring backend attention

1. **Scores are forgeable.** Anyone can alter JavaScript, dispatch a fake round event, edit browser state, or call the API directly. Local numeric validation and UI buttons cannot establish that a quiz was played honestly. Server-issued game sessions, authoritative answer checking, and replay protection are needed before treating scores as competitive results.
2. **Browser IDs are not authentication.** They can be copied, replaced, or discarded. A nickname is not a verified account; impersonation and duplicate identities remain possible. Review server authorization before allowing identity-bound writes.
3. **Server validation is essential.** Enforce the schema, allowed categories, length/range limits, and request size on the server independently. Rendered API values are handled with `textContent`, not HTML; this protects this UI from nickname markup injection but does not validate other consumers.
4. **Abuse and costs remain a concern.** Review server-side rate limits, monitoring, quotas, spam/moderation controls, and alarms. No load or abuse testing was performed, and backend throttling settings were not inspected or changed.
5. **CORS is not authentication or anti-cheat.** Restrict allowed browser origins as appropriate, but non-browser callers are not protected by CORS. Review backend identity and score rules separately.
6. **Timeouts are ambiguous.** A POST may be saved even if the browser cannot read its response. A backend idempotency scheme and a per-category conditional best-score update would make retries safer; their implementation was not verified.

These limitations follow [OWASP guidance on bypassable client-side validation](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html). Origin behavior follows [API Gateway HTTP API CORS guidance](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-cors.html).

## Verification and remaining live checks

- On November 11, 2026, a read-only Movies request returned HTTP 200 with the expected `{ success, leaderboard }` structure and a numeric score.
- A local-origin GET and POST preflight returned no `Access-Control-Allow-Origin` permission for `http://127.0.0.1:8000`. A real Chrome request confirmed that CORS blocks the local UI's live read. No resource changes were made to fix this.
- Read-only GET/header and POST-preflight checks with the CloudFront origin named in the ZIP README (`https://d17wyxi8cpi412.cloudfront.net`) also returned no `Access-Control-Allow-Origin` header. This checks API response headers only, not a deployed site. Confirm the intended live origin with the API owner before deploying the connector.
- The deterministic browser suite intercepts all leaderboard requests and exercises success, failure, timeout, malformed payloads, stale requests, duplicate clicks, nickname injection, locale handling, blocked storage, keyboard focus, and small layouts.
- No live POST was sent. Backend acceptance, persistence, best-score concurrency, and live POST response CORS remain to be verified from an allowed origin using an explicitly chosen test record.
- Before a live integration review, confirm allowed origins and JSON preflight/response headers with the API owner. Do not use `no-cors` or disable browser protections. Any AWS changes or S3 deployment require a separate task.
