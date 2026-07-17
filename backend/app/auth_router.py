"""Sign up, sign in, sign out, and the current-session lookup."""

from fastapi import APIRouter, Cookie, Depends, HTTPException, Response
from pydantic import BaseModel

from app.auth import (
    SESSION_COOKIE_NAME,
    User,
    authenticate_user,
    create_session,
    create_user,
    current_user,
    delete_session,
)
from app.db import db_connection
from app.settings import settings

MIN_PASSWORD_LENGTH = 8

router = APIRouter(prefix="/auth")


class Credentials(BaseModel):
    email: str
    password: str


class AuthUser(BaseModel):
    email: str


def _set_session_cookie(response: Response, token: str) -> None:
    response.set_cookie(SESSION_COOKIE_NAME, token, httponly=True, samesite="lax", path="/")


@router.post("/signup", response_model=AuthUser)
def signup(credentials: Credentials, response: Response) -> AuthUser:
    email = credentials.email.strip().lower()
    if "@" not in email:
        raise HTTPException(status_code=400, detail="Enter a valid email address")
    if len(credentials.password) < MIN_PASSWORD_LENGTH:
        raise HTTPException(
            status_code=400, detail=f"Password must be at least {MIN_PASSWORD_LENGTH} characters"
        )

    with db_connection(settings.db_path) as conn:
        existing = conn.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone()
        if existing is not None:
            raise HTTPException(status_code=409, detail="An account with that email already exists")
        user = create_user(conn, email, credentials.password)
        token = create_session(conn, user.id)

    _set_session_cookie(response, token)
    return AuthUser(email=user.email)


@router.post("/signin", response_model=AuthUser)
def signin(credentials: Credentials, response: Response) -> AuthUser:
    email = credentials.email.strip().lower()
    with db_connection(settings.db_path) as conn:
        user = authenticate_user(conn, email, credentials.password)
        if user is None:
            raise HTTPException(status_code=401, detail="Invalid email or password")
        token = create_session(conn, user.id)

    _set_session_cookie(response, token)
    return AuthUser(email=user.email)


@router.post("/signout")
def signout(
    response: Response,
    session_token: str | None = Cookie(default=None, alias=SESSION_COOKIE_NAME),
) -> dict[str, str]:
    if session_token:
        with db_connection(settings.db_path) as conn:
            delete_session(conn, session_token)
    response.delete_cookie(SESSION_COOKIE_NAME, path="/")
    return {"status": "ok"}


@router.get("/me", response_model=AuthUser)
def me(user: User = Depends(current_user)) -> AuthUser:
    return AuthUser(email=user.email)
