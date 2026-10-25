from typing import TYPE_CHECKING, Any, Literal, overload

import boto3
from botocore.config import Config

from backend.config import Settings

if TYPE_CHECKING:
    from mypy_boto3_dynamodb.client import DynamoDBClient
    from mypy_boto3_s3.client import S3Client


@overload
def client(service: Literal["dynamodb"], settings: Settings) -> "DynamoDBClient": ...
@overload
def client(service: Literal["s3"], settings: Settings) -> "S3Client": ...
def client(service: Literal["dynamodb", "s3"], settings: Settings) -> Any:
    """Create a boto3 client. Credentials come from the usual AWS chain (profile, env, IAM role)."""
    kwargs: dict[str, Any] = {"region_name": settings.aws_region}
    if settings.aws_endpoint_url:
        # Local emulator: it accepts any credentials, and path-style S3 URLs
        # (http://localhost:4566/<bucket>/...) avoid needing wildcard DNS.
        kwargs |= {
            "endpoint_url": settings.aws_endpoint_url,
            "aws_access_key_id": "local",
            "aws_secret_access_key": "local",
            "config": Config(s3={"addressing_style": "path"}),
        }
    return boto3.client(service, **kwargs)
