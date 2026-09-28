'use client';

import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  PDFDownloadLink,
  pdf,
  Image,
} from '@react-pdf/renderer';
import { Button } from '@/components/ui/button';
import { Download, Printer } from 'lucide-react';

export interface ReceiptSale {
  id: string;
  date: string;
  product_name: string;
  category: string;
  customer_name: string;
  customer_phone: string;
  quantity: number;
  unit_price: number | string;
  amount: number | string;
  payment_method: string;
  payment_status: string;
  status: string;
  notes: string;
}

interface BusinessInfo {
  business_name?: string;
  business_type?: string;
  location?: string;
  contact_email?: string;
  contact_phone?: string;
  business_logo?: string;
}

const num = (v: number | string) => (typeof v === 'number' ? v : parseFloat(v) || 0);

// A4 page: 595.28 x 841.89 points
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#000',
    paddingBottom: 15,
    marginBottom: 20,
  },
  logo: {
    width: 80,
    height: 80,
    marginRight: 20,
  },
  headerText: {
    flex: 1,
  },
  businessName: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  businessSub: {
    fontSize: 10,
    color: '#444',
    marginTop: 4,
  },
  receiptTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'right',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  metaBlock: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 8,
    textTransform: 'uppercase',
    color: '#666',
    marginBottom: 4,
  },
  metaValue: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  table: {
    width: '100%',
    marginTop: 10,
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#000',
    color: '#fff',
    padding: 8,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    padding: 8,
  },
  colItem: { flex: 3 },
  colCategory: { flex: 2 },
  colQty: { flex: 1, textAlign: 'right' },
  colPrice: { flex: 2, textAlign: 'right' },
  colAmount: { flex: 2, textAlign: 'right' },
  totalsSection: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  totalsTable: {
    width: 200,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  totalLabel: {
    fontSize: 12,
  },
  totalValue: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  grandTotal: {
    borderTopWidth: 2,
    borderTopColor: '#000',
    paddingTop: 8,
    marginTop: 4,
  },
  grandTotalLabel: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  grandTotalValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: '#000',
    paddingTop: 10,
    textAlign: 'center',
    fontSize: 10,
  },
  footerBold: {
    fontWeight: 'bold',
    marginTop: 6,
  },
});

interface ReceiptDocumentProps {
  sale: ReceiptSale;
  business: BusinessInfo;
}

function ReceiptDocument({ sale, business }: ReceiptDocumentProps) {
  const unitPrice = num(sale.unit_price);
  const total = num(sale.amount);
  const receiptNo = `RC-${sale.id.substring(0, 8).toUpperCase()}`;

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
              {business.business_name || 'Business'}
            </Text>
            {business.business_type && (
              <Text style={styles.businessSub}>{business.business_type}</Text>
            )}
            <Text style={styles.businessSub}>{business.location}</Text>
            <Text style={styles.businessSub}>
              Tel: {business.contact_phone} | {business.contact_email}
            </Text>
          </View>
          <View>
            <Text style={styles.receiptTitle}>RECEIPT</Text>
            <Text style={{ fontSize: 10, textAlign: 'right' }}>
              No: {receiptNo}
            </Text>
            <Text style={{ fontSize: 10, textAlign: 'right' }}>
              Date: {sale.date}
            </Text>
          </View>
        </View>

        {/* Customer + Payment */}
        <View style={styles.metaRow}>
          <View style={styles.metaBlock}>
            <Text style={styles.metaLabel}>Billed To</Text>
            <Text style={styles.metaValue}>
              {sale.customer_name || 'Walk-in Customer'}
            </Text>
            {sale.customer_phone && (
              <Text style={{ fontSize: 10, color: '#444' }}>
                {sale.customer_phone}
              </Text>
            )}
          </View>
          <View style={[styles.metaBlock, { textAlign: 'right' }]}>
            <Text style={styles.metaLabel}>Payment</Text>
            <Text style={styles.metaValue}>{sale.payment_method}</Text>
            <Text style={{ fontSize: 10, textTransform: 'capitalize' }}>
              {sale.payment_status}
            </Text>
          </View>
        </View>

        {/* Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colItem}>Item</Text>
            <Text style={styles.colCategory}>Category</Text>
            <Text style={styles.colQty}>Qty</Text>
            <Text style={styles.colPrice}>Unit Price</Text>
            <Text style={styles.colAmount}>Amount</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.colItem}>{sale.product_name}</Text>
            <Text style={styles.colCategory}>{sale.category}</Text>
            <Text style={styles.colQty}>{sale.quantity}</Text>
            <Text style={styles.colPrice}>
              KSh {unitPrice.toLocaleString()}
            </Text>
            <Text style={styles.colAmount}>KSh {total.toLocaleString()}</Text>
          </View>
        </View>

        {/* Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalsTable}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalValue}>
                KSh {total.toLocaleString()}
              </Text>
            </View>
            <View style={[styles.totalRow, styles.grandTotal]}>
              <Text style={styles.grandTotalLabel}>TOTAL</Text>
              <Text style={styles.grandTotalValue}>
                KSh {total.toLocaleString()}
              </Text>
            </View>
          </View>
        </View>

        {/* Notes */}
        {sale.notes && (
          <View style={{ marginTop: 20 }}>
            <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>Notes</Text>
            <Text style={{ color: '#333' }}>{sale.notes}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>Thank you for your business!</Text>
          <Text style={styles.footerBold}>
            Powered by VELROX · 0790809501
          </Text>
        </View>
      </Page>
    </Document>
  );
}

interface ReceiptPDFButtonProps {
  sale: ReceiptSale;
  business: BusinessInfo;
}

export function ReceiptPDFButton({ sale, business }: ReceiptPDFButtonProps) {
  const handleDownload = async () => {
    const blob = await pdf(<ReceiptDocument sale={sale} business={business} />).toBlob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Receipt-${sale.id.slice(0, 8)}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = async () => {
    const blob = await pdf(<ReceiptDocument sale={sale} business={business} />).toBlob();
    const url = URL.createObjectURL(blob);
    
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.src = url;
    
    iframe.onload = () => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
        URL.revokeObjectURL(url);
      }, 1000);
    };
    
    document.body.appendChild(iframe);
  };

  return (
    <div className="flex gap-2">
      {/* <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700 text-white">
        <Printer className="w-4 h-4 mr-2" />
        Print Now
      </Button> */}
      <Button onClick={handleDownload} className="bg-emerald-600 hover:bg-emerald-700 text-white">
        <Download className="w-4 h-4 mr-2" />
        Download PDF
      </Button>
    </div>
  );
}