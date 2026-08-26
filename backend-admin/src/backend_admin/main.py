from fastapi import FastAPI

app = FastAPI(title="backend-admin")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
