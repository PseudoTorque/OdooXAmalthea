"use client";

import { ProtectedRoute } from '@/lib/auth-context';
import DashboardLayout from '@/components/DashboardLayout';
import { IconSettings, IconUsers, IconBuilding, IconChartBar, IconArrowLeft } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import UserManagement from '@/components/admin/UserManagement';

export default function AdminUsersPage() {
  const links = [
    {
      label: "Back to Overview",
      href: "/dashboard/admin",
      icon: <IconArrowLeft className="h-5 w-5" />,
    },
  ];

  return (
    <ProtectedRoute allowedRoles={['Admin']}>
      <DashboardLayout title="User Management" links={links}>
        <UserManagement />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
