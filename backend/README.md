# backend

FastAPI service for the Above Orchard Fruit Shop platform. Serves the customer-facing storefront and the shop admin dashboard. Data lives in DynamoDB, product photos in S3, and admin routes require a JWT from `/auth/login`. The endpoint contract is in [API.md](../API.md).

## Requirements

- Python 3.11+
- [uv](https://docs.astral.sh/uv/)

## Run locally (no AWS account needed)

A local AWS emulator ([moto](https://docs.getmoto.org/) server) stands in for DynamoDB and S3.

```bash
uv sync
cp .env.example .env          # then set ADMIN_PASSWORD and JWT_SECRET
uv run moto_server -p 4566    # terminal 1: local DynamoDB + S3 (data is lost when it stops)
uv run aws-setup --seed --public-images   # once per emulator start: tables, bucket, starter products
uv run backend                # terminal 2: API on http://localhost:8000
```

Open [http://localhost:8000/docs](http://localhost:8000/docs) for the interactive API docs.

Quickest option without the emulator: set `STORE=memory` in `.env` and run only `uv run backend`. Products start empty, data is lost on restart, and image upload doesn't work (it needs S3).

Point both frontends at the API with `NEXT_PUBLIC_API_URL=http://localhost:8000` in `frontend/.env.local` and `frontend-admin/.env.local`, then restart `npm run dev`.

## Run against AWS

1. Configure credentials (`aws configure`, or an IAM role when deployed).
2. In `.env`, remove `AWS_ENDPOINT_URL`, set `AWS_REGION`, and pick globally unique `IMAGES_BUCKET`.
3. `uv run aws-setup --seed` creates the two DynamoDB tables (on-demand billing) and the S3 bucket with CORS for the frontends.
4. Make images readable: either serve the bucket through CloudFront (recommended) and set `IMAGES_PUBLIC_BASE_URL`, or add `--public-images` to make only `products/*` public.

In production keep `JWT_SECRET` and `ADMIN_PASSWORD` in AWS Secrets Manager (or SSM Parameter Store) and expose them to the app as environment variables.

## How it fits together

| Module | Role |
|--------|------|
| `routers/public.py` | Storefront: products on sale, place and track orders |
| `routers/auth.py` | `POST /auth/login` → admin JWT |
| `routers/admin.py` | `/admin/*`: product CRUD, order status, image upload ticket. Every route checks the token |
| `stores/dynamodb.py` | DynamoDB tables `aof-products` / `aof-orders`. Orders use `TransactWriteItems` with `stock >= :qty` so the last item can't be sold twice |
| `stores/memory.py` | Same behaviour in memory (`STORE=memory`, used by tests) |
| `images.py` | Signs an S3 presigned POST so the browser uploads photos straight to S3 |
| `aws_setup.py` | `uv run aws-setup`: creates tables and bucket |

## Tests

```bash
uv run pytest
```

Store tests run twice: against the in-memory store and against DynamoDB mocked by moto.

## Adding Dependencies

```bash
uv add <package>
```
