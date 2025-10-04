"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/lib/auth-context';

export default function EmployeeDashboard() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to expenses page
    router.push('/dashboard/employee/expenses');
  }, [router]);

  return (
    <ProtectedRoute allowedRoles={['Employee']}>
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="text-neutral-300">Redirecting to expenses...</div>
      </div>
    </ProtectedRoute>
  );
}
