"""Customer accounts: sign up, sign in, order history. A customer token is required to place an order."""

import asyncio
import secrets

from fastapi import APIRouter, HTTPException, status

from backend.dependencies import StoreDep
from backend.passwords import DUMMY_HASH, hash_password, verify_password
from backend.schemas import (
    CustomerAccount,
    CustomerLogin,
    CustomerRegister,
    CustomerSession,
    Order,
    StoredCustomer,
)
from backend.security import CustomerDep, CustomerIdentity, TokenServiceDep

router = APIRouter(prefix="/customers", tags=["customers"])


def _session(tokens: TokenServiceDep, customer: CustomerAccount) -> CustomerSession:
    token = tokens.issue_customer(CustomerIdentity(id=customer.id, email=customer.email))
    return CustomerSession(access_token=token, customer=CustomerAccount.model_validate(customer.model_dump()))


@router.post(
    "/register",
    status_code=status.HTTP_201_CREATED,
    summary="Create a customer account and sign in",
    responses={status.HTTP_409_CONFLICT: {"description": "Email already registered"}},
)
async def register(payload: CustomerRegister, store: StoreDep, tokens: TokenServiceDep) -> CustomerSession:
    # scrypt is deliberately slow; keep it off the event loop.
    password_hash = await asyncio.to_thread(hash_password, payload.password)
    customer = StoredCustomer(
        id=f"c-{secrets.token_hex(6)}",
        name=payload.name,
        email=payload.email,
        phone=payload.phone,
        password_hash=password_hash,
    )
    await store.create_customer(customer)
    return _session(tokens, customer)


@router.post(
    "/login",
    summary="Customer login",
    responses={status.HTTP_401_UNAUTHORIZED: {"description": "Wrong email or password"}},
)
async def login(payload: CustomerLogin, store: StoreDep, tokens: TokenServiceDep) -> CustomerSession:
    customer = await store.get_customer_by_email(payload.email)
    stored_hash = customer.password_hash if customer else DUMMY_HASH
    password_ok = await asyncio.to_thread(verify_password, payload.password, stored_hash)
    if customer is None or not password_ok:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="อีเมลหรือรหัสผ่านไม่ถูกต้อง")
    return _session(tokens, customer)


@router.get(
    "/me/orders",
    summary="My order history, newest first",
    responses={status.HTTP_401_UNAUTHORIZED: {"description": "Not signed in as a customer"}},
)
async def my_orders(store: StoreDep, customer: CustomerDep) -> list[Order]:
    return await store.list_orders_for_customer(customer.id)
