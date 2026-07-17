"""Password hashing, session tokens, and the current-user FastAPI dependency.

Sessions are opaque random tokens stored in the `sessions` table (no signing
library needed - validity is a DB lookup) and naturally invalidate whenever
the process restarts, since the database is recreated from scratch then.
"""

import hashlib
import os
import secrets
import sqlite3
from dataclasses import dataclass

from fastapi import Cookie, HTTPException

from app.db import db_connection
from app.settings import settings

SESSION_COOKIE_NAME = "session_token"
PBKDF2_ITERATIONS = 260_000


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, PBKDF2_ITERATIONS)
    return f"{salt.hex()}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        salt_hex, digest_hex = stored.split("$", 1)
    except ValueError:
        return False
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt_hex), PBKDF2_ITERATIONS)
    return secrets.compare_digest(digest.hex(), digest_hex)


# Hashed once at import time and compared against on every failed lookup, so
# an unknown email takes the same PBKDF2-hashing time as a wrong password for
# a known email - otherwise the early return on "no such user" would let an
# attacker enumerate registered emails by timing /api/auth/signin responses.
_UNKNOWN_USER_HASH = hash_password(secrets.token_urlsafe(32))


@dataclass
class User:
    id: int
    email: str


def create_user(conn: sqlite3.Connection, email: str, password: str) -> User:
    cursor = conn.execute(
        "INSERT INTO users (email, password_hash) VALUES (?, ?)",
        (email, hash_password(password)),
    )
    conn.commit()
    return User(id=cursor.lastrowid, email=email)


def authenticate_user(conn: sqlite3.Connection, email: str, password: str) -> User | None:
    row = conn.execute(
        "SELECT id, email, password_hash FROM users WHERE email = ?", (email,)
    ).fetchone()
    stored_hash = row["password_hash"] if row is not None else _UNKNOWN_USER_HASH
    password_matches = verify_password(password, stored_hash)
    if row is None or not password_matches:
        return None
    return User(id=row["id"], email=row["email"])


def create_session(conn: sqlite3.Connection, user_id: int) -> str:
    token = secrets.token_urlsafe(32)
    conn.execute("INSERT INTO sessions (token, user_id) VALUES (?, ?)", (token, user_id))
    conn.commit()
    return token


def delete_session(conn: sqlite3.Connection, token: str) -> None:
    conn.execute("DELETE FROM sessions WHERE token = ?", (token,))
    conn.commit()


def get_user_by_session(conn: sqlite3.Connection, token: str | None) -> User | None:
    if not token:
        return None
    row = conn.execute(
        """
        SELECT users.id, users.email FROM sessions
        JOIN users ON users.id = sessions.user_id
        WHERE sessions.token = ?
        """,
        (token,),
    ).fetchone()
    return User(id=row["id"], email=row["email"]) if row else None


def has_valid_session(token: str | None) -> bool:
    with db_connection(settings.db_path) as conn:
        return get_user_by_session(conn, token) is not None


def current_user(
    session_token: str | None = Cookie(default=None, alias=SESSION_COOKIE_NAME),
) -> User:
    with db_connection(settings.db_path) as conn:
        user = get_user_by_session(conn, session_token)
    if user is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user
