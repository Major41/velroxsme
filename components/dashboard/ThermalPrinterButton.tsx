'use client';

import { useState } from 'react';
import { Printer, Text, Line, Row, Br, Cut, render } from 'react-thermal-printer';
import { Button } from '@/components/ui/button';
import { Printer as PrinterIcon } from 'lucide-react';

interface Props {
  sale: any;
  business: any;
}

export function ThermalPrinterButton({ sale, business }: Props) {
  const [printing, setPrinting] = useState(false);

  const handlePrint = async () => {
    setPrinting(true);
    try {
      // 1. Build the receipt using thermal-printer primitives
      const receipt = (
        <Printer type="epson" width={32} characterSet="pc437_usa">
          {/* Header */}
          <Text align="center" bold size={{ width: 2, height: 2 }}>
            {business?.business_name || 'BUSINESS'}
          </Text>
          {business?.location && (
            <Text align="center">{business.location}</Text>
          )}
          {business?.contact_phone && (
            <Text align="center">Tel: {business.contact_phone}</Text>
          )}
          <Br />
          <Line />

          {/* Meta */}
          <Row left="Receipt" right={`RC-${sale.id.slice(0, 8).toUpperCase()}`} />
          <Row left="Date" right={sale.date} />
          <Row left="Customer" right={sale.customer_name || 'Walk-in'} />
          {sale.customer_phone && (
            <Row left="Phone" right={sale.customer_phone} />
          )}

          <Line />

          {/* Item */}
          <Text bold>{sale.product_name}</Text>
          <Text>{sale.category}</Text>
          <Row
            left={`${sale.quantity} x ${Number(sale.unit_price).toLocaleString()}`}
            right={Number(sale.amount).toLocaleString()}
          />

          <Line />

          {/* Total */}
          <Text bold align="right">
            TOTAL: KSh {Number(sale.amount).toLocaleString()}
          </Text>
          <Row left="Payment" right={sale.payment_method} />
          <Row left="Status" right={sale.payment_status.toUpperCase()} />

          <Br />
          <Text align="center">Thank you for your business!</Text>
          <Text align="center" bold>Powered by VELROX</Text>
          <Text align="center">0790809501</Text>

          <Cut />
        </Printer>
      );

      // 2. Render to ESC/POS commands
      const data = await render(receipt);

      // 3. Send to printer via Web Serial
      const port = await (navigator as any).serial.requestPort();
      await port.open({ baudRate: 9600 });

      const writer = port.writable?.getWriter();
      if (writer) {
        await writer.write(data);
        writer.releaseLock();
      }

      await port.close();
    } catch (err: any) {
      console.error('Print error:', err);
      alert('Failed to print: ' + err.message);
    } finally {
      setPrinting(false);
    }
  };

  return (
    <Button
      onClick={handlePrint}
      disabled={printing}
      className="bg-blue-600 hover:bg-blue-700 text-white"
    >
      <PrinterIcon className="w-4 h-4 mr-2" />
      {printing ? 'Printing...' : 'Print Thermal'}
    </Button>
  );
}