"""Exercise the preserved console source with SDK doubles; never contact AWS."""
import importlib.util
import json
import os
from pathlib import Path
import sys
import types
import unittest
from decimal import Decimal
from unittest.mock import Mock, patch


class FakeClientError(Exception):
    def __init__(self, code):
        self.response = {"Error": {"Code": code}}


class FakeAttr:
    def __init__(self, name):
        self.name = name

    def eq(self, value):
        return (self.name, "equals", value)


class BackendTests(unittest.TestCase):
    def setUp(self):
        self.table = Mock()
        self.resource = Mock()
        self.resource.Table.return_value = self.table
        boto3 = types.ModuleType("boto3")
        boto3.resource = Mock(return_value=self.resource)
        conditions = types.ModuleType("boto3.dynamodb.conditions")
        conditions.Attr = FakeAttr
        errors = types.ModuleType("botocore.exceptions")
        errors.ClientError = FakeClientError
        modules = {"boto3": boto3, "boto3.dynamodb": types.ModuleType("boto3.dynamodb"),
                   "boto3.dynamodb.conditions": conditions,
                   "botocore": types.ModuleType("botocore"), "botocore.exceptions": errors}
        source = Path(__file__).resolve().parents[1] / "backend" / "lambda_function.py"
        spec = importlib.util.spec_from_file_location("preserved_lambda", source)
        self.module = importlib.util.module_from_spec(spec)
        with patch.dict(sys.modules, modules), patch.dict(os.environ, {"TABLE_NAME": "QuizCloudLeaderBoard"}):
            spec.loader.exec_module(self.module)
        self.boto3 = boto3
        self.valid = {"playerId": "test-player-id", "name": "Player", "category": "movies", "score": 800}

    def invoke(self, method, path, body=None, query=None):
        event = {"requestContext": {"http": {"method": method, "path": path}}}
        if body is not None:
            event["body"] = body
        if query is not None:
            event["queryStringParameters"] = query
        result = self.module.lambda_handler(event, None)
        self.assertEqual(result["headers"]["Content-Type"], "application/json")
        return result["statusCode"], json.loads(result["body"])

    def post(self, values):
        return self.invoke("POST", "/scores", json.dumps(values))

    def test_uses_environment_table_and_default_role_credentials(self):
        self.boto3.resource.assert_called_once_with("dynamodb")
        self.resource.Table.assert_called_once_with("QuizCloudLeaderBoard")

    def test_all_categories_sort_scores_and_limit_to_ten(self):
        for category in self.module.CATEGORIES:
            with self.subTest(category=category):
                self.table.scan.return_value = {"Items": [{"name": str(i), "score": Decimal(i * 100)} for i in range(11)]}
                code, data = self.invoke("GET", "/leaderboard", query={"category": category})
                self.assertEqual(code, 200)
                self.assertTrue(data["success"])
                self.assertEqual([row["score"] for row in data["leaderboard"]], list(range(1000, 0, -100)))
                self.table.scan.assert_called_with(FilterExpression=("category", "equals", category))

    def test_empty_table_returns_empty_leaderboard(self):
        self.table.scan.return_value = {}
        self.assertEqual(self.invoke("GET", "/leaderboard", query={"category": "movies"}), (200, {"success": True, "leaderboard": []}))

    def test_rows_missing_name_or_score_are_skipped(self):
        self.table.scan.return_value = {"Items": [{"name": "MissingScore"}, {"score": 400}, {"name": "Valid", "score": Decimal(800)}]}
        code, data = self.invoke("GET", "/leaderboard", query={"category": "movies"})
        self.assertEqual(code, 200)
        self.assertEqual(data["leaderboard"], [{"name": "Valid", "score": 800}])

    def test_missing_and_invalid_categories_do_not_access_table(self):
        for query in [None, {}, {"category": "unknown"}, {"category": "Movies"}]:
            with self.subTest(query=query):
                code, _ = self.invoke("GET", "/leaderboard", query=query)
                self.assertEqual(code, 400)
        self.table.scan.assert_not_called()

    def test_valid_score_uses_atomic_best_update_and_composite_key(self):
        self.valid["name"] = "  Player  "
        self.assertEqual(self.post(self.valid), (200, {"success": True, "saved": True, "score": 800}))
        update = self.table.update_item.call_args.kwargs
        self.assertEqual(update["Key"], {"PlayerId": "test-player-id", "category": "movies"})
        self.assertEqual(update["ConditionExpression"], "attribute_not_exists(#s) OR #s < :s")
        self.assertEqual(update["ExpressionAttributeValues"], {":s": 800, ":n": "Player"})

    def test_all_categories_and_boundary_scores_are_accepted(self):
        for category in self.module.CATEGORIES:
            for score in [0, 100, 1000]:
                with self.subTest(category=category, score=score):
                    self.assertEqual(self.post({**self.valid, "category": category, "score": score})[0], 200)

    def test_invalid_json_is_rejected(self):
        for body in ["{broken", "not-json"]:
            self.assertEqual(self.invoke("POST", "/scores", body), (400, {"error": "Invalid JSON"}))
        self.table.update_item.assert_not_called()

    def test_non_object_json_is_rejected(self):
        for value in [[], None, 123, "text", True]:
            self.assertEqual(self.post(value), (400, {"error": "Invalid data"}))
        self.table.update_item.assert_not_called()

    def test_invalid_fields_are_rejected_before_writing(self):
        cases = [
            ("playerId", "short"), ("playerId", "x" * 65), ("playerId", 123),
            ("name", " "), ("name", "x" * 25), ("name", None),
            ("category", "unknown"), ("category", None),
            ("score", True), ("score", 800.0), ("score", "800"),
            ("score", -100), ("score", 1100), ("score", 55), ("score", None)
        ]
        for key, value in cases:
            with self.subTest(key=key, value=value):
                self.assertEqual(self.post({**self.valid, key: value})[0], 400)
        self.table.update_item.assert_not_called()

    def test_empty_or_missing_body_is_rejected(self):
        for body in [None, "", "{}"]:
            self.assertEqual(self.invoke("POST", "/scores", body)[0], 400)
        self.table.update_item.assert_not_called()

    def test_equal_or_higher_best_returns_saved_false(self):
        self.table.update_item.side_effect = FakeClientError("ConditionalCheckFailedException")
        self.assertEqual(self.post(self.valid), (200, {"success": True, "saved": False}))

    def test_unexpected_write_errors_propagate(self):
        self.table.update_item.side_effect = FakeClientError("ProvisionedThroughputExceededException")
        with self.assertRaises(FakeClientError):
            self.post(self.valid)

    def test_scan_errors_propagate(self):
        self.table.scan.side_effect = FakeClientError("AccessDeniedException")
        with self.assertRaises(FakeClientError):
            self.invoke("GET", "/leaderboard", query={"category": "movies"})

    def test_unknown_routes_return_404_without_table_access(self):
        for method, route in [("GET", "/scores"), ("POST", "/leaderboard"), ("DELETE", "/scores"), ("GET", "/unknown")]:
            self.assertEqual(self.invoke(method, route), (404, {"error": "Route not found"}))
        self.table.scan.assert_not_called()
        self.table.update_item.assert_not_called()

    def test_records_current_single_page_scan_limitation(self):
        self.table.scan.return_value = {"Items": [{"name": "FirstPage", "score": 100}], "LastEvaluatedKey": {"PlayerId": "next", "category": "movies"}}
        code, data = self.invoke("GET", "/leaderboard", query={"category": "movies"})
        self.assertEqual(code, 200)
        self.assertEqual(data["leaderboard"], [{"name": "FirstPage", "score": 100}])
        self.table.scan.assert_called_once()


if __name__ == "__main__":
    unittest.main()
