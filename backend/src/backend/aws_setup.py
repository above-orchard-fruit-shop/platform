"""Create the DynamoDB tables and S3 bucket the API needs.

    uv run aws-setup                 # tables + bucket (safe to re-run)
    uv run aws-setup --seed          # also load the starter catalogue if empty
    uv run aws-setup --public-images # allow public read of products/* (no CloudFront)

Uses the same settings as the API (backend/.env), so with AWS_ENDPOINT_URL set it
targets the local emulator instead of your AWS account.
"""

import argparse
import json

from botocore.exceptions import ClientError

from backend import aws
from backend.config import Settings, get_settings
from backend.seed import SEED_PRODUCTS
from backend.stores.dynamodb import _to_item


def create_tables(settings: Settings) -> None:
    db = aws.client("dynamodb", settings)
    existing = set(db.list_tables()["TableNames"])
    for table in (settings.products_table, settings.orders_table):
        if table in existing:
            print(f"table {table}: exists")
            continue
        db.create_table(
            TableName=table,
            AttributeDefinitions=[{"AttributeName": "id", "AttributeType": "S"}],
            KeySchema=[{"AttributeName": "id", "KeyType": "HASH"}],
            BillingMode="PAY_PER_REQUEST",
        )
        db.get_waiter("table_exists").wait(TableName=table)
        print(f"table {table}: created")


def seed_products(settings: Settings) -> None:
    db = aws.client("dynamodb", settings)
    if db.scan(TableName=settings.products_table, Limit=1, Select="COUNT")["Count"] > 0:
        print("seed: products table is not empty, skipped")
        return
    for product in SEED_PRODUCTS:
        db.put_item(TableName=settings.products_table, Item=_to_item(product.model_dump(mode="python")))
    print(f"seed: added {len(SEED_PRODUCTS)} products")


def create_bucket(settings: Settings, *, public_images: bool) -> None:
    s3 = aws.client("s3", settings)
    bucket = settings.images_bucket
    try:
        s3.head_bucket(Bucket=bucket)
        print(f"bucket {bucket}: exists")
    except ClientError:
        if settings.aws_region == "us-east-1":
            s3.create_bucket(Bucket=bucket)
        else:
            s3.create_bucket(
                Bucket=bucket,
                CreateBucketConfiguration={"LocationConstraint": settings.aws_region},  # type: ignore[typeddict-item]
            )
        print(f"bucket {bucket}: created")

    # Browsers upload directly to S3 (presigned POST), so the bucket must allow
    # the admin site's origin.
    s3.put_bucket_cors(
        Bucket=bucket,
        CORSConfiguration={
            "CORSRules": [
                {
                    "AllowedOrigins": settings.cors_origins,
                    "AllowedMethods": ["POST", "GET"],
                    "AllowedHeaders": ["*"],
                    "MaxAgeSeconds": 3000,
                }
            ]
        },
    )
    print(f"bucket {bucket}: CORS allows {', '.join(settings.cors_origins)}")

    if public_images:
        # Only product images become public, not the whole bucket. In production
        # prefer CloudFront with Origin Access Control and keep the bucket private.
        s3.put_public_access_block(
            Bucket=bucket,
            PublicAccessBlockConfiguration={
                "BlockPublicAcls": True,
                "IgnorePublicAcls": True,
                "BlockPublicPolicy": False,
                "RestrictPublicBuckets": False,
            },
        )
        policy = {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Sid": "PublicReadProductImages",
                    "Effect": "Allow",
                    "Principal": "*",
                    "Action": "s3:GetObject",
                    "Resource": f"arn:aws:s3:::{bucket}/products/*",
                }
            ],
        }
        s3.put_bucket_policy(Bucket=bucket, Policy=json.dumps(policy))
        print(f"bucket {bucket}: products/* is publicly readable")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--seed", action="store_true", help="load starter products into an empty table")
    parser.add_argument("--public-images", action="store_true", help="make products/* in the bucket public")
    args = parser.parse_args()

    settings = get_settings()
    target = settings.aws_endpoint_url or f"AWS account (region {settings.aws_region})"
    print(f"target: {target}")
    create_tables(settings)
    create_bucket(settings, public_images=args.public_images)
    if args.seed:
        seed_products(settings)


if __name__ == "__main__":
    main()
