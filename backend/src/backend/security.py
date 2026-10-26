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

    @property
    def settings(self) -> Settings:
        return self._settings

    def check_admin_credentials(self, username: str, password: str) -> bool:
        expected = self._settings.admin_password
        # With Cognito, admins sign in there; local password login stays off.
        if expected is None or self._settings.admin_auth == "cognito":
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


def _gateway_claims(request: Request) -> dict[str, Any] | None:
    """JWT claims API Gateway already verified (HTTP API JWT authorizer), via Mangum's scope."""
    event = request.scope.get("aws.event")
    if not isinstance(event, dict):
        return None
    try:
        claims = event["requestContext"]["authorizer"]["jwt"]["claims"]
    except (KeyError, TypeError):
        return None
    return claims if isinstance(claims, dict) else None


def _claim_groups(value: object) -> set[str]:
    """`cognito:groups` arrives as a list, or as a string like "[admin editors]" from HTTP API."""
    if isinstance(value, list):
        return {str(v) for v in value}
    if isinstance(value, str):
        return {g for g in value.strip("[]").replace(",", " ").split() if g}
    return set()


def require_admin(request: Request, tokens: TokenServiceDep, credentials: BearerDep) -> str:
    settings = tokens.settings
    if settings.admin_auth == "cognito":
        # The signature was checked by API Gateway; a request that bypassed the
        # authorizer (e.g. a route without it) has no claims and is refused here.
        gw_claims = _gateway_claims(request)
        if gw_claims is None or settings.admin_group not in _claim_groups(gw_claims.get("cognito:groups")):
            raise _unauthorized("กรุณาเข้าสู่ระบบผู้ดูแล")
        username = gw_claims.get("cognito:username") or gw_claims.get("sub")
        return str(username)

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
