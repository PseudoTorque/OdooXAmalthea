"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export default function DashboardRedirect() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      // Redirect to appropriate dashboard based on role
      switch (user.role) {
        case 'Admin':
          router.push('/dashboard/admin');
          break;
        case 'Manager':
          router.push('/dashboard/manager');
          break;
        case 'Employee':
          router.push('/dashboard/employee');
          break;
        default:
          router.push('/login');
      }
    } else if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-neutral-300">Loading...</div>
      </div>
    );
  }

  return null; // Will redirect
}
