import hmac
import secrets
from datetime import UTC, datetime, timedelta
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from backend.config import Settings

ALGORITHM = "HS256"
ADMIN_ROLE = "admin"

_bearer = HTTPBearer(auto_error=False, description="Admin access token from POST /auth/login")


class TokenService:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        configured = settings.jwt_secret.get_secret_value() if settings.jwt_secret else ""
        self._secret = configured or secrets.token_urlsafe(32)

    def check_credentials(self, username: str, password: str) -> bool:
        expected = self._settings.admin_password
        if expected is None:
            return False
        # compare_digest avoids leaking how many characters matched via timing.
        user_ok = hmac.compare_digest(username.encode(), self._settings.admin_username.encode())
        pass_ok = hmac.compare_digest(password.encode(), expected.get_secret_value().encode())
        return user_ok and pass_ok

    def issue(self, username: str) -> str:
        now = datetime.now(UTC)
        payload = {
            "sub": username,
            "role": ADMIN_ROLE,
            "iat": now,
            "exp": now + timedelta(minutes=self._settings.jwt_expire_minutes),
        }
        return jwt.encode(payload, self._secret, algorithm=ALGORITHM)

    def verify_admin(self, token: str) -> str | None:
        """Return the username for a valid admin token, otherwise None."""
        try:
            payload = jwt.decode(
                token, self._secret, algorithms=[ALGORITHM], options={"require": ["exp", "sub"]}
            )
        except jwt.PyJWTError:
            return None
        if payload.get("role") != ADMIN_ROLE:
            return None
        sub = payload["sub"]
        return sub if isinstance(sub, str) else None


def get_token_service(request: Request) -> TokenService:
    service: TokenService = request.app.state.tokens
    return service


TokenServiceDep = Annotated[TokenService, Depends(get_token_service)]


def require_admin(
    tokens: TokenServiceDep,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
) -> str:
    username = tokens.verify_admin(credentials.credentials) if credentials else None
    if username is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="กรุณาเข้าสู่ระบบผู้ดูแล",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return username


AdminDep = Annotated[str, Depends(require_admin)]
