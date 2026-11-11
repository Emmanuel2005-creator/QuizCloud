import json
import os
import boto3
from boto3.dynamodb.conditions import Attr
from botocore.exceptions import ClientError

table = boto3.resource("dynamodb").Table(
    os.environ["TABLE_NAME"]
)

CATEGORIES = ("sports", "technology", "geography", "movies")


def respond(status, data):
    return {
        "statusCode": status,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(data)
    }


def lambda_handler(event, context):
    http = event.get("requestContext", {}).get("http", {})
    method = http.get("method")
    path = http.get("path", "")

    # GET /leaderboard?category=movies
    if method == "GET" and path == "/leaderboard":
        category = (event.get("queryStringParameters") or {}).get("category")

        if category not in CATEGORIES:
            return respond(400, {"error": "Invalid category"})

        response = table.scan(
            FilterExpression=Attr("category").eq(category)
        )

        scores = [
            {"name": item["name"], "score": int(item["score"])}
            for item in response.get("Items", [])
            if "name" in item and "score" in item
        ]

        scores.sort(key=lambda x: x["score"], reverse=True)

        return respond(200, {
            "success": True,
            "leaderboard": scores[:10]
        })

    # POST /scores
    if method == "POST" and path == "/scores":
        try:
            data = json.loads(event.get("body") or "{}")
        except (ValueError, TypeError):
            return respond(400, {"error": "Invalid JSON"})

        if not isinstance(data, dict):
            return respond(400, {"error": "Invalid data"})

        player_id = data.get("playerId")
        name = data.get("name")
        category = data.get("category")
        score = data.get("score")

        if (
            not isinstance(player_id, str)
            or not 8 <= len(player_id) <= 64
            or not isinstance(name, str)
            or not 1 <= len(name.strip()) <= 24
            or category not in CATEGORIES
            or type(score) is not int
            or score not in range(0, 1001, 100)
        ):
            return respond(400, {"error": "Invalid score data"})

        try:
            table.update_item(
                Key={
                    "PlayerId": player_id,
                    "category": category
                },
                UpdateExpression="SET #s = :s, #n = :n",
                ConditionExpression=(
                    "attribute_not_exists(#s) OR #s < :s"
                ),
                ExpressionAttributeNames={
                    "#s": "score",
                    "#n": "name"
                },
                ExpressionAttributeValues={
                    ":s": score,
                    ":n": name.strip()
                }
            )

            return respond(200, {
                "success": True,
                "saved": True,
                "score": score
            })

        except ClientError as error:
            if error.response["Error"]["Code"] == "ConditionalCheckFailedException":
                return respond(200, {
                    "success": True,
                    "saved": False
                })
            raise

    return respond(404, {"error": "Route not found"})
