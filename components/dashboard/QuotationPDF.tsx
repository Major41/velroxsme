"use client";

import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
  Image,
} from "@react-pdf/renderer";
import { Button } from "@/components/ui/button";
import { Download, Printer } from "lucide-react";

/* ==================================================================== */
/*  TYPES                                                               */
/* ==================================================================== */

export interface QuotationPDFData {
  id: string;
  quotation_number: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  customer_address: string;
  quotation_date: string;
  expiry_date: string | null;
  status: string;
  currency: string;
  subtotal: number | string;
  discount_amount: number | string;
  tax_rate: number | string;
  tax_amount: number | string;
  total_amount: number | string;
  terms: string;
  notes: string;
  items?: Array<{
    position: number;
    product_name: string;
    description?: string;
    category?: string;
    quantity: number | string;
    unit_price: number | string;
    discount_amount: number | string;
    line_total: number | string;
  }>;
}

interface BusinessInfo {
  business_name?: string;
  business_type?: string;
  location?: string;
  contact_email?: string;
  contact_phone?: string;
  business_logo?: string;
}

interface Props {
  quotation: QuotationPDFData;
  business: BusinessInfo;
}

const num = (v: number | string) =>
  typeof v === "number" ? v : parseFloat(v) || 0;
const fmt = (n: number) =>
  n.toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/* ==================================================================== */
/*  STYLES                                                              */
/* ==================================================================== */

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#000",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "#000",
    paddingBottom: 15,
    marginBottom: 20,
  },
  logo: { width: 80, height: 80, marginRight: 20 },
  headerText: { flex: 1 },
  businessName: { fontSize: 22, fontWeight: "bold" },
  businessSub: { fontSize: 10, color: "#444", marginTop: 4 },
  docTitle: { fontSize: 26, fontWeight: "bold", textAlign: "right" },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  metaBlock: { flex: 1 },
  metaLabel: {
    fontSize: 8,
    textTransform: "uppercase",
    color: "#666",
    marginBottom: 4,
  },
  metaValue: { fontSize: 12, fontWeight: "bold" },
  table: { width: "100%", marginTop: 10, marginBottom: 10 },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#000",
    color: "#fff",
    padding: 8,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
    padding: 8,
  },
  colItem: { flex: 4 },
  colCategory: { flex: 2 },
  colQty: { flex: 1, textAlign: "right" },
  colPrice: { flex: 2, textAlign: "right" },
  colDisc: { flex: 2, textAlign: "right" },
  colAmount: { flex: 2, textAlign: "right" },
  totalsSection: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 10,
  },
  totalsTable: { width: 220 },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  totalLabel: { fontSize: 12 },
  totalValue: { fontSize: 12, fontWeight: "bold" },
  grandTotal: {
    borderTopWidth: 2,
    borderTopColor: "#000",
    paddingTop: 8,
    marginTop: 4,
  },
  grandTotalLabel: { fontSize: 14, fontWeight: "bold" },
  grandTotalValue: { fontSize: 14, fontWeight: "bold" },
  termsBlock: { marginTop: 24, borderTopWidth: 1, borderTopColor: "#ccc", paddingTop: 10 },
  termsTitle: { fontSize: 11, fontWeight: "bold", marginBottom: 4 },
  termsText: { fontSize: 9, color: "#333", lineHeight: 1.5 },
  footer: {
    position: "absolute",
    bottom: 40,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: "#000",
    paddingTop: 10,
    textAlign: "center",
    fontSize: 10,
  },
  footerBold: { fontWeight: "bold", marginTop: 6 },
});

/* ==================================================================== */
/*  DOCUMENT                                                            */
/* ==================================================================== */

function QuotationDocument({ quotation, business }: Props) {
  const subtotal = num(quotation.subtotal);
  const discount = num(quotation.discount_amount);
  const taxRate = num(quotation.tax_rate);
  const tax = num(quotation.tax_amount);
  const total = num(quotation.total_amount);
  const items = quotation.items || [];

  const currency = quotation.currency || "KES";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          {business.business_logo && (
            // eslint-disable-next-line jsx-a11y/alt-text
            <Image src={business.business_logo} style={styles.logo} />
          )}
          <View style={styles.headerText}>
            <Text style={styles.businessName}>
              {business.business_name || "Business"}
            </Text>
            {business.business_type && (
              <Text style={styles.businessSub}>{business.business_type}</Text>
            )}
            {business.location && (
              <Text style={styles.businessSub}>{business.location}</Text>
            )}
            <Text style={styles.businessSub}>
              {business.contact_phone && `Tel: ${business.contact_phone}`}
              {business.contact_phone && business.contact_email ? " | " : ""}
              {business.contact_email}
            </Text>
          </View>
          <View>
            <Text style={styles.docTitle}>QUOTATION</Text>
            <Text style={{ fontSize: 10, textAlign: "right", marginTop: 4 }}>
              No: {quotation.quotation_number}
            </Text>
            <Text style={{ fontSize: 10, textAlign: "right" }}>
              Date: {quotation.quotation_date}
            </Text>
            {quotation.expiry_date && (
              <Text style={{ fontSize: 10, textAlign: "right" }}>
                Valid Until: {quotation.expiry_date}
              </Text>
            )}
          </View>
        </View>

        {/* Customer + meta */}
        <View style={styles.metaRow}>
          <View style={styles.metaBlock}>
            <Text style={styles.metaLabel}>Prepared For</Text>
            <Text style={styles.metaValue}>{quotation.customer_name}</Text>
            {quotation.customer_phone && (
              <Text style={{ fontSize: 10, color: "#444" }}>
                {quotation.customer_phone}
              </Text>
            )}
            {quotation.customer_email && (
              <Text style={{ fontSize: 10, color: "#444" }}>
                {quotation.customer_email}
              </Text>
            )}
            {quotation.customer_address && (
              <Text style={{ fontSize: 10, color: "#444" }}>
                {quotation.customer_address}
              </Text>
            )}
          </View>
          <View style={[styles.metaBlock, { textAlign: "right" }]}>
            <Text style={styles.metaLabel}>Status</Text>
            <Text
              style={{
                fontSize: 12,
                fontWeight: "bold",
                textTransform: "uppercase",
              }}
            >
              {quotation.status}
            </Text>
          </View>
        </View>

        {/* Items table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colItem}>Item</Text>
            <Text style={styles.colCategory}>Category</Text>
            <Text style={styles.colQty}>Qty</Text>
            <Text style={styles.colPrice}>Unit Price</Text>
            <Text style={styles.colDisc}>Discount</Text>
            <Text style={styles.colAmount}>Amount</Text>
          </View>
          {items.map((it, idx) => (
            <View
              key={idx}
              style={[
                styles.tableRow,
                idx % 2 === 1 ? { backgroundColor: "#f8f8f8" } : {},
              ]}
            >
              <Text style={styles.colItem}>
                {it.product_name}
                {it.description ? `\n${it.description}` : ""}
              </Text>
              <Text style={styles.colCategory}>{it.category || "-"}</Text>
              <Text style={styles.colQty}>{it.quantity}</Text>
              <Text style={styles.colPrice}>
                {fmt(num(it.unit_price))}
              </Text>
              <Text style={styles.colDisc}>
                {num(it.discount_amount) > 0
                  ? `-${fmt(num(it.discount_amount))}`
                  : "-"}
              </Text>
              <Text style={styles.colAmount}>
                {fmt(num(it.line_total))}
              </Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalsTable}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalValue}>
                {currency} {fmt(subtotal)}
              </Text>
            </View>
            {discount > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Discount</Text>
                <Text style={styles.totalValue}>
                  - {currency} {fmt(discount)}
                </Text>
              </View>
            )}
            {taxRate > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>
                  Tax ({taxRate}%)
                </Text>
                <Text style={styles.totalValue}>
                  {currency} {fmt(tax)}
                </Text>
              </View>
            )}
            <View style={[styles.totalRow, styles.grandTotal]}>
              <Text style={styles.grandTotalLabel}>TOTAL</Text>
              <Text style={styles.grandTotalValue}>
                {currency} {fmt(total)}
              </Text>
            </View>
          </View>
        </View>

        {/* Terms */}
        {quotation.terms && (
          <View style={styles.termsBlock}>
            <Text style={styles.termsTitle}>Terms & Conditions</Text>
            <Text style={styles.termsText}>{quotation.terms}</Text>
          </View>
        )}

        {/* Notes */}
        {quotation.notes && (
          <View style={styles.termsBlock}>
            <Text style={styles.termsTitle}>Notes</Text>
            <Text style={styles.termsText}>{quotation.notes}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>Thank you for considering our quotation.</Text>
          <Text style={styles.footerBold}>
            Powered by VELROX · 0790809501
          </Text>
        </View>
      </Page>
    </Document>
  );
}

/* ==================================================================== */
/*  BUTTONS                                                             */
/* ==================================================================== */

export function QuotationPDFButton({ quotation, business }: Props) {
  const [printing, setPrinting] = React.useState(false);
  const [downloading, setDownloading] = React.useState(false);

  const generatePDFBlob = async () => {
    return await pdf(
      <QuotationDocument quotation={quotation} business={business} />,
    ).toBlob();
  };

  const handleDownload = async () => {
    try {
      setDownloading(true);
      const blob = await generatePDFBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Quotation-${quotation.quotation_number}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.error("PDF download error:", err);
      alert("Failed to generate PDF.");
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = async () => {
    try {
      setPrinting(true);
      const blob = await generatePDFBlob();
      const url = URL.createObjectURL(blob);

      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.left = "-9999px";
      iframe.style.top = "0";
      iframe.style.width = "1px";
      iframe.style.height = "1px";
      iframe.style.border = "0";
      iframe.src = url;

      document.body.appendChild(iframe);

      iframe.onload = () => {
        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } catch (err) {
            console.error("Print error:", err);
          }
          setTimeout(() => {
            document.body.removeChild(iframe);
            URL.revokeObjectURL(url);
            setPrinting(false);
          }, 2000);
        }, 300);
      };
    } catch (err) {
      console.error("A4 print error:", err);
      setPrinting(false);
    }
  };

  return (
    <div className="flex gap-2">
      <Button
        onClick={handlePrint}
        disabled={printing}
        className="bg-blue-600 hover:bg-blue-700 text-white"
      >
        <Printer className="w-4 h-4 mr-2" />
        {printing ? "Preparing..." : "Print"}
      </Button>
      <Button
        onClick={handleDownload}
        disabled={downloading}
        className="bg-emerald-600 hover:bg-emerald-700 text-white"
      >
        <Download className="w-4 h-4 mr-2" />
        {downloading ? "Generating..." : "Download PDF"}
      </Button>
    </div>
  );
}