# Deployment and live verification

QuizCloud is already deployed at https://d17wyxi8cpi412.cloudfront.net. This repository contains frontend source and a user-supplied backup of the existing Lambda handler. GitHub changes do not automatically publish to AWS; there is no deployment workflow in this repository.

## Current frontend status

Read-only checks on November 11, 2026 downloaded the following public CloudFront assets and compared their SHA-256 hashes with the local files after normalizing CRLF to LF:

| File from `dist/` | Public HTTP status | Content matches |
| --- | --- | --- |
| `index.html` | 200 | Yes |
| `styles.css` | 200 | Yes |
| `questions.js` | 200 | Yes |
| `game.js` | 200 | Yes |
| `app.js` | 200 | Yes |
| `leaderboard.js` | 200 | Yes |
| `leaderboard.css` | 200 | Yes |

**Files requiring upload for this finalization: none.** No S3 upload or CloudFront invalidation was performed or is needed for these unchanged frontend assets. This compares publicly served content; it does not inspect private bucket settings or every CloudFront edge cache.

Real Chrome checks on the live origin retrieved rankings in all four categories. Read-only GET responses and POST preflight allowed the CloudFront origin, GET/POST methods, and the `content-type` header. A preflight success does not establish that a POST will persist a score. No production POST was sent.

## Manual procedure for a future frontend change

Only perform this when a frontend change and deployment are approved:

1. Run the local unit/browser checks and review the changed files.
2. In the S3 console, open `quizcloud-emmanuel-2026` and upload the changed files from inside `dist/` to the bucket root. Keep the current bucket privacy settings; do not upload the repository, ZIP archives, backend source, tests, dependencies, or credentials. Upload `index.html` last if it changes.
3. In CloudFront, find the existing distribution by domain `d17wyxi8cpi412.cloudfront.net`; do not guess a distribution ID or create a replacement.
4. If cached files need refreshing, create an invalidation for the changed paths. Include both `/` and `/index.html` if the entry page changed. Wait for completion and reload the site.
5. Run `npm run test:live` to compare all assets, play read-only browser rounds, and test real rankings. Inspect mismatched filenames in `artifacts/live-status.json` before deciding what to upload.

Current filenames are not content hashed. Retain a complete known-good release for rollback; restore the affected files and invalidate their paths if a future approved release fails. [AWS guidance on stale CloudFront content](https://repost.aws/knowledge-center/cloudfront-serving-outdated-content-s3) explains the cache boundary.

## Lambda and configuration boundary

Do not upload `backend/` to S3 or redeploy Lambda as part of frontend updates. The Lambda copy was supplied by the owner from the console and was not independently downloaded from AWS. Confirm it against a deployment export if byte-level provenance is needed; do not change the deployed function to match the repository.

No IAM policy, API route, CORS setting, DynamoDB schema, bucket policy, Lambda environment/runtime, or AWS resource was modified during finalization. Actual IAM least privilege and private settings remain an owner configuration review.

Live POST verification remains manual and requires explicit permission for a chosen production test nickname/player ID. A timeout can occur after a successful write; inspect rankings before retrying. Do not infer database persistence from the mocked tests or the successful OPTIONS request.
