import asyncio
from typing import Any

import pytest
from fastapi.testclient import TestClient

from backend.errors import ConflictError
from backend.schemas import OrderInput
from backend.stores import Store
from tests.conftest import CUSTOMER, MakeProduct


def place_order(client: TestClient, items: list[dict[str, Any]], **extra: Any) -> Any:
    return client.post("/orders", json={"customer": CUSTOMER, "items": items, "payment_method": "cod", **extra})


def stock_of(client: TestClient, admin: dict[str, str], product_id: str) -> int:
    products = client.get("/admin/products", headers=admin).json()
    stock: int = next(p["stock"] for p in products if p["id"] == product_id)
    return stock


def test_place_order_prices_on_server_and_deducts_stock(
    client: TestClient, admin: dict[str, str], make_product: MakeProduct
) -> None:
    mango = make_product(name="มะม่วง", price=89.5, stock=10)
    lychee = make_product(name="ลิ้นจี่", price=120, stock=3)

    res = place_order(
        client,
        [
            {"product_id": mango["id"], "quantity": 2},
            {"product_id": lychee["id"], "quantity": 1},
            {"product_id": mango["id"], "quantity": 1},  # merged with the first line
        ],
        payment_method="transfer",
        note="  ส่งช่วงเย็น ",
    )
    assert res.status_code == 201, res.text
    order = res.json()

    assert order["id"].startswith("AO-")
    assert order["status"] == "pending"
    assert order["payment_method"] == "transfer"
    assert order["note"] == "ส่งช่วงเย็น"
    assert order["total"] == 388.5  # 3 * 89.50 + 120
    assert sorted((i["name"], i["price"], i["quantity"]) for i in order["items"]) == [
        ("มะม่วง", 89.5, 3),
        ("ลิ้นจี่", 120.0, 1),
    ]
    assert stock_of(client, admin, mango["id"]) == 7
    assert stock_of(client, admin, lychee["id"]) == 2

    # A later price change doesn't rewrite the order.
    body = {k: v for k, v in mango.items() if k != "id"} | {"price": 200}
    assert client.put(f"/admin/products/{mango['id']}", json=body, headers=admin).status_code == 200
    assert client.get(f"/orders/{order['id']}").json()["total"] == 388.5


def test_insufficient_stock_rejects_whole_order(
    client: TestClient, admin: dict[str, str], make_product: MakeProduct
) -> None:
    mango = make_product(stock=10)
    lychee = make_product(name="ลิ้นจี่", stock=1, unit="กก.")

    res = place_order(client, [{"product_id": mango["id"], "quantity": 2}, {"product_id": lychee["id"], "quantity": 5}])
    assert res.status_code == 409
    assert res.json()["detail"] == "ลิ้นจี่ มีในสต็อกเพียง 1 กก."
    assert stock_of(client, admin, mango["id"]) == 10
    assert client.get("/admin/orders", headers=admin).json() == []


@pytest.mark.parametrize("case", ["inactive", "missing"])
def test_unavailable_product_is_409(client: TestClient, make_product: MakeProduct, case: str) -> None:
    product_id = make_product(is_active=False)["id"] if case == "inactive" else "p-missing"
    assert place_order(client, [{"product_id": product_id, "quantity": 1}]).status_code == 409


def test_order_validation(client: TestClient, make_product: MakeProduct) -> None:
    item = [{"product_id": make_product()["id"], "quantity": 1}]

    assert place_order(client, []).status_code == 422
    assert place_order(client, [{**item[0], "quantity": 0}]).status_code == 422
    assert place_order(client, item, payment_method="bitcoin").status_code == 422
    for phone in ["812345678", "08123", "+66812345678", "08-1234-5678"]:
        res = client.post("/orders", json={"customer": {**CUSTOMER, "phone": phone}, "items": item, "payment_method": "cod"})
        assert res.status_code == 422, phone
    res = client.post("/orders", json={"customer": {**CUSTOMER, "email": "nope"}, "items": item, "payment_method": "cod"})
    assert res.status_code == 422


def test_status_flow(client: TestClient, admin: dict[str, str], make_product: MakeProduct) -> None:
    order_id = place_order(client, [{"product_id": make_product()["id"], "quantity": 1}]).json()["id"]

    for status in ["confirmed", "shipping", "completed"]:
        res = client.patch(f"/admin/orders/{order_id}", json={"status": status}, headers=admin)
        assert res.status_code == 200, res.text
        assert res.json()["status"] == status

    res = client.patch(f"/admin/orders/{order_id}", json={"status": "cancelled"}, headers=admin)
    assert res.status_code == 409
    assert res.json()["detail"] == "คำสั่งซื้อนี้ปิดแล้ว เปลี่ยนสถานะไม่ได้"


def test_skipping_a_step_is_409(client: TestClient, admin: dict[str, str], make_product: MakeProduct) -> None:
    order_id = place_order(client, [{"product_id": make_product()["id"], "quantity": 1}]).json()["id"]
    res = client.patch(f"/admin/orders/{order_id}", json={"status": "completed"}, headers=admin)
    assert res.status_code == 409


def test_cancel_returns_stock(client: TestClient, admin: dict[str, str], make_product: MakeProduct) -> None:
    kept = make_product(stock=5)
    deleted = make_product(name="ลิ้นจี่", stock=5)
    order_id = place_order(
        client, [{"product_id": kept["id"], "quantity": 4}, {"product_id": deleted["id"], "quantity": 1}]
    ).json()["id"]
    client.delete(f"/admin/products/{deleted['id']}", headers=admin)

    res = client.patch(f"/admin/orders/{order_id}", json={"status": "cancelled"}, headers=admin)
    assert res.status_code == 200, res.text
    assert stock_of(client, admin, kept["id"]) == 5


def test_admin_orders_newest_first(client: TestClient, admin: dict[str, str], make_product: MakeProduct) -> None:
    item = [{"product_id": make_product()["id"], "quantity": 1}]
    ids = [place_order(client, item).json()["id"] for _ in range(3)]
    listed = [o["id"] for o in client.get("/admin/orders", headers=admin).json()]
    assert set(listed) == set(ids)
    created = [o["created_at"] for o in client.get("/admin/orders", headers=admin).json()]
    assert created == sorted(created, reverse=True)


def test_unknown_order_404(client: TestClient, admin: dict[str, str]) -> None:
    assert client.get("/orders/AO-NOPE").status_code == 404
    assert client.patch("/admin/orders/AO-NOPE", json={"status": "confirmed"}, headers=admin).status_code == 404


def test_last_item_cannot_be_sold_twice(store: Store, make_product: MakeProduct) -> None:
    """Two customers order the last unit at the same time: exactly one succeeds."""
    product_id = make_product(stock=1)["id"]
    order = OrderInput.model_validate(
        {"customer": CUSTOMER, "items": [{"product_id": product_id, "quantity": 1}], "payment_method": "cod"}
    )

    async def race() -> list[object]:
        return await asyncio.gather(store.create_order(order), store.create_order(order), return_exceptions=True)

    results = asyncio.run(race())
    assert sum(isinstance(r, ConflictError) for r in results) == 1
    assert sum(not isinstance(r, BaseException) for r in results) == 1
    assert asyncio.run(store.get_product(product_id)).stock == 0
