import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { buildNdaDocument, ATTRIBUTION } from "@/lib/nda-content";
import type { NdaFormData } from "@/lib/nda-schema";

const styles = StyleSheet.create({
  page: { padding: 48, fontSize: 10, fontFamily: "Helvetica", lineHeight: 1.4 },
  title: { fontSize: 16, fontWeight: 700, marginBottom: 16 },
  sectionHeading: { fontSize: 13, fontWeight: 700, marginTop: 16, marginBottom: 8 },
  fieldRow: { flexDirection: "row", marginBottom: 4 },
  fieldLabel: { width: 160, fontWeight: 700 },
  fieldValue: { flex: 1 },
  table: { marginTop: 12, borderWidth: 1, borderColor: "#000" },
  tableRow: { flexDirection: "row", borderBottomWidth: 1, borderColor: "#000" },
  tableRowLast: { flexDirection: "row" },
  tableHeaderCell: { flex: 1, padding: 4, fontWeight: 700, borderLeftWidth: 1, borderColor: "#000" },
  tableLabelCell: { width: 120, padding: 4, fontWeight: 700 },
  tableCell: { flex: 1, padding: 4, borderLeftWidth: 1, borderColor: "#000" },
  clause: { marginBottom: 10 },
  clauseTitle: { fontWeight: 700 },
  attribution: { marginTop: 24, fontSize: 8, color: "#666" },
});

export function NdaPdfDocument({ data }: { data: NdaFormData }) {
  const doc = buildNdaDocument(data);

  const rows: Array<[string, (p: (typeof doc.parties)[number]) => string]> = [
    ["Company", (p) => p.companyName || "—"],
    ["Print Name", (p) => p.signerName || "—"],
    ["Title", (p) => p.signerTitle || "—"],
    ["Notice Address", (p) => p.noticeAddress || "—"],
  ];

  return (
    <Document title="Mutual Non-Disclosure Agreement">
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Mutual Non-Disclosure Agreement</Text>

        <Text style={styles.sectionHeading}>Cover Page</Text>
        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>Purpose</Text>
          <Text style={styles.fieldValue}>{doc.purpose || "—"}</Text>
        </View>
        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>Effective Date</Text>
          <Text style={styles.fieldValue}>{doc.effectiveDateDisplay}</Text>
        </View>
        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>MNDA Term</Text>
          <Text style={styles.fieldValue}>{doc.mndaTermDisplay}</Text>
        </View>
        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>Term of Confidentiality</Text>
          <Text style={styles.fieldValue}>{doc.confidentialityTermDisplay}</Text>
        </View>
        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>Governing Law</Text>
          <Text style={styles.fieldValue}>{doc.governingLaw || "—"}</Text>
        </View>
        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>Jurisdiction</Text>
          <Text style={styles.fieldValue}>{doc.jurisdiction || "—"}</Text>
        </View>

        <View style={styles.table}>
          <View style={styles.tableRow}>
            <Text style={styles.tableLabelCell} />
            {doc.parties.map((party) => (
              <Text key={party.label} style={styles.tableHeaderCell}>
                {party.label}
              </Text>
            ))}
          </View>
          {rows.map(([label, getValue], i) => (
            <View key={label} style={i === rows.length - 1 ? styles.tableRowLast : styles.tableRow}>
              <Text style={styles.tableLabelCell}>{label}</Text>
              {doc.parties.map((party) => (
                <Text key={party.label} style={styles.tableCell}>
                  {getValue(party)}
                </Text>
              ))}
            </View>
          ))}
        </View>

        <Text style={styles.sectionHeading}>Standard Terms</Text>
        {doc.clauses.map((clause) => (
          <View key={clause.number} style={styles.clause} wrap={false}>
            <Text>
              <Text style={styles.clauseTitle}>
                {clause.number}. {clause.title}.{" "}
              </Text>
              {clause.body}
            </Text>
          </View>
        ))}

        <Text style={styles.attribution}>{ATTRIBUTION}</Text>
      </Page>
    </Document>
  );
}
