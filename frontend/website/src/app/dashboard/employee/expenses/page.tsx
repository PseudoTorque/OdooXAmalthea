"use client";

import { ProtectedRoute } from '@/lib/auth-context';
import DashboardLayout from '@/components/DashboardLayout';
import ExpenseManagement from '@/components/employee/ExpenseManagement';
import { IconClipboardList } from '@tabler/icons-react';

export default function EmployeeExpensesPage() {
  const links = [
    {
      label: "My Expenses",
      href: "/dashboard/employee/expenses",
      icon: <IconClipboardList className="h-5 w-5" />,
    },
  ];

  return (
    <ProtectedRoute allowedRoles={['Employee']}>
      <DashboardLayout title="" links={links}>
        <ExpenseManagement />
      </DashboardLayout>
    </ProtectedRoute>
  );
}

