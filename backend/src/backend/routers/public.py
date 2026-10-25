"""Storefront endpoints: no login required."""

from fastapi import APIRouter, status

from backend.dependencies import StoreDep
from backend.errors import NotFoundError
from backend.schemas import Order, OrderInput, Product
from backend.security import CustomerDep

router = APIRouter(tags=["storefront"])


@router.get("/products", summary="List products on sale")
async def list_products(store: StoreDep) -> list[Product]:
    return await store.list_products(include_inactive=False)


@router.get(
    "/products/{product_id}",
    summary="Get a product",
    responses={status.HTTP_404_NOT_FOUND: {"description": "Missing or hidden from the storefront"}},
)
async def get_product(product_id: str, store: StoreDep) -> Product:
    product = await store.get_product(product_id)
    if not product.is_active:
        raise NotFoundError("ไม่พบสินค้านี้")
    return product


@router.post(
    "/orders",
    status_code=status.HTTP_201_CREATED,
    summary="Place an order (customer login required)",
    description=(
        "Requires `Authorization: Bearer <token>` from /customers/login or /customers/register. "
        "Prices and total are computed on the server from current product data; stock is deducted atomically."
    ),
    responses={
        status.HTTP_401_UNAUTHORIZED: {"description": "Not signed in as a customer"},
        status.HTTP_409_CONFLICT: {"description": "A product is unavailable or out of stock"},
        status.HTTP_422_UNPROCESSABLE_CONTENT: {"description": "Invalid customer details or items"},
    },
)
async def create_order(payload: OrderInput, store: StoreDep, customer: CustomerDep) -> Order:
    return await store.create_order(payload, customer_id=customer.id)


@router.get(
    "/orders/{order_id}",
    summary="Track an order",
    responses={status.HTTP_404_NOT_FOUND: {"description": "Order not found"}},
)
async def get_order(order_id: str, store: StoreDep) -> Order:
    return await store.get_order(order_id)
