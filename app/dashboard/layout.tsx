'use client';

import { Sidebar } from '@/components/dashboard/Sidebar';
import { AIAssistantModal } from "@/components/dashboard/AIAssistantModal";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {


  return (
    <div className="flex min-h-screen bg-slate-950">
      <Sidebar />
      <main className="flex-1 md:ml-64 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">{children}</div>
      </main>
      <AIAssistantModal />
    </div>
  );
}
