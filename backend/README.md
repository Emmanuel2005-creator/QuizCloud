# Lambda source backup

`lambda_function.py` is the Python source supplied by the project owner from the `QuizCloudLeaderboardAPI` Lambda console on November 11, 2026. It is preserved without refactoring or behavior changes. The local AWS CLI had no usable credentials, so this copy **was not independently compared with the deployed AWS package**. No Lambda deployment was performed.

SHA-256 of this LF-encoded source backup: `1e7f5ced1479b51d00d318abc8083c56fbe0ba82430d848e7f4ef7e3403c1603`.

| Setting | Existing value supplied by owner |
| --- | --- |
| Function | `QuizCloudLeaderboardAPI` |
| Runtime / region | Python 3.12 / `us-east-1` |
| Handler in this source | `lambda_function.lambda_handler` |
| Environment | `TABLE_NAME=QuizCloudLeaderBoard` |
| DynamoDB keys | Partition key `PlayerId`, sort key `category` |

The source initializes `boto3.resource("dynamodb").Table(os.environ["TABLE_NAME"])`. Boto3 uses the function's execution-role credentials in Lambda; no access keys are embedded or required in the source. `TABLE_NAME` selects the table, while the IAM role controls access. API Gateway separately needs permission to invoke Lambda.

## Request handling

- Reads method/path from API Gateway HTTP API event fields: `requestContext.http.method` and `.path`.
- `GET /leaderboard?category=movies`: validates the category, scans one DynamoDB page using a category filter, converts scores to integers, sorts descending, and returns up to ten names/scores.
- `POST /scores`: parses JSON, validates player ID/name lengths, category, and an integer score in 100-point steps from 0 to 1,000. Uses `update_item` with an atomic condition to create a score or replace only a lower score for the same player/category. An equal/higher stored score returns `saved: false`.
- Invalid input returns 400; unknown routes return 404. Unexpected DynamoDB errors propagate. Responses contain JSON; API Gateway handles the currently observed CORS headers.

The source needs `dynamodb:Scan` and `dynamodb:UpdateItem` on the intended table. The actual execution-role policies could not be inspected; least privilege is a remaining configuration review, not a verified property.

## Tests and limits

Run `python -m unittest discover -s tests -p "test_backend.py" -v` from the repository root. Tests provide in-memory SDK/table doubles before importing the module; no boto3 installation, AWS credentials, or DynamoDB calls are needed. They exercise the supplied implementation, not a replacement handler.

Scores and browser IDs remain unverified. The scan does not follow `LastEvaluatedKey`, so larger tables can yield incomplete rankings. No authentication, moderation, application rate limiting, or proof of quiz completion appears in this handler. Conditional writes protect the stored best from lower scores; they do not prevent cheating or identity spoofing. See [security notes](../docs/LEADERBOARD_BETA.md).

To independently verify the backup later, export the current function deployment package through an authorized AWS console/session and compare the `lambda_function.py` bytes/hash with this file. A ZIP `CodeSha256` verifies the deployment archive, not a single source file. Do not redeploy this backup merely to make the two match.
