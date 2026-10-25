from collections.abc import Callable, Iterator
from typing import Any

import pytest
from fastapi.testclient import TestClient
from moto import mock_aws

from backend import aws
from backend.aws_setup import create_bucket, create_tables
from backend.config import Settings
from backend.images import ImageUploader
from backend.main import create_app
from backend.stores import DynamoDBStore, InMemoryStore, Store

ADMIN_PASSWORD = "test-password"
JWT_SECRET = "test-secret-that-is-at-least-32-bytes-long"

CUSTOMER = {"name": "สมชาย ใจดี", "phone": "0812345678", "address": "123 ถ.สุขุมวิท กรุงเทพฯ"}

PRODUCT = {
    "name": "มะม่วงน้ำดอกไม้",
    "description": "หวานหอม",
    "category": "ผลไม้ไทย",
    "price": 89.5,
    "unit": "กก.",
    "stock": 10,
    "image_url": None,
    "is_active": True,
}


@pytest.fixture
def settings(monkeypatch: pytest.MonkeyPatch) -> Settings:
    # moto intercepts boto3 calls; fake credentials make sure nothing reaches real AWS.
    for name in ("AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_SESSION_TOKEN"):
        monkeypatch.setenv(name, "testing")
    monkeypatch.delenv("AWS_PROFILE", raising=False)
    return Settings(
        _env_file=None,
        store="memory",
        aws_region="ap-southeast-1",
        aws_endpoint_url=None,
        images_bucket="test-images",
        admin_password=ADMIN_PASSWORD,  # type: ignore[arg-type]
        jwt_secret=JWT_SECRET,  # type: ignore[arg-type]
        max_image_bytes=1024,
    )


@pytest.fixture
def aws_mock(settings: Settings) -> Iterator[None]:
    with mock_aws():
        create_tables(settings)
        create_bucket(settings, public_images=False)
        yield


@pytest.fixture(params=["memory", "dynamodb"])
def store(request: pytest.FixtureRequest, settings: Settings, aws_mock: None) -> Store:
    if request.param == "memory":
        return InMemoryStore()
    return DynamoDBStore(
        aws.client("dynamodb", settings),
        products_table=settings.products_table,
        orders_table=settings.orders_table,
    )


@pytest.fixture
def client(settings: Settings, store: Store, aws_mock: None) -> Iterator[TestClient]:
    images = ImageUploader(
        aws.client("s3", settings),
        bucket=settings.images_bucket,
        public_base_url=settings.images_base_url,
        max_bytes=settings.max_image_bytes,
    )
    with TestClient(create_app(settings, store=store, images=images)) as c:
        yield c


@pytest.fixture
def admin(client: TestClient) -> dict[str, str]:
    """Authorization header for an admin."""
    res = client.post("/auth/login", json={"username": "admin", "password": ADMIN_PASSWORD})
    assert res.status_code == 200, res.text
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


MakeProduct = Callable[..., dict[str, Any]]


@pytest.fixture
def make_product(client: TestClient, admin: dict[str, str]) -> MakeProduct:
    def _make(**overrides: Any) -> dict[str, Any]:
        res = client.post("/admin/products", json={**PRODUCT, **overrides}, headers=admin)
        assert res.status_code == 201, res.text
        product: dict[str, Any] = res.json()
        return product

    return _make
