"""Save and list a signed-in user's generated documents."""

import json
import sqlite3

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.auth import User, current_user
from app.db import db_connection
from app.settings import settings

router = APIRouter(prefix="/documents")


class SaveDocumentRequest(BaseModel):
    documentType: str
    fields: dict


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


@router.post("", response_model=DocumentSummary)
def save_document(
    request: SaveDocumentRequest, user: User = Depends(current_user)
) -> DocumentSummary:
    fields_json = json.dumps(request.fields)
    with db_connection(settings.db_path) as conn:
        # Re-downloading an already-saved document (nothing changed since the
        # last save) should not pile up duplicate history rows.
        latest = conn.execute(
            "SELECT id, document_type, fields, created_at FROM documents "
            "WHERE user_id = ? AND document_type = ? ORDER BY id DESC LIMIT 1",
            (user.id, request.documentType),
        ).fetchone()
        if latest is not None and latest["fields"] == fields_json:
            return _to_summary(latest)

        cursor = conn.execute(
            "INSERT INTO documents (user_id, document_type, fields) VALUES (?, ?, ?)",
            (user.id, request.documentType, fields_json),
        )
        conn.commit()
        row = conn.execute(
            "SELECT id, document_type, fields, created_at FROM documents WHERE id = ?",
            (cursor.lastrowid,),
        ).fetchone()
    return _to_summary(row)


@router.get("", response_model=list[DocumentSummary])
def list_documents(user: User = Depends(current_user)) -> list[DocumentSummary]:
    with db_connection(settings.db_path) as conn:
        rows = conn.execute(
            "SELECT id, document_type, fields, created_at FROM documents "
            "WHERE user_id = ? ORDER BY id DESC",
            (user.id,),
        ).fetchall()
    return [_to_summary(row) for row in rows]
