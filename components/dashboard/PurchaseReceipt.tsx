"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useBusiness } from "@/context/BusinessContext";

export interface PurchaseReceiptData {
  id: string;
  date: string;
  vendor_name: string;
  category: string;
  description: string;
  quantity: number;
  unit_price: number | string;
  total_amount: number | string;
  payment_method: string;
  status: string;
  delivery_date: string | null;
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

interface Props {
  purchase: PurchaseReceiptData;
  size: "a4" | "thermal";
}

const num = (v: number | string) =>
  typeof v === "number" ? v : parseFloat(v) || 0;

export function PurchaseReceipt({ purchase, size }: Props) {
  const { business } = useBusiness();
  const supabase = createClient();

  const [info, setInfo] = useState<BusinessInfo>({
    business_name: business?.business_name,
    business_logo: business?.business_logo,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!business?.id) return;
      const { data, error } = await supabase
        .from("businesses")
        .select(
          "business_name, business_type, location, contact_email, contact_phone, business_logo",
        )
        .eq("id", business.id)
        .single();
      if (!error && data && !cancelled) setInfo(data as BusinessInfo);
    })();
    return () => {
      cancelled = true;
    };
  }, [business?.id]);

  const receiptNo = `PO-${purchase.id.substring(0, 8).toUpperCase()}`;
  const unitPrice = num(purchase.unit_price);
  const total = num(purchase.total_amount);

  /* ---------------- THERMAL (58mm) ---------------- */
  if (size === "thermal") {
    return (
      <div
        className="receipt-thermal"
        style={{
          width: "58mm",
          fontFamily: "'Courier New', monospace",
          fontSize: "11px",
          lineHeight: 1.35,
          color: "#000",
          background: "#fff",
          padding: "2mm",
          margin: "0 auto",
          boxSizing: "border-box",
        }}
      >
        <div style={{ textAlign: "center" }}>
          {info.business_logo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={info.business_logo}
              alt="logo"
              style={{
                maxWidth: "28mm",
                maxHeight: "28mm",
                margin: "0 auto 4px",
                display: "block",
              }}
            />
          )}
          <div style={{ fontWeight: 700, fontSize: "13px" }}>
            {info.business_name || "Business"}
          </div>
          {info.business_type && <div>{info.business_type}</div>}
          {info.location && <div>{info.location}</div>}
          {info.contact_phone && <div>Tel: {info.contact_phone}</div>}
        </div>

        <div style={{ borderTop: "1px dashed #000", margin: "6px 0" }} />
        <div style={{ textAlign: "center", fontWeight: 700 }}>
          PURCHASE ORDER
        </div>
        <div style={{ borderTop: "1px dashed #000", margin: "6px 0" }} />

        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Ref</span>
          <span>{receiptNo}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Date</span>
          <span>{purchase.date}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Vendor</span>
          <span>{purchase.vendor_name || "-"}</span>
        </div>

        <div style={{ borderTop: "1px dashed #000", margin: "6px 0" }} />

        <div style={{ fontWeight: 700 }}>{purchase.description}</div>
        <div>{purchase.category}</div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>
            {purchase.quantity} x {unitPrice.toLocaleString()}
          </span>
          <span>{total.toLocaleString()}</span>
        </div>

        <div style={{ borderTop: "1px dashed #000", margin: "6px 0" }} />

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontWeight: 700,
          }}
        >
          <span>TOTAL</span>
          <span>KSh {total.toLocaleString()}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Payment</span>
          <span>{purchase.payment_method}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Status</span>
          <span style={{ textTransform: "uppercase" }}>
            {purchase.status}
          </span>
        </div>

        {purchase.delivery_date && (
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Delivery</span>
            <span>{purchase.delivery_date}</span>
          </div>
        )}

        {purchase.notes && (
          <>
            <div style={{ borderTop: "1px dashed #000", margin: "6px 0" }} />
            <div style={{ fontSize: "10px" }}>Notes: {purchase.notes}</div>
          </>
        )}

        <div style={{ borderTop: "1px dashed #000", margin: "6px 0" }} />

        <div style={{ textAlign: "center", marginTop: "4px" }}>
          <div>Thank you for your business!</div>
          <div style={{ marginTop: "4px" }}>Powered by VELROX</div>
          <div>0790809501</div>
        </div>
      </div>
    );
  }

  /* ---------------- A4 ---------------- */
  return (
    <div
      className="receipt-a4"
      style={{
        width: "210mm",
        minHeight: "297mm",
        padding: "20mm 18mm",
        fontFamily: "'Helvetica', Arial, sans-serif",
        fontSize: "14px",
        lineHeight: 1.6,
        color: "#000",
        background: "#fff",
        boxSizing: "border-box",
        margin: "0 auto",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "20px",
          borderBottom: "3px solid #000",
          paddingBottom: "16px",
        }}
      >
        {info.business_logo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={info.business_logo}
            alt="logo"
            style={{ width: "110px", height: "110px", objectFit: "contain" }}
          />
        )}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "30px", fontWeight: 700, lineHeight: 1.2 }}>
            {info.business_name || "Business"}
          </div>
          {info.business_type && (
            <div style={{ fontSize: "16px", color: "#333", marginTop: "4px" }}>
              {info.business_type}
            </div>
          )}
          <div
            style={{
              fontSize: "14px",
              color: "#444",
              marginTop: "8px",
              lineHeight: 1.6,
            }}
          >
            {info.location && <div>{info.location}</div>}
            {info.contact_phone && <div>Tel: {info.contact_phone}</div>}
            {info.contact_email && <div>{info.contact_email}</div>}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div
            style={{ fontSize: "32px", fontWeight: 800, letterSpacing: "2px" }}
          >
            PURCHASE
          </div>
          <div style={{ fontSize: "14px", marginTop: "6px" }}>
            <span style={{ color: "#666" }}>Ref: </span>
            <span style={{ fontWeight: 600 }}>{receiptNo}</span>
          </div>
          <div style={{ fontSize: "14px" }}>
            <span style={{ color: "#666" }}>Date: </span>
            <span style={{ fontWeight: 600 }}>{purchase.date}</span>
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: "28px",
          gap: "24px",
        }}
      >
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: "12px",
              textTransform: "uppercase",
              color: "#666",
              letterSpacing: "1px",
              marginBottom: "6px",
            }}
          >
            Vendor
          </div>
          <div style={{ fontWeight: 700, fontSize: "18px" }}>
            {purchase.vendor_name || "-"}
          </div>
        </div>
        <div style={{ textAlign: "right", minWidth: "180px" }}>
          <div
            style={{
              fontSize: "12px",
              textTransform: "uppercase",
              color: "#666",
              letterSpacing: "1px",
              marginBottom: "6px",
            }}
          >
            Payment
          </div>
          <div style={{ fontWeight: 700, fontSize: "16px" }}>
            {purchase.payment_method}
          </div>
          <div
            style={{
              fontSize: "13px",
              textTransform: "capitalize",
              color: purchase.status === "delivered" ? "#059669" : "#b45309",
              fontWeight: 600,
              marginTop: "2px",
            }}
          >
            {purchase.status}
          </div>
        </div>
      </div>

      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          marginTop: "32px",
          fontSize: "14px",
        }}
      >
        <thead>
          <tr style={{ backgroundColor: "#000", color: "#fff" }}>
            <th style={{ textAlign: "left", padding: "12px 14px" }}>
              Item
            </th>
            <th style={{ textAlign: "left", padding: "12px 14px" }}>
              Category
            </th>
            <th style={{ textAlign: "right", padding: "12px 14px" }}>Qty</th>
            <th style={{ textAlign: "right", padding: "12px 14px" }}>
              Unit Price
            </th>
            <th style={{ textAlign: "right", padding: "12px 14px" }}>
              Amount
            </th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ borderBottom: "1px solid #ddd" }}>
            <td style={{ padding: "14px" }}>{purchase.description}</td>
            <td style={{ padding: "14px" }}>{purchase.category}</td>
            <td style={{ padding: "14px", textAlign: "right" }}>
              {purchase.quantity}
            </td>
            <td style={{ padding: "14px", textAlign: "right" }}>
              KSh {unitPrice.toLocaleString()}
            </td>
            <td style={{ padding: "14px", textAlign: "right" }}>
              KSh {total.toLocaleString()}
            </td>
          </tr>
        </tbody>
      </table>

      <div
        style={{
          marginTop: "28px",
          display: "flex",
          justifyContent: "flex-end",
        }}
      >
        <table style={{ minWidth: "320px", fontSize: "15px" }}>
          <tbody>
            <tr>
              <td style={{ padding: "10px 0" }}>Subtotal</td>
              <td style={{ padding: "10px 0", textAlign: "right" }}>
                KSh {total.toLocaleString()}
              </td>
            </tr>
            <tr>
              <td
                style={{
                  padding: "12px 0",
                  fontWeight: 700,
                  fontSize: "18px",
                  borderTop: "3px double #000",
                }}
              >
                TOTAL
              </td>
              <td
                style={{
                  padding: "12px 0",
                  textAlign: "right",
                  fontWeight: 700,
                  fontSize: "18px",
                  borderTop: "3px double #000",
                }}
              >
                KSh {total.toLocaleString()}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {purchase.delivery_date && (
        <div style={{ marginTop: "20px", fontSize: "13px" }}>
          <span style={{ fontWeight: 700 }}>Expected Delivery: </span>
          <span>{purchase.delivery_date}</span>
        </div>
      )}

      {purchase.notes && (
        <div style={{ marginTop: "20px", fontSize: "13px" }}>
          <div style={{ fontWeight: 700, marginBottom: "4px" }}>Notes</div>
          <div style={{ color: "#333", lineHeight: 1.6 }}>
            {purchase.notes}
          </div>
        </div>
      )}

      <div
        style={{
          marginTop: "60px",
          borderTop: "2px solid #000",
          paddingTop: "16px",
          textAlign: "center",
          fontSize: "14px",
        }}
      >
        <div style={{ fontWeight: 600 }}>Thank you for your business!</div>
        <div
          style={{
            marginTop: "8px",
            fontWeight: 700,
            letterSpacing: "0.5px",
          }}
        >
          Powered by VELROX · 0790809501
        </div>
      </div>
    </div>
  );
}