"""Unit tests for the document-type registry and generic field machinery."""

from app.document_types import (
    REGISTRY,
    DocumentTypeDescriptor,
    FieldSpec,
    merge_fields,
    missing_required_fields,
    validate_fields,
)

# --- registry integrity -------------------------------------------------------


def test_registry_loads_all_eleven_document_types() -> None:
    assert len(REGISTRY) == 11
    assert "mutual-nda" in REGISTRY
    assert "dpa" in REGISTRY


def test_every_descriptor_has_at_least_one_field() -> None:
    for descriptor in REGISTRY.values():
        assert len(descriptor.fields) > 0, descriptor.id


def test_field_ids_are_unique_within_a_descriptor() -> None:
    for descriptor in REGISTRY.values():
        ids = [f.id for f in descriptor.fields]
        assert len(ids) == len(set(ids)), descriptor.id


# --- validate_fields -----------------------------------------------------------

DPA = REGISTRY["dpa"]


def test_validate_fields_keeps_valid_text_and_party() -> None:
    raw = {
        "customer": {"companyName": "Acme Inc"},
        "durationOfProcessing": "Length of the underlying agreement",
    }
    fields = validate_fields(DPA, raw)
    assert fields["customer"]["companyName"] == "Acme Inc"
    assert fields["durationOfProcessing"] == "Length of the underlying agreement"


def test_validate_fields_keeps_valid_list() -> None:
    raw = {"approvedSubprocessors": ["Vendor A", "Vendor B", "  "]}
    fields = validate_fields(DPA, raw)
    assert fields["approvedSubprocessors"] == ["Vendor A", "Vendor B"]


def test_validate_fields_drops_blank_strings() -> None:
    fields = validate_fields(DPA, {"durationOfProcessing": "   "})
    assert "durationOfProcessing" not in fields


def test_validate_fields_drops_unknown_keys() -> None:
    fields = validate_fields(DPA, {"notARealField": "value"})
    assert "notARealField" not in fields


def test_validate_fields_handles_non_dict_input() -> None:
    assert validate_fields(DPA, None) == {}


NDA = REGISTRY["mutual-nda"]


def test_validate_fields_drops_out_of_range_integer() -> None:
    fields = validate_fields(NDA, {"mndaTermYears": 500})
    assert "mndaTermYears" not in fields


def test_validate_fields_drops_invalid_enum() -> None:
    fields = validate_fields(NDA, {"mndaTermType": "forever"})
    assert "mndaTermType" not in fields


def test_validate_fields_drops_malformed_date() -> None:
    fields = validate_fields(NDA, {"effectiveDate": "07/14/2026"})
    assert "effectiveDate" not in fields


# --- merge_fields --------------------------------------------------------------


def test_merge_fields_merges_party_subfields() -> None:
    current = {"customer": {"companyName": "Acme Inc"}}
    extracted = {"customer": {"signerName": "Jane Doe"}}
    merged = merge_fields(DPA, current, extracted)
    assert merged["customer"]["companyName"] == "Acme Inc"
    assert merged["customer"]["signerName"] == "Jane Doe"


def test_merge_fields_overwrites_scalar_fields() -> None:
    merged = merge_fields(DPA, {"durationOfProcessing": "Old"}, {"durationOfProcessing": "New"})
    assert merged["durationOfProcessing"] == "New"


def test_merge_fields_preserves_fields_not_mentioned() -> None:
    current = {"durationOfProcessing": "Term of agreement", "governingMemberState": "Ireland"}
    merged = merge_fields(DPA, current, {"frequencyOfTransfer": "Continuous"})
    assert merged["durationOfProcessing"] == "Term of agreement"
    assert merged["governingMemberState"] == "Ireland"
    assert merged["frequencyOfTransfer"] == "Continuous"


# --- missing_required_fields -----------------------------------------------------

SIMPLE_DESCRIPTOR = DocumentTypeDescriptor(
    id="test-type",
    catalogNames=["Test Type"],
    templateFiles=["test.md"],
    fields=[
        FieldSpec(id="a", label="Field A", type="text", required=True),
        FieldSpec(id="b", label="Field B", type="text", required=False),
    ],
)


def test_missing_required_fields_reports_unset_required_fields() -> None:
    assert missing_required_fields(SIMPLE_DESCRIPTOR, {}) == ["Field A"]


def test_missing_required_fields_ignores_optional_fields() -> None:
    assert missing_required_fields(SIMPLE_DESCRIPTOR, {"a": "value"}) == []
