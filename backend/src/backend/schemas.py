"""Request/response models. They follow the contract in API.md at the repo root."""

import re
from datetime import datetime
from decimal import Decimal
from enum import StrEnum
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, PlainSerializer, field_validator

# Prices are exact decimals internally (DynamoDB also requires Decimal) but are
# sent to clients as JSON numbers, as API.md specifies.
DecimalNumber = Annotated[Decimal, PlainSerializer(float, return_type=float, when_used="json")]
Money = Annotated[DecimalNumber, Field(ge=0, max_digits=10, decimal_places=2)]

# Uploaded images live on S3: https behind CloudFront, plain http on an S3
# website endpoint (AWS Learner Lab) or a local emulator. Only web schemes, so
# values like javascript: never reach an <img src>.
_IMAGE_URL = re.compile(r"^https?://[^/\s]+/\S+$")


class _Schema(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")


# --- Products ---------------------------------------------------------------


class ProductInput(_Schema):
    """Body of POST /admin/products and PUT /admin/products/{id} (a Product without `id`)."""

    name: str = Field(min_length=1, max_length=120, examples=["มะม่วงน้ำดอกไม้"])
    description: str = Field(default="", max_length=2000)
    category: str = Field(min_length=1, max_length=60, examples=["ผลไม้ไทย"])
    price: Money = Field(examples=[89])
    unit: str = Field(min_length=1, max_length=20, examples=["กก."])
    stock: int = Field(ge=0)
    image_url: str | None = Field(default=None, max_length=2048)
    is_active: bool = True

    @field_validator("image_url", mode="after")
    @classmethod
    def _check_image_url(cls, v: str | None) -> str | None:
        if not v:
            return None
        if not _IMAGE_URL.match(v):
            raise ValueError("image_url must be an http:// or https:// URL")
        return v


class Product(ProductInput):
    id: str


# --- Orders -----------------------------------------------------------------


class OrderStatus(StrEnum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    SHIPPING = "shipping"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


ALLOWED_STATUS_TRANSITIONS: dict[OrderStatus, frozenset[OrderStatus]] = {
    OrderStatus.PENDING: frozenset({OrderStatus.CONFIRMED, OrderStatus.CANCELLED}),
    OrderStatus.CONFIRMED: frozenset({OrderStatus.SHIPPING, OrderStatus.CANCELLED}),
    OrderStatus.SHIPPING: frozenset({OrderStatus.COMPLETED, OrderStatus.CANCELLED}),
    OrderStatus.COMPLETED: frozenset(),
    OrderStatus.CANCELLED: frozenset(),
}

PaymentMethod = Literal["cod", "transfer"]


class Customer(_Schema):
    name: str = Field(min_length=1, max_length=120)
    phone: str = Field(pattern=r"^0\d{8,9}$", examples=["0812345678"])
    email: str | None = Field(default=None, max_length=254, pattern=r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
    address: str = Field(min_length=1, max_length=500)


class OrderItemInput(_Schema):
    product_id: str = Field(min_length=1, max_length=64)
    quantity: int = Field(ge=1, le=1000)


class OrderInput(_Schema):
    customer: Customer
    items: list[OrderItemInput] = Field(min_length=1, max_length=50)
    payment_method: PaymentMethod
    note: str | None = Field(default=None, max_length=500)


class OrderItem(_Schema):
    """Snapshot of the product at order time, so later edits don't change past orders."""

    product_id: str
    name: str
    price: DecimalNumber
    unit: str
    quantity: int


class Order(_Schema):
    id: str
    # Account that placed the order (see /customers). `customer` holds the delivery details.
    customer_id: str | None = None
    customer: Customer
    items: list[OrderItem]
    total: DecimalNumber
    status: OrderStatus
    payment_method: PaymentMethod
    note: str | None = None
    created_at: datetime


class OrderStatusUpdate(_Schema):
    status: OrderStatus


# --- Auth & uploads ---------------------------------------------------------


class LoginInput(_Schema):
    username: str = Field(min_length=1, max_length=120)
    password: str = Field(min_length=1, max_length=200)


class Token(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"


# --- Customer accounts ------------------------------------------------------

_EMAIL_PATTERN = r"^[^\s@]+@[^\s@]+\.[^\s@]+$"


def _normalize_email(v: str) -> str:
    return v.lower()


class CustomerRegister(_Schema):
    name: str = Field(min_length=1, max_length=120)
    email: str = Field(max_length=254, pattern=_EMAIL_PATTERN, examples=["somchai@example.com"])
    phone: str = Field(pattern=r"^0\d{8,9}$", examples=["0812345678"])
    password: str = Field(min_length=8, max_length=128)

    _email = field_validator("email", mode="after")(_normalize_email)


class CustomerLogin(_Schema):
    email: str = Field(min_length=1, max_length=254)
    password: str = Field(min_length=1, max_length=128)

    _email = field_validator("email", mode="after")(_normalize_email)


class CustomerAccount(BaseModel):
    id: str
    name: str
    email: str
    phone: str


class StoredCustomer(CustomerAccount):
    """Internal record. Never returned by the API: it carries the password hash."""

    password_hash: str


class CustomerSession(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"
    customer: CustomerAccount


ImageContentType = Literal["image/jpeg", "image/png", "image/webp"]


class ImageUploadRequest(_Schema):
    content_type: ImageContentType
    size: int = Field(gt=0, description="File size in bytes")


class ImageUploadTicket(BaseModel):
    """Presigned S3 POST: send `fields` plus the file (last) as multipart/form-data to `upload_url`."""

    upload_url: str
    fields: dict[str, str]
    image_url: str
    expires_in: int
