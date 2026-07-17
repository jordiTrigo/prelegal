"""Unit tests for database initialization."""

import sqlite3
from pathlib import Path

from app.db import init_db


def table_names(db_path: Path) -> set[str]:
    conn = sqlite3.connect(db_path)
    try:
        rows = conn.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()
    finally:
        conn.close()
    return {row[0] for row in rows}


def test_init_db_creates_users_table(tmp_path: Path) -> None:
    db_path = tmp_path / "app.db"
    init_db(db_path)
    assert "users" in table_names(db_path)


def test_init_db_creates_sessions_and_documents_tables(tmp_path: Path) -> None:
    db_path = tmp_path / "app.db"
    init_db(db_path)
    tables = table_names(db_path)
    assert "sessions" in tables
    assert "documents" in tables


def test_init_db_creates_parent_directories(tmp_path: Path) -> None:
    db_path = tmp_path / "nested" / "dir" / "app.db"
    init_db(db_path)
    assert db_path.exists()


def test_init_db_wipes_existing_data(tmp_path: Path) -> None:
    db_path = tmp_path / "app.db"
    init_db(db_path)

    conn = sqlite3.connect(db_path)
    conn.execute(
        "INSERT INTO users (email, password_hash) VALUES ('a@b.com', 'hash')"
    )
    conn.commit()
    conn.close()

    init_db(db_path)

    conn = sqlite3.connect(db_path)
    count = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]
    conn.close()
    assert count == 0


def test_users_table_columns(tmp_path: Path) -> None:
    db_path = tmp_path / "app.db"
    init_db(db_path)
    conn = sqlite3.connect(db_path)
    columns = {row[1] for row in conn.execute("PRAGMA table_info(users)").fetchall()}
    conn.close()
    assert columns == {"id", "email", "password_hash", "created_at"}
