import jwt
import pytest
from fastapi.testclient import TestClient

from tests.conftest import ADMIN_PASSWORD, JWT_SECRET, PRODUCT

ADMIN_ROUTES = [
    ("GET", "/admin/products"),
    ("POST", "/admin/products"),
    ("PUT", "/admin/products/p-1"),
    ("DELETE", "/admin/products/p-1"),
    ("GET", "/admin/orders"),
    ("PATCH", "/admin/orders/AO-1"),
    ("POST", "/admin/uploads/product-image"),
]


def test_login_rejects_wrong_password(client: TestClient) -> None:
    res = client.post("/auth/login", json={"username": "admin", "password": "wrong"})
    assert res.status_code == 401
    assert res.json()["detail"] == "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง"
    assert client.post("/auth/login", json={"username": "root", "password": ADMIN_PASSWORD}).status_code == 401


@pytest.mark.parametrize(("method", "path"), ADMIN_ROUTES)
def test_admin_routes_require_token(client: TestClient, method: str, path: str) -> None:
    assert client.request(method, path, json={}).status_code == 401
    assert client.request(method, path, json={}, headers={"Authorization": "Bearer garbage"}).status_code == 401


def test_token_without_admin_role_is_rejected(client: TestClient) -> None:
    forged = jwt.encode({"sub": "admin", "role": "customer", "exp": 4102444800}, JWT_SECRET, algorithm="HS256")
    res = client.get("/admin/products", headers={"Authorization": f"Bearer {forged}"})
    assert res.status_code == 401


def test_token_signed_with_other_secret_is_rejected(client: TestClient) -> None:
    forged = jwt.encode({"sub": "admin", "role": "admin", "exp": 4102444800}, "guessed-secret-guessed-secret-guessed", algorithm="HS256")
    assert client.get("/admin/products", headers={"Authorization": f"Bearer {forged}"}).status_code == 401


def test_cors_allows_frontend_origins(client: TestClient) -> None:
    res = client.options(
        "/admin/products",
        headers={
            "Origin": "http://localhost:3001",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "authorization,content-type",
        },
    )
    assert res.status_code == 200
    assert res.headers["access-control-allow-origin"] == "http://localhost:3001"
    blocked = client.get("/products", headers={"Origin": "https://evil.example.com"})
    assert "access-control-allow-origin" not in blocked.headers


def test_presigned_upload(client: TestClient, admin: dict[str, str]) -> None:
    res = client.post("/admin/uploads/product-image", json={"content_type": "image/png", "size": 500}, headers=admin)
    assert res.status_code == 200, res.text
    ticket = res.json()

    key = ticket["fields"]["key"]
    assert key.startswith("products/") and key.endswith(".png")
    assert ticket["fields"]["Content-Type"] == "image/png"
    assert "policy" in ticket["fields"]
    assert "test-images" in ticket["upload_url"]
    assert ticket["image_url"] == f"https://test-images.s3.ap-southeast-1.amazonaws.com/{key}"

    # The returned URL is accepted as a product image.
    body = {**PRODUCT, "image_url": ticket["image_url"]}
    assert client.post("/admin/products", json=body, headers=admin).status_code == 201


def test_upload_rejects_large_or_non_image(client: TestClient, admin: dict[str, str]) -> None:
    too_big = client.post("/admin/uploads/product-image", json={"content_type": "image/jpeg", "size": 4096}, headers=admin)
    assert too_big.status_code == 413
    not_image = client.post("/admin/uploads/product-image", json={"content_type": "text/html", "size": 10}, headers=admin)
    assert not_image.status_code == 422
