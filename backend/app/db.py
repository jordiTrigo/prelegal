"""SQLite database lifecycle: recreated from scratch on every process start."""

import sqlite3
from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path

from app.models.documents import CREATE_DOCUMENTS_TABLE_SQL
from app.models.sessions import CREATE_SESSIONS_TABLE_SQL
from app.models.users import CREATE_USERS_TABLE_SQL


def init_db(db_path: Path) -> None:
    """Delete any existing database file and recreate the schema."""
    db_path.parent.mkdir(parents=True, exist_ok=True)
    db_path.unlink(missing_ok=True)
    conn = sqlite3.connect(db_path)
    try:
        conn.execute(CREATE_USERS_TABLE_SQL)
        conn.execute(CREATE_SESSIONS_TABLE_SQL)
        conn.execute(CREATE_DOCUMENTS_TABLE_SQL)
        conn.commit()
    finally:
        conn.close()


def get_connection(db_path: Path) -> sqlite3.Connection:
    """Opens a new connection with row access by column name."""
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn


@contextmanager
def db_connection(db_path: Path) -> Iterator[sqlite3.Connection]:
    """A connection scoped to a single request, closed on the way out."""
    conn = get_connection(db_path)
    try:
        yield conn
    finally:
        conn.close()
