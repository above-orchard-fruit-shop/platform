# backend-admin

FastAPI admin service for the Above Orchard Fruit Shop platform. Manages products and orders stored in AWS (DynamoDB / S3) via boto3.

## Requirements

- Python 3.11+
- [uv](https://docs.astral.sh/uv/)

## Getting Started

Install dependencies:

```bash
uv sync
```

Run the dev server:

```bash
uv run backend-admin
# or
uv run uvicorn backend_admin.main:app --reload --port 8001
```

Open [http://localhost:8001/docs](http://localhost:8001/docs) for the interactive API docs, or check [http://localhost:8001/health](http://localhost:8001/health).

## Adding Dependencies

```bash
uv add <package>
```
