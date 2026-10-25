import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend import aws
from backend.config import Settings, get_settings
from backend.errors import register_error_handlers
from backend.images import ImageUploader
from backend.routers import admin, auth, customers, public
from backend.security import TokenService
from backend.stores import DynamoDBStore, InMemoryStore, Store

logger = logging.getLogger(__name__)


def _default_store(settings: Settings) -> Store:
    if settings.store == "memory":
        return InMemoryStore()
    return DynamoDBStore(
        aws.client("dynamodb", settings),
        products_table=settings.products_table,
        orders_table=settings.orders_table,
        customers_table=settings.customers_table,
    )


def create_app(
    settings: Settings | None = None,
    *,
    store: Store | None = None,
    images: ImageUploader | None = None,
) -> FastAPI:
    settings = settings or get_settings()
    if settings.admin_password is None:
        logger.warning("ADMIN_PASSWORD is not set: admin login is disabled")
    if settings.jwt_secret is None:
        logger.warning("JWT_SECRET is not set: using a random secret, admin tokens reset on restart")

    app = FastAPI(title="Above Orchard Fruit Shop API")
    app.state.store = store or _default_store(settings)
    app.state.images = images or ImageUploader(
        aws.client("s3", settings),
        bucket=settings.images_bucket,
        public_base_url=settings.images_base_url,
        max_bytes=settings.max_image_bytes,
    )
    app.state.tokens = TokenService(settings)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
        allow_headers=["Content-Type", "Authorization"],
    )
    register_error_handlers(app)

    @app.get("/health", tags=["health"])
    def health() -> dict[str, str]:
        return {"status": "ok"}

    app.include_router(public.router)
    app.include_router(auth.router)
    app.include_router(customers.router)
    app.include_router(admin.router)
    return app
