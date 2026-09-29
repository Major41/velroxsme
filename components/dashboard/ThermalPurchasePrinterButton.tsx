"use client";

import { useState } from "react";
import { print, requestUsbDevice } from "universal-thermal-printer/web";
import { Button } from "@/components/ui/button";
import { Printer as PrinterIcon } from "lucide-react";

interface Props {
  purchase: any;
  business: any;
}

export function ThermalPurchasePrinterButton({ purchase, business }: Props) {
  const [printing, setPrinting] = useState(false);

  const handlePrint = async () => {
    setPrinting(true);
    try {
      const printer = await requestUsbDevice();
      if (!printer) throw new Error("No thermal printer was selected.");

      const ref = `PO-${purchase.id.slice(0, 8).toUpperCase()}`;

      const sections = [
        { type: "Init" },
        { type: "Align", value: "center" },
        { type: "Bold", value: true },
        { type: "Size", value: { width: 2, height: 2 } },
        { type: "Text", value: business?.business_name || "BUSINESS" },
        { type: "Bold", value: false },
        { type: "Size", value: { width: 1, height: 1 } },
        { type: "Text", value: business?.location || "" },
        {
          type: "Text",
          value: business?.contact_phone
            ? `Tel: ${business.contact_phone}`
            : "",
        },
        { type: "Text", value: "--------------------------------" },
        { type: "Text", value: "PURCHASE ORDER" },
        { type: "Text", value: "--------------------------------" },
        { type: "Align", value: "left" },
        { type: "Text", value: `Ref: ${ref}` },
        { type: "Text", value: `Date: ${purchase.date}` },
        { type: "Text", value: `Vendor: ${purchase.vendor_name || "-"}` },
        { type: "Text", value: "--------------------------------" },
        { type: "Text", value: `${purchase.description}` },
        { type: "Text", value: `${purchase.category}` },
        {
          type: "Text",
          value: `${purchase.quantity} x KSh ${Number(
            purchase.unit_price,
          ).toLocaleString()} = KSh ${Number(
            purchase.total_amount,
          ).toLocaleString()}`,
        },
        { type: "Text", value: "--------------------------------" },
        { type: "Bold", value: true },
        {
          type: "Text",
          value: `TOTAL: KSh ${Number(
            purchase.total_amount,
          ).toLocaleString()}`,
        },
        { type: "Bold", value: false },
        { type: "Text", value: `Payment: ${purchase.payment_method}` },
        {
          type: "Text",
          value: `Status: ${String(purchase.status).toUpperCase()}`,
        },
        ...(purchase.delivery_date
          ? [
              {
                type: "Text",
                value: `Delivery: ${purchase.delivery_date}`,
              },
            ]
          : []),
        { type: "Text", value: "" },
        { type: "Align", value: "center" },
        { type: "Text", value: "Thank you for your business!" },
        { type: "Text", value: "Powered by VELROX" },
        { type: "Text", value: "0790809501" },
        { type: "Feed", value: 3 },
        { type: "Feed", value: 3 },
        { type: "Cut" },
      ];

      await print("usb", printer.deviceId, sections as any);
    } catch (error: any) {
      console.error("Thermal print error:", error);
      alert(error?.message || "Unable to print the receipt.");
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
      {printing ? "Printing..." : "Print Thermal"}
    </Button>
  );
}