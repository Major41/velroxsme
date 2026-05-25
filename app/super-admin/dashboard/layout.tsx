'use client';

import { SuperAdminSidebar } from '@/components/super-admin/SuperAdminSidebar';

export default function SuperAdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <SuperAdminSidebar />
      <div className="md:ml-64 p-4 md:p-8">
        {children}
      </div>
    </div>
  );
}
