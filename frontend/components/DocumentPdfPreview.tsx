import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { CC_ATTRIBUTION, DRAFT_DISCLAIMER } from "@/lib/attribution";
import {
  coverSummaryDisplayValue,
  partitionFields,
  PARTY_ROWS,
  type DocumentFields,
  type PartyInfo,
} from "@/lib/field-format";
import type { DocumentTypeDescriptor } from "@/lib/document-registry";
import type { RenderBlock, RenderRun } from "@/lib/markdown-template";

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
  bodyText: { marginBottom: 8 },
  bold: { fontWeight: 700 },
  attribution: { marginTop: 24, fontSize: 8, color: "#666" },
  disclaimer: {
    marginBottom: 16,
    padding: 8,
    fontSize: 9,
    color: "#78350f",
    backgroundColor: "#fffbeb",
    borderWidth: 1,
    borderColor: "#fcd34d",
  },
});

const DEPTH_INDENT_PT = 12;

function PdfRuns({ runs }: { runs: RenderRun[] }) {
  return (
    <>
      {runs.map((run, index) => {
        if (run.kind === "bold") {
          return (
            <Text key={index} style={styles.bold}>
              <PdfRuns runs={run.runs} />
            </Text>
          );
        }
        return <Text key={index}>{run.text}</Text>;
      })}
    </>
  );
}

export function DocumentPdfPreview({
  descriptor,
  fields,
  blocks,
}: {
  descriptor: DocumentTypeDescriptor;
  fields: DocumentFields;
  blocks: RenderBlock[];
}) {
  const { partyFields, detailFields } = partitionFields(descriptor);

  return (
    <Document title={descriptor.catalogNames[0]}>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{descriptor.catalogNames[0]}</Text>

        <Text style={styles.disclaimer}>{DRAFT_DISCLAIMER}</Text>

        <Text style={styles.sectionHeading}>Details</Text>
        {detailFields.map((field) => (
          <View key={field.id} style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>{field.label}</Text>
            <Text style={styles.fieldValue}>{coverSummaryDisplayValue(field, fields)}</Text>
          </View>
        ))}

        {partyFields.length > 0 && (
          <View style={styles.table}>
            <View style={styles.tableRow}>
              <Text style={styles.tableLabelCell} />
              {partyFields.map((field) => (
                <Text key={field.id} style={styles.tableHeaderCell}>
                  {field.label}
                </Text>
              ))}
            </View>
            {PARTY_ROWS.map(({ key, label }, i) => (
              <View key={key} style={i === PARTY_ROWS.length - 1 ? styles.tableRowLast : styles.tableRow}>
                <Text style={styles.tableLabelCell}>{label}</Text>
                {partyFields.map((field) => {
                  const party = fields[field.id] as PartyInfo | undefined;
                  return (
                    <Text key={field.id} style={styles.tableCell}>
                      {party?.[key] || "—"}
                    </Text>
                  );
                })}
              </View>
            ))}
          </View>
        )}

        <Text style={styles.sectionHeading}>Standard Terms</Text>
        {blocks.map((block, index) => {
          if (block.kind === "heading") {
            return (
              <Text key={index} style={styles.sectionHeading}>
                <PdfRuns runs={block.runs} />
              </Text>
            );
          }
          return (
            <View key={index} style={{ marginLeft: block.depth * DEPTH_INDENT_PT }} wrap={false}>
              <Text style={styles.bodyText}>
                {block.kind === "item" && <Text style={styles.bold}>{block.marker} </Text>}
                <PdfRuns runs={block.runs} />
              </Text>
            </View>
          );
        })}

        <Text style={styles.attribution}>{CC_ATTRIBUTION}</Text>
      </Page>
    </Document>
  );
}
