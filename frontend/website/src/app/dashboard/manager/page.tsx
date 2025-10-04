"use client";

import { ProtectedRoute } from '@/lib/auth-context';
import DashboardLayout from '@/components/DashboardLayout';
import { IconClipboardList } from '@tabler/icons-react';

export default function ManagerDashboard() {
  const links = [
    {
      label: "Approvals",
      href: "/dashboard/manager/approvals",
      icon: <IconClipboardList className="h-5 w-5" />,
    },
  ];

  return (
    <ProtectedRoute allowedRoles={['Manager']}>
      <DashboardLayout title="Manager Dashboard" links={links}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-zinc-800 rounded-lg p-6">
            <h3 className="font-medium text-neutral-200 mb-2">My Expenses</h3>
            <p className="text-2xl font-bold text-neutral-100">12</p>
          </div>
          <div className="bg-zinc-800 rounded-lg p-6">
            <h3 className="font-medium text-neutral-200 mb-2">Team Members</h3>
            <p className="text-2xl font-bold text-neutral-100">8</p>
          </div>
          <div className="bg-zinc-800 rounded-lg p-6">
            <h3 className="font-medium text-neutral-200 mb-2">Pending Approvals</h3>
            <p className="text-2xl font-bold text-neutral-100">3</p>
          </div>
        </div>

        <div className="bg-zinc-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-neutral-200 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button className="bg-zinc-700 hover:bg-zinc-600 text-neutral-200 px-4 py-2 rounded-md transition-colors">
              Submit Expense Report
            </button>
            <button className="bg-zinc-700 hover:bg-zinc-600 text-neutral-200 px-4 py-2 rounded-md transition-colors">
              Review Team Expenses
            </button>
            <button className="bg-zinc-700 hover:bg-zinc-600 text-neutral-200 px-4 py-2 rounded-md transition-colors">
              View Analytics
            </button>
            <button className="bg-zinc-700 hover:bg-zinc-600 text-neutral-200 px-4 py-2 rounded-md transition-colors">
              Team Settings
            </button>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
