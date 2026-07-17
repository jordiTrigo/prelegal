"""Serves the raw Standard Terms markdown for a document type, so the
frontend's markdown-substitution renderer can fetch it once a type is
selected. Field metadata is statically bundled into the frontend at build
time (frontend/lib/document-registry/, generated alongside the backend's
registry by scripts/generate_registry.py) - only the template text, which
is comparatively large and only needed after a type is chosen, is served
over HTTP instead.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app import document_types
from app.settings import settings

router = APIRouter()


class DocumentTypeTemplate(BaseModel):
    id: str
    templateMarkdown: str


@router.get("/document-types/{doc_type}", response_model=DocumentTypeTemplate)
def get_document_type_template(doc_type: str) -> DocumentTypeTemplate:
    descriptor = document_types.REGISTRY.get(doc_type)
    if descriptor is None:
        raise HTTPException(status_code=404, detail="Unknown document type")

    filename = descriptor.templateFiles[-1]
    path = settings.templates_dir / filename
    return DocumentTypeTemplate(
        id=descriptor.id, templateMarkdown=path.read_text(encoding="utf-8")
    )
