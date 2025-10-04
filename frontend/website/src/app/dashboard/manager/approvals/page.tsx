"use client";

import { ProtectedRoute } from '@/lib/auth-context';
import DashboardLayout from '@/components/DashboardLayout';
import { IconClipboardList } from '@tabler/icons-react';
import Link from 'next/link';

export default function ManagerApprovalsPage() {
  const links = [
    {
      label: "Approvals",
      href: "/dashboard/manager/approvals",
      icon: <IconClipboardList className="h-5 w-5" />,
    },
  ];

  return (
    <ProtectedRoute allowedRoles={["Manager", "Admin"]}>
      <DashboardLayout title="Approvals" links={links}>
        <Link href="/dashboard/manager" className="text-blue-400 hover:underline">
          Back to overview
        </Link>
      </DashboardLayout>
    </ProtectedRoute>
  );
}


