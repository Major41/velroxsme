"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { AIAssistantModal } from "@/components/dashboard/AIAssistantModal";
import { TopBar } from "@/components/dashboard/TopBar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isPOS = pathname?.startsWith("/dashboard/pos");

  if (isPOS) {
    // POS renders its own full-screen layout
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <Sidebar />
      <div className="md:ml-64 flex flex-col min-h-screen">
        <TopBar />
        <main className="flex-1 p-4 md:p-8">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
      <AIAssistantModal />
    </div>
  );
}