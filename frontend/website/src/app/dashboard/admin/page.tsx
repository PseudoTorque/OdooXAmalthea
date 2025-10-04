"use client";

import { ProtectedRoute } from '@/lib/auth-context';
import DashboardLayout from '@/components/DashboardLayout';
import { IconSettings, IconUsers, IconBuilding, IconChartBar } from '@tabler/icons-react';

export default function AdminDashboard() {
  const links = [
    {
      label: "Overview",
      href: "/dashboard/admin",
      icon: <IconChartBar className="h-5 w-5" />,
    },
    {
      label: "Manage Users",
      href: "/dashboard/admin/users",
      icon: <IconUsers className="h-5 w-5" />,
    },
    {
      label: "Company Settings",
      href: "/dashboard/admin/company",
      icon: <IconBuilding className="h-5 w-5" />,
    },
    {
      label: "System Settings",
      href: "/dashboard/admin/settings",
      icon: <IconSettings className="h-5 w-5" />,
    },
  ];

  return (
    <ProtectedRoute allowedRoles={['Admin']}>
      <DashboardLayout title="Admin Dashboard" links={links}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-zinc-800 rounded-lg p-6">
            <h3 className="font-medium text-neutral-200 mb-2">Total Users</h3>
            <p className="text-2xl font-bold text-neutral-100">24</p>
          </div>
          <div className="bg-zinc-800 rounded-lg p-6">
            <h3 className="font-medium text-neutral-200 mb-2">Active Companies</h3>
            <p className="text-2xl font-bold text-neutral-100">3</p>
          </div>
          <div className="bg-zinc-800 rounded-lg p-6">
            <h3 className="font-medium text-neutral-200 mb-2">Pending Approvals</h3>
            <p className="text-2xl font-bold text-neutral-100">7</p>
          </div>
        </div>

        <div className="bg-zinc-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-neutral-200 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button className="bg-zinc-700 hover:bg-zinc-600 text-neutral-200 px-4 py-2 rounded-md transition-colors">
              Add New User
            </button>
            <button className="bg-zinc-700 hover:bg-zinc-600 text-neutral-200 px-4 py-2 rounded-md transition-colors">
              Create Company Policy
            </button>
            <button className="bg-zinc-700 hover:bg-zinc-600 text-neutral-200 px-4 py-2 rounded-md transition-colors">
              View Reports
            </button>
            <button className="bg-zinc-700 hover:bg-zinc-600 text-neutral-200 px-4 py-2 rounded-md transition-colors">
              System Settings
            </button>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
