import uvicorn


def main() -> None:
    uvicorn.run("backend_admin.main:app", host="0.0.0.0", port=8001, reload=True)
