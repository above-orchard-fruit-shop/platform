"""AWS Lambda entry point: API Gateway (HTTP API, payload v2) → FastAPI via Mangum.

CloudFront forwards /api/* to API Gateway unchanged, so the /api prefix is
stripped here and the app keeps its local routes (/products, /admin/...).

Besides HTTP events, the deploy script invokes the function directly with
{"action": "seed"} to load the starter catalogue: the function runs inside the
VPC and is the only thing that needs to reach DynamoDB.
"""

import logging
from typing import Any

from mangum import Mangum

from backend.aws_setup import seed_products
from backend.config import get_settings
from backend.main import create_app

logging.getLogger().setLevel(logging.INFO)

API_BASE_PATH = "/api"

_asgi = Mangum(create_app(), lifespan="off", api_gateway_base_path=API_BASE_PATH)


def handler(event: dict[str, Any], context: Any) -> Any:
    if event.get("action") == "seed":
        seed_products(get_settings())
        return {"status": "seeded"}
    return _asgi(event, context)
