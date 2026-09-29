"use client";

import { useState } from "react";
import { print, requestUsbDevice } from "universal-thermal-printer/web";

import { Button } from "@/components/ui/button";
import { Printer as PrinterIcon } from "lucide-react";

interface Props {
  sale: any;
  business: any;
}

export function ThermalPrinterButton({ sale, business }: Props) {
  const [printing, setPrinting] = useState(false);

  const handlePrint = async () => {
    setPrinting(true);

    try {
      // Ask the browser to let the user select the USB printer.
      const printer = await requestUsbDevice();

      if (!printer) {
        throw new Error("No thermal printer was selected.");
      }

      const receiptNumber = `RC-${sale.id.slice(0, 8).toUpperCase()}`;

      const sections = [
        { type: "Init" },

        {
          type: "Align",
          value: "center",
        },

        {
          type: "Bold",
          value: true,
        },

        {
          type: "Size",
          value: {
            width: 2,
            height: 2,
          },
        },

        {
          type: "Text",
          value: business?.business_name || "BUSINESS",
        },

        {
          type: "Bold",
          value: false,
        },

        {
          type: "Size",
          value: {
            width: 1,
            height: 1,
          },
        },

        {
          type: "Text",
          value: business?.location || "",
        },

        {
          type: "Text",
          value: business?.contact_phone
            ? `Tel: ${business.contact_phone}`
            : "",
        },

        {
          type: "Text",
          value: "--------------------------------",
        },

        {
          type: "Align",
          value: "left",
        },

        {
          type: "Text",
          value: `Receipt: ${receiptNumber}`,
        },

        {
          type: "Text",
          value: `Date: ${sale.date}`,
        },

        {
          type: "Text",
          value: `Customer: ${sale.customer_name || "Walk-in"}`,
        },

        {
          type: "Text",
          value: "--------------------------------",
        },

        {
          type: "Text",
          value: `${sale.product_name}`,
        },

        {
          type: "Text",
          value: `${sale.quantity} x KSh ${Number(
            sale.unit_price,
          ).toLocaleString()} = KSh ${Number(sale.amount).toLocaleString()}`,
        },

        {
          type: "Text",
          value: "--------------------------------",
        },

        {
          type: "Bold",
          value: true,
        },

        {
          type: "Text",
          value: `TOTAL: KSh ${Number(sale.amount).toLocaleString()}`,
        },

        {
          type: "Bold",
          value: false,
        },

        {
          type: "Text",
          value: `Payment: ${sale.payment_method}`,
        },

        {
          type: "Text",
          value: `Status: ${String(sale.payment_status).toUpperCase()}`,
        },

        {
          type: "Text",
          value: "",
        },

        {
          type: "Align",
          value: "center",
        },

        {
          type: "Text",
          value: "Thank you for your business!",
        },

        {
          type: "Text",
          value: "Powered by VELROX",
        },

        {
          type: "Text",
          value: "0790809501",
        },

        {
          type: "Feed",
          value: 3,
        },
        {
          type: "Feed",
          value: 3,
        },

        {
          type: "Cut",
        },
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
