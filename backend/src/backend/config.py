from functools import lru_cache
from typing import Literal

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """App configuration, read from environment variables or `backend/.env`.

    AWS credentials (AWS_PROFILE, AWS_ACCESS_KEY_ID, ...) are read by boto3
    directly; only the settings the app itself needs are listed here.
    """

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # "memory" keeps data in process memory (lost on restart); "dynamodb" uses AWS.
    store: Literal["memory", "dynamodb"] = "dynamodb"

    aws_region: str = "ap-southeast-1"
    # Set to e.g. http://localhost:4566 to use a local AWS emulator (moto server).
    aws_endpoint_url: str | None = None

    products_table: str = "aof-products"
    orders_table: str = "aof-orders"
    customers_table: str = "aof-customers"

    images_bucket: str = "aof-product-images"
    # Public base URL for uploaded images, e.g. a CloudFront domain.
    # Defaults to the bucket's own URL.
    images_public_base_url: str | None = None
    max_image_bytes: int = 5 * 1024 * 1024

    cors_origins: list[str] = Field(default=["http://localhost:3000", "http://localhost:3001"])

    admin_username: str = "admin"
    # No default: admin login is refused until a password is configured.
    admin_password: SecretStr | None = None
    # No default: a random secret is generated at startup (tokens then stop
    # working after a restart). Set it in production, e.g. from Secrets Manager.
    jwt_secret: SecretStr | None = Field(default=None, min_length=32)
    jwt_expire_minutes: int = 8 * 60
    # Customers stay signed in longer than admins.
    customer_token_days: int = 7

    @property
    def images_base_url(self) -> str:
        if self.images_public_base_url:
            return self.images_public_base_url.rstrip("/")
        if self.aws_endpoint_url:
            return f"{self.aws_endpoint_url.rstrip('/')}/{self.images_bucket}"
        return f"https://{self.images_bucket}.s3.{self.aws_region}.amazonaws.com"


@lru_cache
def get_settings() -> Settings:
    return Settings()
