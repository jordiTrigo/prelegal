"""SQLite database lifecycle: recreated from scratch on every process start."""

import sqlite3
from pathlib import Path

from app.models.users import CREATE_USERS_TABLE_SQL


def init_db(db_path: Path) -> None:
    """Delete any existing database file and recreate the schema."""
    db_path.parent.mkdir(parents=True, exist_ok=True)
    db_path.unlink(missing_ok=True)
    conn = sqlite3.connect(db_path)
    try:
        conn.execute(CREATE_USERS_TABLE_SQL)
        conn.commit()
    finally:
        conn.close()
