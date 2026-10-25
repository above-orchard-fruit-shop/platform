import asyncio

import jwt
import pytest
from fastapi.testclient import TestClient

from backend.stores import Store
from tests.conftest import CUSTOMER, JWT_SECRET, SHOPPER, MakeProduct


def order_body(product_id: str) -> dict[str, object]:
    return {"customer": CUSTOMER, "items": [{"product_id": product_id, "quantity": 1}], "payment_method": "cod"}


def test_register_returns_session_without_password(client: TestClient) -> None:
    res = client.post("/customers/register", json={**SHOPPER, "email": "  SomChai@Example.COM "})
    assert res.status_code == 201, res.text
    body = res.json()

    assert set(body) == {"access_token", "token_type", "customer"}
    assert body["customer"]["id"].startswith("c-")
    assert body["customer"]["email"] == "somchai@example.com"  # trimmed and lower-cased
    assert body["customer"]["name"] == SHOPPER["name"]
    assert "password" not in res.text


def test_password_is_stored_hashed(client: TestClient, store: Store) -> None:
    client.post("/customers/register", json=SHOPPER)
    stored = asyncio.run(store.get_customer_by_email(SHOPPER["email"]))
    assert stored is not None
    assert stored.password_hash.startswith("scrypt$")
    assert SHOPPER["password"] not in stored.password_hash


def test_duplicate_email_is_409(client: TestClient) -> None:
    assert client.post("/customers/register", json=SHOPPER).status_code == 201
    res = client.post("/customers/register", json={**SHOPPER, "email": SHOPPER["email"].upper()})
    assert res.status_code == 409
    assert res.json()["detail"] == "อีเมลนี้มีบัญชีอยู่แล้ว กรุณาเข้าสู่ระบบ"


@pytest.mark.parametrize(
    "overrides",
    [{"password": "short"}, {"email": "not-an-email"}, {"phone": "12345"}, {"name": ""}],
)
def test_register_validation(client: TestClient, overrides: dict[str, str]) -> None:
    assert client.post("/customers/register", json={**SHOPPER, **overrides}).status_code == 422


def test_login(client: TestClient) -> None:
    client.post("/customers/register", json=SHOPPER)

    ok = client.post("/customers/login", json={"email": "SOMCHAI@example.com", "password": SHOPPER["password"]})
    assert ok.status_code == 200, ok.text
    assert ok.json()["customer"]["email"] == SHOPPER["email"]

    for email, password in [(SHOPPER["email"], "wrong-password"), ("nobody@example.com", SHOPPER["password"])]:
        res = client.post("/customers/login", json={"email": email, "password": password})
        assert res.status_code == 401
        assert res.json()["detail"] == "อีเมลหรือรหัสผ่านไม่ถูกต้อง"


def test_order_requires_customer_login(
    client: TestClient, admin: dict[str, str], make_product: MakeProduct
) -> None:
    product_id = make_product()["id"]

    res = client.post("/orders", json=order_body(product_id))
    assert res.status_code == 401
    assert res.json()["detail"] == "กรุณาเข้าสู่ระบบก่อนสั่งซื้อ"
    # An admin token is not a customer token.
    assert client.post("/orders", json=order_body(product_id), headers=admin).status_code == 401
    assert client.post("/orders", json=order_body(product_id), headers={"Authorization": "Bearer junk"}).status_code == 401
    # Nothing was ordered, so stock is untouched.
    assert client.get(f"/products/{product_id}").json()["stock"] == 10


def test_order_is_linked_to_the_customer(client: TestClient, make_product: MakeProduct) -> None:
    session = client.post("/customers/register", json=SHOPPER).json()
    headers = {"Authorization": f"Bearer {session['access_token']}"}

    res = client.post("/orders", json=order_body(make_product()["id"]), headers=headers)
    assert res.status_code == 201, res.text
    assert res.json()["customer_id"] == session["customer"]["id"]


def test_customer_token_cannot_use_admin_routes(client: TestClient, customer: dict[str, str]) -> None:
    assert client.get("/admin/orders", headers=customer).status_code == 401


def test_expired_customer_token_is_rejected(client: TestClient, make_product: MakeProduct) -> None:
    expired = jwt.encode(
        {"sub": "c-1", "role": "customer", "email": "a@b.co", "exp": 1}, JWT_SECRET, algorithm="HS256"
    )
    res = client.post("/orders", json=order_body(make_product()["id"]), headers={"Authorization": f"Bearer {expired}"})
    assert res.status_code == 401


def test_order_history_shows_only_my_orders_newest_first(client: TestClient, make_product: MakeProduct) -> None:
    def sign_up(email: str) -> dict[str, str]:
        res = client.post("/customers/register", json={**SHOPPER, "email": email})
        return {"Authorization": f"Bearer {res.json()['access_token']}"}

    me, someone_else = sign_up("me@example.com"), sign_up("other@example.com")
    product_id = make_product(stock=10)["id"]
    mine = [client.post("/orders", json=order_body(product_id), headers=me).json()["id"] for _ in range(2)]
    theirs = client.post("/orders", json=order_body(product_id), headers=someone_else).json()["id"]

    res = client.get("/customers/me/orders", headers=me)
    assert res.status_code == 200, res.text
    history = res.json()
    assert {o["id"] for o in history} == set(mine)
    assert theirs not in {o["id"] for o in history}
    created = [o["created_at"] for o in history]
    assert created == sorted(created, reverse=True)
    assert history[0]["status"] == "pending"
    assert history[0]["items"][0]["product_id"] == product_id


def test_order_history_is_empty_for_new_customer(client: TestClient, customer: dict[str, str]) -> None:
    res = client.get("/customers/me/orders", headers=customer)
    assert res.status_code == 200
    assert res.json() == []


def test_order_history_requires_customer_login(client: TestClient, admin: dict[str, str]) -> None:
    assert client.get("/customers/me/orders").status_code == 401
    assert client.get("/customers/me/orders", headers=admin).status_code == 401
