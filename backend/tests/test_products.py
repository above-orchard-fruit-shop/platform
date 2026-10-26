from fastapi.testclient import TestClient

from tests.conftest import PRODUCT, MakeProduct


def test_create_then_read_from_storefront(client: TestClient, make_product: MakeProduct) -> None:
    created = make_product(name="  ทุเรียนหมอนทอง  ", price="250.00", image_url="")

    assert created["id"].startswith("p-")
    assert created["name"] == "ทุเรียนหมอนทอง"
    assert created["price"] == 250.0
    assert created["image_url"] is None

    assert client.get(f"/products/{created['id']}").json() == created
    assert client.get("/products").json() == [created]


def test_storefront_hides_inactive(client: TestClient, admin: dict[str, str], make_product: MakeProduct) -> None:
    visible = make_product(name="กล้วย")
    hidden = make_product(name="แอปเปิ้ล", is_active=False)

    assert [p["id"] for p in client.get("/products").json()] == [visible["id"]]
    assert client.get(f"/products/{hidden['id']}").status_code == 404
    admin_ids = {p["id"] for p in client.get("/admin/products", headers=admin).json()}
    assert admin_ids == {visible["id"], hidden["id"]}


def test_put_replaces_product(client: TestClient, admin: dict[str, str], make_product: MakeProduct) -> None:
    product = make_product()
    body = {**PRODUCT, "price": 99, "stock": 3, "image_url": "https://cdn.example.com/products/m.jpg"}

    res = client.put(f"/admin/products/{product['id']}", json=body, headers=admin)
    assert res.status_code == 200, res.text
    assert res.json() == {**body, "id": product["id"], "price": 99.0}
    assert client.get(f"/products/{product['id']}").json()["stock"] == 3


def test_put_and_delete_unknown_product_404(client: TestClient, admin: dict[str, str]) -> None:
    assert client.put("/admin/products/nope", json=PRODUCT, headers=admin).status_code == 404
    assert client.delete("/admin/products/nope", headers=admin).status_code == 404


def test_delete_product(client: TestClient, admin: dict[str, str], make_product: MakeProduct) -> None:
    product = make_product()
    assert client.delete(f"/admin/products/{product['id']}", headers=admin).status_code == 204
    assert client.get(f"/products/{product['id']}").status_code == 404


def test_product_validation(client: TestClient, admin: dict[str, str]) -> None:
    def post(**overrides: object) -> int:
        return client.post("/admin/products", json={**PRODUCT, **overrides}, headers=admin).status_code

    assert post(price=-1) == 422
    assert post(price=1.005) == 422
    assert post(stock=-1) == 422
    assert post(name="") == 422
    assert post(image_url="javascript:alert(1)") == 422
    assert post(image_url="ftp://example.com/x.jpg") == 422
    assert post(image_url="http://") == 422
    assert post(image_url="http://localhost:4566/bucket/products/x.jpg") == 201  # local emulator
    # S3 website endpoints (AWS Learner Lab, no CloudFront) are http only.
    s3_website = "http://shop.s3-website-us-east-1.amazonaws.com/images/products/x.jpg"
    assert post(image_url=s3_website) == 201
    assert post(bogus=True) == 422


def test_validation_error_detail_is_a_message(client: TestClient, admin: dict[str, str]) -> None:
    res = client.post("/admin/products", json={**PRODUCT, "price": -1}, headers=admin)
    assert res.json()["detail"] == "ข้อมูลไม่ถูกต้อง: price"
