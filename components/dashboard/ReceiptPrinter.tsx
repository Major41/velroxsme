"use client";

import { useRef, useMemo } from "react";
import { useReactToPrint } from "react-to-print";
import { SaleReceipt, type ReceiptSale } from "./SaleReceipt";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

interface Props {
  sale: ReceiptSale | null;
  size: "a4" | "thermal";
  onClose?: () => void;
}

export function ReceiptPrinter({ sale, size, onClose }: Props) {
  const contentRef = useRef<HTMLDivElement>(null);

  // @page rules injected into the print iframe
  const pageStyle = useMemo(() => {
    if (size === "thermal") {
      return `
        @page { size: 58mm auto; margin: 2mm; }
        html, body { margin: 0; padding: 0; background: #fff; }
        * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      `;
    }
    return `
      @page { size: A4 portrait; margin: 0; }
      html, body { margin: 0; padding: 0; background: #fff; }
      * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    `;
  }, [size]);

  const handlePrint = useReactToPrint({
    contentRef,
    documentTitle: sale ? `Receipt-${sale.id.slice(0, 8)}` : "Receipt",
    pageStyle,
    onAfterPrint: () => onClose?.(),
  });

  if (!sale) return null;

  return (
    <>
      {/*
        IMPORTANT:
        - Do NOT use display:none here - the print clone needs real layout.
        - The wrapper is moved off-screen with position:fixed + clip.
        - The receipt itself still renders with its full width so
          react-to-print measures it correctly.
      */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          left: "-10000px",
          top: 0,
          width: size === "a4" ? "210mm" : "58mm",
          pointerEvents: "none",
          opacity: 0,
          zIndex: -1,
        }}
      >
        <div ref={contentRef}>
          <SaleReceipt sale={sale} size={size} />
        </div>
      </div>

      <Button
        onClick={handlePrint}
        className="bg-emerald-600 hover:bg-emerald-700 text-white"
      >
        <Printer className="w-4 h-4 mr-2" />
        Print Receipt
      </Button>
    </>
  );
}
