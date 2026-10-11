"use client";

import { POSTopBar } from "@/components/pos/POSTopBar";

export default function POSLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <POSTopBar />
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}