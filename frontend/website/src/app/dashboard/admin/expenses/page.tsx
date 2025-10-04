"use client";

import { ProtectedRoute } from '@/lib/auth-context';
import DashboardLayout from '@/components/DashboardLayout';
import { IconArrowLeft } from '@tabler/icons-react';
import ApprovalPolicyManager from '@/components/admin/ApprovalPolicyManager';

export default function AdminExpensesPage() {
  const links = [
    {
        label: "Back to Overview",
        href: "/dashboard/admin",
        icon: <IconArrowLeft className="h-5 w-5" />,
    },
  ];

  return (
    <ProtectedRoute allowedRoles={["Admin"]}>
      <DashboardLayout title="Expense Approvals" links={links}>
        <ApprovalPolicyManager />
      </DashboardLayout>
    </ProtectedRoute>
  );
}


