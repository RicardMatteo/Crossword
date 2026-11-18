import re

from asyncpg.exceptions import UniqueViolationError
from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel

from crud import user_crud
from crud.stats_crud import get_stats
from utils.security import hash_password, verify_password

router = APIRouter()

NAME_RE = re.compile(r"^[\w .'-]{2,20}$")  # \w covers accented letters
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
MIN_PASSWORD = 8


class RegisterBody(BaseModel):
    name: str
    email: str
    password: str


class LoginBody(BaseModel):
    email: str
    password: str


class UpdateBody(BaseModel):
    name: str | None = None
    currentPassword: str | None = None
    newPassword: str | None = None


class DeleteBody(BaseModel):
    password: str


def bearer_token(authorization: str | None = Header(None)):
    if authorization and authorization.startswith("Bearer "):
        return authorization[len("Bearer "):]
    return None


async def current_user(token: str | None = Depends(bearer_token)):
    user = await user_crud.get_session_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="not_authenticated")
    return user


async def check_name(name, except_id=None):
    name = name.strip()
    if not NAME_RE.match(name):
        raise HTTPException(status_code=400, detail="invalid_name")
    if await user_crud.name_taken(name, except_id):
        raise HTTPException(status_code=409, detail="name_taken")
    return name


def check_password(password):
    if len(password) < MIN_PASSWORD:
        raise HTTPException(status_code=400, detail="password_too_short")


@router.post("/api/auth/register")
async def register(body: RegisterBody):
    name = await check_name(body.name)
    email = body.email.strip()
    if not EMAIL_RE.match(email) or len(email) > 254:
        raise HTTPException(status_code=400, detail="invalid_email")
    check_password(body.password)
    if await user_crud.get_user_by_email(email):
        raise HTTPException(status_code=409, detail="email_taken")
    try:
        user = await user_crud.create_user(name, email, await hash_password(body.password))
    except UniqueViolationError:
        # Lost a race with another sign-up using the same name or email
        raise HTTPException(status_code=409, detail="name_taken")
    token = await user_crud.create_session(user["id"])
    return {"user": user_crud.public_user(user), "token": token}


@router.post("/api/auth/login")
async def login(body: LoginBody):
    user = await user_crud.get_user_by_email(body.email.strip())
    # Same error whether the email or the password is wrong
    if not user or not await verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="invalid_credentials")
    token = await user_crud.create_session(user["id"])
    return {"user": user_crud.public_user(user), "token": token}


@router.post("/api/auth/logout")
async def logout(token: str | None = Depends(bearer_token)):
    if token:
        await user_crud.delete_session(token)
    return {"ok": True}


@router.get("/api/auth/me")
async def me(user=Depends(current_user)):
    return {"user": user_crud.public_user(user)}


@router.put("/api/user/update")
async def update(body: UpdateBody, user=Depends(current_user), token: str = Depends(bearer_token)):
    name = await check_name(body.name, user["id"]) if body.name is not None else None
    password_hash = None
    if body.newPassword:
        full = await user_crud.get_user_by_id(user["id"])
        if not body.currentPassword or not await verify_password(body.currentPassword, full["password_hash"]):
            raise HTTPException(status_code=403, detail="wrong_password")
        check_password(body.newPassword)
        password_hash = await hash_password(body.newPassword)
    try:
        updated = await user_crud.update_user(user["id"], name, password_hash)
    except UniqueViolationError:
        raise HTTPException(status_code=409, detail="name_taken")
    if password_hash:
        # A new password logs out every other device
        await user_crud.delete_other_sessions(user["id"], token)
    return {"user": user_crud.public_user(updated)}


@router.post("/api/user/delete")
async def delete(body: DeleteBody, user=Depends(current_user)):
    full = await user_crud.get_user_by_id(user["id"])
    if not await verify_password(body.password, full["password_hash"]):
        raise HTTPException(status_code=403, detail="wrong_password")
    await user_crud.delete_user(user["id"])  # sessions and results are cascaded
    return {"ok": True}


@router.get("/api/user/stats")
async def stats(user=Depends(current_user)):
    return await get_stats(user["id"])
