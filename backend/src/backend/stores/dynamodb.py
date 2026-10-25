"""DynamoDB-backed store.

Two tables, both keyed by a string `id`:
- products: one item per product
- orders:   one item per order (customer and line items embedded)

Placing and cancelling an order use TransactWriteItems so stock changes and the
order write succeed or fail together, and a ConditionExpression (`stock >= :qty`)
stops two customers from buying the last item at the same time.

Listing uses Scan, which is fine for a small shop catalogue. Add a GSI (e.g. on
status + created_at) when the orders table grows large.

boto3 is synchronous, so each call runs in a worker thread via asyncio.to_thread
to keep the event loop free.
"""

import asyncio
from datetime import datetime
from typing import TYPE_CHECKING, Any

from boto3.dynamodb.types import TypeDeserializer, TypeSerializer
from botocore.exceptions import ClientError

if TYPE_CHECKING:
    from mypy_boto3_dynamodb.client import DynamoDBClient

from backend.errors import ConflictError, NotFoundError
from backend.schemas import Order, OrderInput, OrderStatus, Product, ProductInput
from backend.stores.base import (
    build_order,
    check_transition,
    merge_quantities,
    new_product_id,
    sort_orders,
    sort_products,
)

_serializer = TypeSerializer()
_deserializer = TypeDeserializer()

Item = dict[str, Any]


def _to_item(data: dict[str, Any]) -> Item:
    return {k: _serializer.serialize(v) for k, v in data.items()}


def _from_item(item: Item) -> dict[str, Any]:
    return {k: _deserializer.deserialize(v) for k, v in item.items()}


def _values(**values: Any) -> Item:
    return {f":{k}": _serializer.serialize(v) for k, v in values.items()}


def _order_to_item(order: Order) -> Item:
    data = order.model_dump(mode="python")
    data["created_at"] = order.created_at.isoformat()
    data["status"] = order.status.value
    return _to_item(data)


def _order_from_item(item: Item) -> Order:
    data = _from_item(item)
    data["created_at"] = datetime.fromisoformat(data["created_at"])
    return Order.model_validate(data)


def _is_condition_failure(err: ClientError) -> bool:
    return err.response["Error"]["Code"] in {"ConditionalCheckFailedException", "TransactionCanceledException"}


class DynamoDBStore:
    def __init__(self, client: "DynamoDBClient", *, products_table: str, orders_table: str) -> None:
        self._db = client
        self._products = products_table
        self._orders = orders_table

    # --- products -----------------------------------------------------------

    async def list_products(self, *, include_inactive: bool) -> list[Product]:
        products = [Product.model_validate(_from_item(i)) for i in await self._scan(self._products)]
        return sort_products([p for p in products if include_inactive or p.is_active])

    async def get_product(self, product_id: str) -> Product:
        product = (await self._get_products([product_id])).get(product_id)
        if product is None:
            raise NotFoundError("ไม่พบสินค้านี้")
        return product

    async def create_product(self, data: ProductInput) -> Product:
        product = Product(id=new_product_id(), **data.model_dump())
        await asyncio.to_thread(
            self._db.put_item,
            TableName=self._products,
            Item=_to_item(product.model_dump(mode="python")),
            ConditionExpression="attribute_not_exists(id)",
        )
        return product

    async def replace_product(self, product_id: str, data: ProductInput) -> Product:
        product = Product(id=product_id, **data.model_dump())
        try:
            await asyncio.to_thread(
                self._db.put_item,
                TableName=self._products,
                Item=_to_item(product.model_dump(mode="python")),
                ConditionExpression="attribute_exists(id)",
            )
        except ClientError as err:
            if _is_condition_failure(err):
                raise NotFoundError("ไม่พบสินค้านี้") from err
            raise
        return product

    async def delete_product(self, product_id: str) -> None:
        try:
            await asyncio.to_thread(
                self._db.delete_item,
                TableName=self._products,
                Key=_to_item({"id": product_id}),
                ConditionExpression="attribute_exists(id)",
            )
        except ClientError as err:
            if _is_condition_failure(err):
                raise NotFoundError("ไม่พบสินค้านี้") from err
            raise

    # --- orders -------------------------------------------------------------

    async def list_orders(self) -> list[Order]:
        return sort_orders([_order_from_item(i) for i in await self._scan(self._orders)])

    async def get_order(self, order_id: str) -> Order:
        res = await asyncio.to_thread(
            self._db.get_item,
            TableName=self._orders,
            Key=_to_item({"id": order_id}),
            ConsistentRead=True,
        )
        if "Item" not in res:
            raise NotFoundError("ไม่พบคำสั่งซื้อนี้")
        return _order_from_item(res["Item"])

    async def create_order(self, data: OrderInput) -> Order:
        quantities = merge_quantities(data)
        products = await self._get_products(list(quantities))
        order = build_order(data, quantities, products)

        # Each stock update re-checks, inside the transaction, what build_order
        # checked above, so a concurrent order or admin edit can't slip in between.
        writes: list[Any] = [
            {
                "Update": {
                    "TableName": self._products,
                    "Key": _to_item({"id": item.product_id}),
                    "UpdateExpression": "SET stock = stock - :qty",
                    "ConditionExpression": "is_active = :active AND stock >= :qty AND price = :price",
                    "ExpressionAttributeValues": _values(qty=item.quantity, active=True, price=item.price),
                }
            }
            for item in order.items
        ]
        writes.append(
            {
                "Put": {
                    "TableName": self._orders,
                    "Item": _order_to_item(order),
                    "ConditionExpression": "attribute_not_exists(id)",
                }
            }
        )

        try:
            await asyncio.to_thread(self._db.transact_write_items, TransactItems=writes)
        except ClientError as err:
            if not _is_condition_failure(err):
                raise
            # Something changed after we read the products. Re-validate against
            # fresh data to report the precise reason (sold out, hidden, ...).
            build_order(data, quantities, await self._get_products(list(quantities)))
            raise ConflictError("ข้อมูลสินค้ามีการเปลี่ยนแปลง กรุณาลองใหม่อีกครั้ง") from err
        return order

    async def update_order_status(self, order_id: str, new_status: OrderStatus) -> Order:
        order = await self.get_order(order_id)
        check_transition(order.status, new_status)

        writes: list[Any] = [
            {
                "Update": {
                    "TableName": self._orders,
                    "Key": _to_item({"id": order_id}),
                    "UpdateExpression": "SET #status = :new",
                    # Fails if someone else changed the status since we read it.
                    "ConditionExpression": "#status = :old",
                    "ExpressionAttributeNames": {"#status": "status"},
                    "ExpressionAttributeValues": _values(new=new_status.value, old=order.status.value),
                }
            }
        ]
        if new_status is OrderStatus.CANCELLED:
            # Return stock, skipping products deleted since the order was placed.
            existing = await self._get_products([i.product_id for i in order.items])
            writes += [
                {
                    "Update": {
                        "TableName": self._products,
                        "Key": _to_item({"id": item.product_id}),
                        "UpdateExpression": "SET stock = stock + :qty",
                        "ConditionExpression": "attribute_exists(id)",
                        "ExpressionAttributeValues": _values(qty=item.quantity),
                    }
                }
                for item in order.items
                if item.product_id in existing
            ]

        try:
            await asyncio.to_thread(self._db.transact_write_items, TransactItems=writes)
        except ClientError as err:
            if _is_condition_failure(err):
                raise ConflictError("คำสั่งซื้อนี้มีการเปลี่ยนแปลง กรุณาโหลดหน้าใหม่") from err
            raise
        return order.model_copy(update={"status": new_status})

    # --- helpers ------------------------------------------------------------

    async def _scan(self, table: str) -> list[Item]:
        def scan_all() -> list[Item]:
            items: list[Item] = []
            for page in self._db.get_paginator("scan").paginate(TableName=table, ConsistentRead=True):
                items.extend(page["Items"])
            return items

        return await asyncio.to_thread(scan_all)

    async def _get_products(self, ids: list[str]) -> dict[str, Product]:
        """Fetch products by id with strongly consistent reads; missing ids are left out."""

        def batch_get() -> list[Item]:
            found: list[Item] = []
            # BatchGetItem accepts up to 100 keys; orders are capped at 50 lines.
            pending: Any = {
                self._products: {"Keys": [_to_item({"id": i}) for i in set(ids)], "ConsistentRead": True}
            }
            while pending:
                res = self._db.batch_get_item(RequestItems=pending)
                found.extend(res["Responses"].get(self._products, []))
                pending = res.get("UnprocessedKeys") or None
            return found

        if not ids:
            return {}
        items = await asyncio.to_thread(batch_get)
        products = [Product.model_validate(_from_item(i)) for i in items]
        return {p.id: p for p in products}
