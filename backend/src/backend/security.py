import hmac
import secrets
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Annotated, Any, Literal

import jwt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from backend.config import Settings

ALGORITHM = "HS256"
Role = Literal["admin", "customer"]

_bearer = HTTPBearer(auto_error=False, description="Access token from /auth/login (admin) or /customers/login")


@dataclass(frozen=True)
class CustomerIdentity:
    id: str
    email: str


class TokenService:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        configured = settings.jwt_secret.get_secret_value() if settings.jwt_secret else ""
        self._secret = configured or secrets.token_urlsafe(32)

    def check_admin_credentials(self, username: str, password: str) -> bool:
        expected = self._settings.admin_password
        if expected is None:
            return False
        # compare_digest avoids leaking how many characters matched via timing.
        user_ok = hmac.compare_digest(username.encode(), self._settings.admin_username.encode())
        pass_ok = hmac.compare_digest(password.encode(), expected.get_secret_value().encode())
        return user_ok and pass_ok

    def issue_admin(self, username: str) -> str:
        return self._issue(username, "admin", timedelta(minutes=self._settings.jwt_expire_minutes))

    def issue_customer(self, customer: CustomerIdentity) -> str:
        return self._issue(
            customer.id, "customer", timedelta(days=self._settings.customer_token_days), email=customer.email
        )

    def verify(self, token: str, role: Role) -> dict[str, Any] | None:
        """Return the claims of a valid token for `role`, otherwise None."""
        try:
            claims: dict[str, Any] = jwt.decode(
                token, self._secret, algorithms=[ALGORITHM], options={"require": ["exp", "sub"]}
            )
        except jwt.PyJWTError:
            return None
        if claims.get("role") != role or not isinstance(claims["sub"], str):
            return None
        return claims

    def _issue(self, subject: str, role: Role, lifetime: timedelta, **extra: str) -> str:
        now = datetime.now(UTC)
        payload = {"sub": subject, "role": role, "iat": now, "exp": now + lifetime, **extra}
        return jwt.encode(payload, self._secret, algorithm=ALGORITHM)


def get_token_service(request: Request) -> TokenService:
    service: TokenService = request.app.state.tokens
    return service


TokenServiceDep = Annotated[TokenService, Depends(get_token_service)]
BearerDep = Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)]


def _unauthorized(detail: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED, detail=detail, headers={"WWW-Authenticate": "Bearer"}
    )


def require_admin(tokens: TokenServiceDep, credentials: BearerDep) -> str:
    claims = tokens.verify(credentials.credentials, "admin") if credentials else None
    if claims is None:
        raise _unauthorized("กรุณาเข้าสู่ระบบผู้ดูแล")
    sub: str = claims["sub"]
    return sub


def require_customer(tokens: TokenServiceDep, credentials: BearerDep) -> CustomerIdentity:
    claims = tokens.verify(credentials.credentials, "customer") if credentials else None
    if claims is None or not isinstance(claims.get("email"), str):
        raise _unauthorized("กรุณาเข้าสู่ระบบก่อนสั่งซื้อ")
    return CustomerIdentity(id=claims["sub"], email=claims["email"])


AdminDep = Annotated[str, Depends(require_admin)]
CustomerDep = Annotated[CustomerIdentity, Depends(require_customer)]
