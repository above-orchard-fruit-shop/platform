"""Shop admin endpoints. Every route requires a valid admin token."""

from fastapi import APIRouter, Depends, Response, status

from backend.dependencies import StoreDep
from backend.images import ImageUploaderDep
from backend.schemas import (
    ImageUploadRequest,
    ImageUploadTicket,
    Order,
    OrderStatusUpdate,
    Product,
    ProductInput,
)
from backend.security import require_admin

router = APIRouter(
    prefix="/admin",
    tags=["admin"],
    dependencies=[Depends(require_admin)],
    responses={status.HTTP_401_UNAUTHORIZED: {"description": "Missing, invalid or expired admin token"}},
)

PRODUCT_NOT_FOUND = {status.HTTP_404_NOT_FOUND: {"description": "Product not found"}}


@router.get("/products", summary="List all products, including hidden ones")
async def list_products(store: StoreDep) -> list[Product]:
    return await store.list_products(include_inactive=True)


@router.post("/products", status_code=status.HTTP_201_CREATED, summary="Create a product")
async def create_product(payload: ProductInput, store: StoreDep) -> Product:
    return await store.create_product(payload)


@router.put("/products/{product_id}", summary="Replace a product", responses=PRODUCT_NOT_FOUND)
async def replace_product(product_id: str, payload: ProductInput, store: StoreDep) -> Product:
    return await store.replace_product(product_id, payload)


@router.delete(
    "/products/{product_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a product",
    responses=PRODUCT_NOT_FOUND,
)
async def delete_product(product_id: str, store: StoreDep) -> Response:
    await store.delete_product(product_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/orders", summary="List orders, newest first")
async def list_orders(store: StoreDep) -> list[Order]:
    return await store.list_orders()


@router.patch(
    "/orders/{order_id}",
    summary="Change order status",
    description=(
        "pending → confirmed | cancelled, confirmed → shipping | cancelled, "
        "shipping → completed | cancelled. Cancelling returns the items to stock."
    ),
    responses={
        status.HTTP_404_NOT_FOUND: {"description": "Order not found"},
        status.HTTP_409_CONFLICT: {"description": "Transition not allowed"},
    },
)
async def update_order_status(order_id: str, payload: OrderStatusUpdate, store: StoreDep) -> Order:
    return await store.update_order_status(order_id, payload.status)


@router.post(
    "/uploads/product-image",
    summary="Get a presigned S3 upload for a product image",
    description=(
        "POST the returned `fields` followed by the file (field name `file`) as "
        "multipart/form-data to `upload_url`, then save `image_url` on the product."
    ),
    responses={status.HTTP_413_CONTENT_TOO_LARGE: {"description": "File too large"}},
)
async def create_image_upload(payload: ImageUploadRequest, images: ImageUploaderDep) -> ImageUploadTicket:
    return images.presign(payload)
