"""The Lambda path: API Gateway HTTP API (payload v2) events through Mangum, with Cognito admin auth."""

import json
from typing import Any

import pytest
from mangum import Mangum

from backend.config import Settings
from backend.images import ImageUploader
from backend.lambda_handler import API_BASE_PATH
from backend.main import create_app
from backend.stores import InMemoryStore

from .conftest import PRODUCT


class _NoS3:
    """Image uploads are covered elsewhere; these tests never sign one."""


def _event(
    method: str,
    path: str,
    *,
    body: dict[str, Any] | None = None,
    claims: dict[str, Any] | None = None,
) -> dict[str, Any]:
    context: dict[str, Any] = {
        "http": {"method": method, "path": path, "protocol": "HTTP/1.1", "sourceIp": "203.0.113.1"},
        "stage": "$default",
        "requestId": "test",
        "domainName": "example.execute-api.us-east-1.amazonaws.com",
    }
    if claims is not None:
        context["authorizer"] = {"jwt": {"claims": claims, "scopes": None}}
    return {
        "version": "2.0",
        "routeKey": f"ANY {API_BASE_PATH}/{{proxy+}}",
        "rawPath": path,
        "rawQueryString": "",
        "headers": {"host": "example.cloudfront.net", "content-type": "application/json"},
        "requestContext": context,
        "body": json.dumps(body) if body is not None else None,
        "isBase64Encoded": False,
    }


@pytest.fixture
def handler(settings: Settings) -> Mangum:
    cognito = settings.model_copy(update={"admin_auth": "cognito"})
    images = ImageUploader(_NoS3(), bucket="b", public_base_url="", max_bytes=1)  # type: ignore[arg-type]
    app = create_app(cognito, store=InMemoryStore(), images=images)
    return Mangum(app, lifespan="off", api_gateway_base_path=API_BASE_PATH)


ADMIN_CLAIMS = {"sub": "abc", "cognito:username": "shopadmin", "cognito:groups": "[admin]"}


def _call(handler: Mangum, event: dict[str, Any]) -> tuple[int, Any]:
    res = handler(event, None)
    body = json.loads(res["body"]) if res.get("body") else None
    return res["statusCode"], body


def test_public_route_strips_api_prefix(handler: Mangum) -> None:
    status, body = _call(handler, _event("GET", "/api/health"))
    assert status == 200
    assert body == {"status": "ok"}


def test_admin_route_accepts_admin_group_claims(handler: Mangum) -> None:
    status, body = _call(handler, _event("POST", "/api/admin/products", body=PRODUCT, claims=ADMIN_CLAIMS))
    assert status == 201, body
    status, body = _call(handler, _event("GET", "/api/admin/products", claims=ADMIN_CLAIMS))
    assert status == 200
    assert [p["name"] for p in body] == [PRODUCT["name"]]


@pytest.mark.parametrize(
    "claims",
    [
        None,  # route reached without the JWT authorizer
        {"sub": "abc", "cognito:username": "someone"},  # signed in, but not in any group
        {"sub": "abc", "cognito:groups": "[editors]"},  # wrong group
    ],
)
def test_admin_route_refuses_without_admin_group(handler: Mangum, claims: dict[str, Any] | None) -> None:
    status, _ = _call(handler, _event("GET", "/api/admin/products", claims=claims))
    assert status == 401


def test_admin_preflight_needs_no_token(handler: Mangum, settings: Settings) -> None:
    # API Gateway sends OPTIONS /api/admin/* to the function without the authorizer.
    event = _event("OPTIONS", "/api/admin/products")
    event["headers"] |= {
        "origin": settings.cors_origins[0],
        "access-control-request-method": "GET",
        "access-control-request-headers": "authorization,content-type",
    }
    res = handler(event, None)
    assert res["statusCode"] == 200
    assert res["headers"]["access-control-allow-origin"] == settings.cors_origins[0]


def test_groups_claim_as_list_is_accepted(handler: Mangum) -> None:
    claims = {**ADMIN_CLAIMS, "cognito:groups": ["staff", "admin"]}
    status, _ = _call(handler, _event("GET", "/api/admin/orders", claims=claims))
    assert status == 200


def test_local_password_login_is_off_in_cognito_mode(handler: Mangum) -> None:
    from .conftest import ADMIN_PASSWORD

    status, _ = _call(
        handler, _event("POST", "/api/auth/login", body={"username": "admin", "password": ADMIN_PASSWORD})
    )
    assert status == 401
