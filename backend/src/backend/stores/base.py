"""Store interface plus the order rules every store implementation shares."""

import secrets
import string
import time
from collections import Counter
from collections.abc import Mapping
from datetime import UTC, datetime
from decimal import Decimal
from typing import Protocol

from backend.errors import ConflictError
from backend.schemas import (
    ALLOWED_STATUS_TRANSITIONS,
    Order,
    OrderInput,
    OrderItem,
    OrderStatus,
    Product,
    ProductInput,
    StoredCustomer,
)

CENT = Decimal("0.01")
_ID_ALPHABET = string.ascii_uppercase + string.digits


class Store(Protocol):
    async def list_products(self, *, include_inactive: bool) -> list[Product]: ...
    async def get_product(self, product_id: str) -> Product: ...
    async def create_product(self, data: ProductInput) -> Product: ...
    async def replace_product(self, product_id: str, data: ProductInput) -> Product: ...
    async def delete_product(self, product_id: str) -> None: ...

    async def list_orders(self) -> list[Order]: ...
    async def list_orders_for_customer(self, customer_id: str) -> list[Order]:
        """The customer's own orders, newest first."""
        ...

    async def get_order(self, order_id: str) -> Order: ...
    async def create_order(self, data: OrderInput, *, customer_id: str) -> Order: ...
    async def update_order_status(self, order_id: str, new_status: OrderStatus) -> Order: ...

    async def create_customer(self, customer: StoredCustomer) -> None:
        """Raises ConflictError when the email is already registered."""
        ...

    async def get_customer_by_email(self, email: str) -> StoredCustomer | None: ...


def new_product_id() -> str:
    return f"p-{secrets.token_hex(6)}"


def new_order_id() -> str:
    """Hard-to-guess id like "AO-MH2K3J1-7XQ2P": the order page is reachable by id alone."""
    stamp = _base36(int(time.time() * 1000))
    rand = "".join(secrets.choice(_ID_ALPHABET) for _ in range(5))
    return f"AO-{stamp}-{rand}"


def _base36(n: int) -> str:
    out = ""
    while n:
        n, r = divmod(n, 36)
        out = _ID_ALPHABET[r + 26 if r < 10 else r - 10] + out
    return out or "0"


def merge_quantities(data: OrderInput) -> dict[str, int]:
    """The same product listed twice counts as one line with the summed quantity."""
    quantities = Counter[str]()
    for line in data.items:
        quantities[line.product_id] += line.quantity
    return dict(quantities)


def build_order(
    data: OrderInput, quantities: Mapping[str, int], products: Mapping[str, Product], *, customer_id: str
) -> Order:
    """Validate every line against current product data and price the order on the server.

    Raises ConflictError (409) for a missing/inactive product or not enough stock.
    """
    items: list[OrderItem] = []
    for product_id, quantity in quantities.items():
        product = products.get(product_id)
        if product is None or not product.is_active:
            name = product.name if product else "บางรายการ"
            raise ConflictError(f"สินค้า{name}ไม่พร้อมขายแล้ว")
        if quantity > product.stock:
            raise ConflictError(f"{product.name} มีในสต็อกเพียง {product.stock} {product.unit}")
        items.append(
            OrderItem(
                product_id=product.id,
                name=product.name,
                price=product.price,
                unit=product.unit,
                quantity=quantity,
            )
        )

    total = sum((i.price * i.quantity for i in items), Decimal(0)).quantize(CENT)
    return Order(
        id=new_order_id(),
        customer_id=customer_id,
        customer=data.customer,
        items=items,
        total=total,
        status=OrderStatus.PENDING,
        payment_method=data.payment_method,
        note=data.note or None,
        created_at=datetime.now(UTC),
    )


EMAIL_TAKEN = "อีเมลนี้มีบัญชีอยู่แล้ว กรุณาเข้าสู่ระบบ"


def check_transition(current: OrderStatus, new_status: OrderStatus) -> None:
    if not ALLOWED_STATUS_TRANSITIONS[current]:
        raise ConflictError("คำสั่งซื้อนี้ปิดแล้ว เปลี่ยนสถานะไม่ได้")
    if new_status not in ALLOWED_STATUS_TRANSITIONS[current]:
        raise ConflictError(f"เปลี่ยนสถานะจาก {current} เป็น {new_status} ไม่ได้")


def sort_products(products: list[Product]) -> list[Product]:
    return sorted(products, key=lambda p: (p.category, p.name))


def sort_orders(orders: list[Order]) -> list[Order]:
    return sorted(orders, key=lambda o: (o.created_at, o.id), reverse=True)
