from fastapi import FastAPI, Request, status
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


class DomainError(Exception):
    """Base for business-rule errors; each subclass maps to one HTTP status.

    `detail` is shown to the user by the frontends, so it is written in Thai.
    """

    status_code: int = status.HTTP_400_BAD_REQUEST

    def __init__(self, detail: str) -> None:
        super().__init__(detail)
        self.detail = detail


class NotFoundError(DomainError):
    status_code = status.HTTP_404_NOT_FOUND


class ConflictError(DomainError):
    """Inactive product, not enough stock, invalid status change, concurrent edit."""

    status_code = status.HTTP_409_CONFLICT


class PayloadTooLargeError(DomainError):
    status_code = status.HTTP_413_CONTENT_TOO_LARGE


async def _handle_domain_error(_: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, DomainError)
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


async def _handle_validation_error(_: Request, exc: Exception) -> JSONResponse:
    # API.md: `detail` is a message string. The field-level list stays under `errors`.
    assert isinstance(exc, RequestValidationError)
    errors = exc.errors()
    fields = sorted({".".join(str(p) for p in e["loc"][1:]) or "body" for e in errors})
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        content={
            "detail": f"ข้อมูลไม่ถูกต้อง: {', '.join(fields)}",
            "errors": jsonable_encoder(errors),
        },
    )


def register_error_handlers(app: FastAPI) -> None:
    app.add_exception_handler(DomainError, _handle_domain_error)
    app.add_exception_handler(RequestValidationError, _handle_validation_error)
