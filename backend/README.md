# backend

FastAPI service for the Above Orchard Fruit Shop platform. Serves the customer-facing storefront (products, orders) backed by AWS via boto3.

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
uv run backend
# or
uv run uvicorn backend.main:app --reload
```

Open [http://localhost:8000/docs](http://localhost:8000/docs) for the interactive API docs, or check [http://localhost:8000/health](http://localhost:8000/health).

## Adding Dependencies

```bash
uv add <package>
```
