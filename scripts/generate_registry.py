#!/usr/bin/env python3
"""Generates templates/registry/<id>.json from templates/*.md + catalog.json.

Regex-scans each template for `<span class="X_link">Label</span>` placeholders,
normalizes labels (strips possessives/punctuation, merges singular/plural
variants), and classifies each into a field kind. The DROP_LABELS/TYPE_OVERRIDES/
PROMPT_HINTS tables below encode legal-domain judgment that can't be inferred
from the markup alone (e.g. "DPA"/"Security Policy" are cross-references to a
separate document this app doesn't model, not user-fillable fields) and survive
a re-run after templates change.

Mutual NDA is hand-specified to match the pre-existing NdaFields shape exactly
(flat mndaTermType/mndaTermYears rather than derived from spans), since its
cover page already has a hand-built field taxonomy that predates this script.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
TEMPLATES_DIR = REPO_ROOT / "templates"
REGISTRY_DIR = TEMPLATES_DIR / "registry"
FRONTEND_REGISTRY_DIR = REPO_ROOT / "frontend" / "lib" / "document-registry"

SPAN_PATTERN = re.compile(r'<span class="[a-z_]+_link"[^>]*>([^<]*)</span>')

# Labels that are cross-references to a separate document/artifact this app
# doesn't model (e.g. "link your existing DPA"), not concrete user-fillable
# fields - dropped rather than asked about in chat.
DROP_LABELS = {"agreement", "dpa", "security policy"}

# Explicit field-kind overrides, keyed by normalized label. Anything not
# listed defaults to "text".
PARTY_LABELS = {"customer", "provider", "company", "partner"}
DATE_LABELS = {
    "effective date",
    "baa effective date",
    "order date",
    "non-renewal notice date",
}
LIST_LABELS = {
    "approved subprocessors",
    "categories of personal data",
    "categories of data subjects",
    "customer covered claims",
    "provider covered claims",
    "company covered claim",
    "partner covered claim",
    "increased claims",
    "unlimited claims",
    "additional warranties",
    "special category data restrictions or safeguards",
}

PROMPT_HINTS = {
    "increased claims": "A short list of claim types (e.g. breach of confidentiality, IP infringement) subject to the increased liability cap, if any.",
    "unlimited claims": "A short list of claim types (e.g. gross negligence, fraud) with no liability cap, if any.",
    "chosen courts": "The city/county and state or country where legal disputes will be resolved.",
}

DOCUMENT_TYPES = [
    {
        "id": "ai-addendum",
        "catalogNames": ["AI Addendum"],
        "templateFiles": ["AI-Addendum.md"],
    },
    {
        "id": "baa",
        "catalogNames": ["Business Associate Agreement (BAA)"],
        "templateFiles": ["BAA.md"],
    },
    {
        "id": "csa",
        "catalogNames": ["Cloud Service Agreement (CSA)"],
        "templateFiles": ["CSA.md"],
    },
    {
        "id": "design-partner-agreement",
        "catalogNames": ["Design Partner Agreement"],
        "templateFiles": ["design-partner-agreement.md"],
    },
    {
        "id": "dpa",
        "catalogNames": ["Data Processing Agreement (DPA)"],
        "templateFiles": ["DPA.md"],
    },
    {
        "id": "partnership-agreement",
        "catalogNames": ["Partnership Agreement"],
        "templateFiles": ["Partnership-Agreement.md"],
    },
    {
        "id": "pilot-agreement",
        "catalogNames": ["Pilot Agreement"],
        "templateFiles": ["Pilot-Agreement.md"],
    },
    {
        "id": "psa",
        "catalogNames": ["Professional Services Agreement (PSA)"],
        "templateFiles": ["psa.md"],
    },
    {
        "id": "sla",
        "catalogNames": ["Service Level Agreement (SLA)"],
        "templateFiles": ["sla.md"],
    },
    {
        "id": "software-license-agreement",
        "catalogNames": ["Software License Agreement"],
        "templateFiles": ["Software-License-Agreement.md"],
    },
]

# Mutual NDA predates this script (hand-built NdaFields); specified directly
# to preserve its exact existing field shape and behavior.
MUTUAL_NDA_ENTRY = {
    "id": "mutual-nda",
    "catalogNames": ["Mutual NDA - Cover Page", "Mutual NDA - Standard Terms"],
    "templateFiles": ["Mutual-NDA-coverpage.md", "Mutual-NDA.md"],
    "fields": [
        {"id": "partyOne", "label": "Party 1", "type": "party", "required": True},
        {"id": "partyTwo", "label": "Party 2", "type": "party", "required": True},
        {"id": "purpose", "label": "Purpose", "type": "text", "required": True},
        {"id": "effectiveDate", "label": "Effective Date", "type": "date", "required": True},
        {
            "id": "mndaTermType",
            "label": "MNDA Term",
            "type": "enum",
            "options": ["expires", "until_terminated"],
            "required": True,
        },
        {
            "id": "mndaTermYears",
            "label": "MNDA Term Years",
            "type": "integer",
            "required": False,
            "promptHint": "Only ask if mndaTermType is 'expires'.",
        },
        {
            "id": "confidentialityTermType",
            "label": "Term of Confidentiality",
            "type": "enum",
            "options": ["years", "perpetuity"],
            "required": True,
        },
        {
            "id": "confidentialityTermYears",
            "label": "Confidentiality Term Years",
            "type": "integer",
            "required": False,
            "promptHint": "Only ask if confidentialityTermType is 'years'.",
        },
        {"id": "governingLaw", "label": "Governing Law", "type": "text", "required": True},
        {"id": "jurisdiction", "label": "Jurisdiction", "type": "text", "required": True},
    ],
}


def normalize_label(raw: str) -> str:
    label = raw.strip()
    label = re.sub(r"[’']s$", "", label)
    return label.strip().rstrip(",.;:")


def slugify(label: str) -> str:
    words = re.findall(r"[A-Za-z0-9]+", label)
    if not words:
        return "field"
    head, *rest = words
    return head.lower() + "".join(w.capitalize() for w in rest)


def classify(label_lower: str) -> str:
    if label_lower in PARTY_LABELS:
        return "party"
    if label_lower in DATE_LABELS:
        return "date"
    if label_lower in LIST_LABELS:
        return "list"
    return "text"


def extract_fields(template_path: Path) -> list[dict]:
    text = template_path.read_text(encoding="utf-8")
    labels_seen: dict[str, str] = {}  # normalized-lower -> display label (first-seen casing)
    for match in SPAN_PATTERN.finditer(text):
        label = normalize_label(match.group(1))
        if not label:
            continue
        lower = label.lower()
        if lower in DROP_LABELS:
            continue
        labels_seen.setdefault(lower, label)

    # If both a singular and plural form of a label appear (e.g.
    # "Subscription Period" and "Subscription Periods"), keep only the
    # plural - independent of which form the source text happens to use
    # first, unlike a single left-to-right merge pass would be.
    redundant_singulars = {lower for lower in labels_seen if f"{lower}s" in labels_seen}

    fields = []
    for lower, label in labels_seen.items():
        if lower in redundant_singulars:
            continue
        field_id = slugify(label)
        fields.append(
            {
                "id": field_id,
                "label": label,
                "type": classify(lower),
                "required": True,
                **({"promptHint": PROMPT_HINTS[lower]} if lower in PROMPT_HINTS else {}),
            }
        )
    fields.sort(key=lambda f: f["label"])
    return fields


def _write(descriptor: dict) -> None:
    """Writes the descriptor to both the backend's source-of-truth registry
    (templates/registry/, read at runtime by app/document_types.py) and a
    frontend copy (frontend/lib/document-registry/, statically imported) -
    two committed artifacts generated together so they can't drift."""
    backend_path = REGISTRY_DIR / f"{descriptor['id']}.json"
    backend_path.write_text(json.dumps(descriptor, indent=2) + "\n", encoding="utf-8")

    frontend_descriptor = {k: v for k, v in descriptor.items() if k != "templateFiles"}
    frontend_path = FRONTEND_REGISTRY_DIR / f"{descriptor['id']}.json"
    frontend_path.write_text(json.dumps(frontend_descriptor, indent=2) + "\n", encoding="utf-8")

    print(f"wrote {descriptor['id']} ({len(descriptor['fields'])} fields)")


def main() -> None:
    REGISTRY_DIR.mkdir(parents=True, exist_ok=True)
    FRONTEND_REGISTRY_DIR.mkdir(parents=True, exist_ok=True)

    for entry in DOCUMENT_TYPES:
        all_fields: list[dict] = []
        seen_ids: set[str] = set()
        for filename in entry["templateFiles"]:
            for field in extract_fields(TEMPLATES_DIR / filename):
                if field["id"] in seen_ids:
                    continue
                seen_ids.add(field["id"])
                all_fields.append(field)

        _write(
            {
                "id": entry["id"],
                "catalogNames": entry["catalogNames"],
                "templateFiles": entry["templateFiles"],
                "fields": all_fields,
            }
        )

    _write(MUTUAL_NDA_ENTRY)


if __name__ == "__main__":
    main()
