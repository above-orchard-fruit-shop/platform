import uvicorn


def main() -> None:
    uvicorn.run("backend.main:create_app", factory=True, host="0.0.0.0", port=8000, reload=True)
