import asyncio

from backend.errors import ConflictError, NotFoundError
from backend.schemas import Order, OrderInput, OrderStatus, Product, ProductInput, StoredCustomer
from backend.stores.base import (
    EMAIL_TAKEN,
    build_order,
    check_transition,
    merge_quantities,
    new_product_id,
    sort_orders,
    sort_products,
)


class InMemoryStore:
    """Keeps everything in process memory (lost on restart). Used by tests and `STORE=memory`."""

    def __init__(self, products: list[Product] | None = None) -> None:
        self._products: dict[str, Product] = {p.id: p for p in products or []}
        self._orders: dict[str, Order] = {}
        self._customers: dict[str, StoredCustomer] = {}  # keyed by email
        # Placing/cancelling an order reads and writes stock across several
        # products; the lock keeps that all-or-nothing.
        self._lock = asyncio.Lock()

    async def list_products(self, *, include_inactive: bool) -> list[Product]:
        products = [p for p in self._products.values() if include_inactive or p.is_active]
        return [p.model_copy() for p in sort_products(products)]

    async def get_product(self, product_id: str) -> Product:
        return self._require_product(product_id).model_copy()

    async def create_product(self, data: ProductInput) -> Product:
        product = Product(id=new_product_id(), **data.model_dump())
        async with self._lock:
            self._products[product.id] = product
        return product.model_copy()

    async def replace_product(self, product_id: str, data: ProductInput) -> Product:
        async with self._lock:
            self._require_product(product_id)
            product = Product(id=product_id, **data.model_dump())
            self._products[product_id] = product
        return product.model_copy()

    async def delete_product(self, product_id: str) -> None:
        async with self._lock:
            self._require_product(product_id)
            del self._products[product_id]

    async def list_orders(self) -> list[Order]:
        return [o.model_copy(deep=True) for o in sort_orders(list(self._orders.values()))]

    async def list_orders_for_customer(self, customer_id: str) -> list[Order]:
        mine = [o for o in self._orders.values() if o.customer_id == customer_id]
        return [o.model_copy(deep=True) for o in sort_orders(mine)]

    async def get_order(self, order_id: str) -> Order:
        return self._require_order(order_id).model_copy(deep=True)

    async def create_order(self, data: OrderInput, *, customer_id: str) -> Order:
        quantities = merge_quantities(data)
        async with self._lock:
            order = build_order(data, quantities, self._products, customer_id=customer_id)
            for item in order.items:
                product = self._products[item.product_id]
                self._products[item.product_id] = product.model_copy(update={"stock": product.stock - item.quantity})
            self._orders[order.id] = order
        return order.model_copy(deep=True)

    async def update_order_status(self, order_id: str, new_status: OrderStatus) -> Order:
        async with self._lock:
            order = self._require_order(order_id)
            check_transition(order.status, new_status)
            if new_status is OrderStatus.CANCELLED:
                # Return stock, skipping products deleted since the order was placed.
                for item in order.items:
                    product = self._products.get(item.product_id)
                    if product is not None:
                        self._products[item.product_id] = product.model_copy(
                            update={"stock": product.stock + item.quantity}
                        )
            updated = order.model_copy(update={"status": new_status})
            self._orders[order_id] = updated
        return updated.model_copy(deep=True)

    async def create_customer(self, customer: StoredCustomer) -> None:
        async with self._lock:
            if customer.email in self._customers:
                raise ConflictError(EMAIL_TAKEN)
            self._customers[customer.email] = customer.model_copy()

    async def get_customer_by_email(self, email: str) -> StoredCustomer | None:
        customer = self._customers.get(email)
        return customer.model_copy() if customer else None

    def _require_product(self, product_id: str) -> Product:
        product = self._products.get(product_id)
        if product is None:
            raise NotFoundError("ไม่พบสินค้านี้")
        return product

    def _require_order(self, order_id: str) -> Order:
        order = self._orders.get(order_id)
        if order is None:
            raise NotFoundError("ไม่พบคำสั่งซื้อนี้")
        return order
