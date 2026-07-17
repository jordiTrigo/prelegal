"""Save and list a signed-in user's generated documents."""

import json
import sqlite3

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.auth import User, current_user
from app.db import db_connection
from app.settings import settings

router = APIRouter(prefix="/documents")


class SaveDocumentRequest(BaseModel):
    documentType: str
    fields: dict
    # Set when resuming/editing a previously-saved document: updates that
    # row in place instead of inserting a new history entry.
    documentId: int | None = None


class DocumentSummary(BaseModel):
    id: int
    documentType: str
    fields: dict
    createdAt: str


def _to_summary(row: sqlite3.Row) -> DocumentSummary:
    return DocumentSummary(
        id=row["id"],
        documentType=row["document_type"],
        fields=json.loads(row["fields"]),
        createdAt=row["created_at"],
    )


def _update_existing(
    conn: sqlite3.Connection, user: User, document_id: int, document_type: str, fields_json: str
) -> DocumentSummary:
    owned = conn.execute(
        "SELECT id FROM documents WHERE id = ? AND user_id = ?", (document_id, user.id)
    ).fetchone()
    if owned is None:
        raise HTTPException(status_code=404, detail="Document not found")

    conn.execute(
        "UPDATE documents SET document_type = ?, fields = ?, created_at = CURRENT_TIMESTAMP "
        "WHERE id = ?",
        (document_type, fields_json, document_id),
    )
    conn.commit()
    row = conn.execute(
        "SELECT id, document_type, fields, created_at FROM documents WHERE id = ?",
        (document_id,),
    ).fetchone()
    return _to_summary(row)


def _insert_or_reuse(
    conn: sqlite3.Connection, user: User, document_type: str, fields_json: str
) -> DocumentSummary:
    # Re-downloading an already-saved document (nothing changed since the
    # last save) should not pile up duplicate history rows.
    latest = conn.execute(
        "SELECT id, document_type, fields, created_at FROM documents "
        "WHERE user_id = ? AND document_type = ? ORDER BY id DESC LIMIT 1",
        (user.id, document_type),
    ).fetchone()
    if latest is not None and latest["fields"] == fields_json:
        return _to_summary(latest)

    cursor = conn.execute(
        "INSERT INTO documents (user_id, document_type, fields) VALUES (?, ?, ?)",
        (user.id, document_type, fields_json),
    )
    conn.commit()
    row = conn.execute(
        "SELECT id, document_type, fields, created_at FROM documents WHERE id = ?",
        (cursor.lastrowid,),
    ).fetchone()
    return _to_summary(row)


@router.post("", response_model=DocumentSummary)
def save_document(
    request: SaveDocumentRequest, user: User = Depends(current_user)
) -> DocumentSummary:
    fields_json = json.dumps(request.fields)
    with db_connection(settings.db_path) as conn:
        if request.documentId is not None:
            return _update_existing(
                conn, user, request.documentId, request.documentType, fields_json
            )
        return _insert_or_reuse(conn, user, request.documentType, fields_json)


@router.get("", response_model=list[DocumentSummary])
def list_documents(user: User = Depends(current_user)) -> list[DocumentSummary]:
    with db_connection(settings.db_path) as conn:
        rows = conn.execute(
            "SELECT id, document_type, fields, created_at FROM documents "
            "WHERE user_id = ? ORDER BY id DESC",
            (user.id,),
        ).fetchall()
    return [_to_summary(row) for row in rows]
