from fastapi import APIRouter, HTTPException, status

from backend.schemas import LoginInput, Token
from backend.security import TokenServiceDep

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/login",
    summary="Admin login",
    responses={status.HTTP_401_UNAUTHORIZED: {"description": "Wrong username or password"}},
)
async def login(payload: LoginInput, tokens: TokenServiceDep) -> Token:
    if not tokens.check_credentials(payload.username, payload.password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง")
    return Token(access_token=tokens.issue(payload.username))
