"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import ApiTest from "@/components/ApiTest";

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        router.push('/dashboard');
      } else {
        router.push('/login');
      }
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-neutral-300">Loading...</div>
      </div>
    );
  }

  // This won't be reached due to the redirects, but included for completeness
  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-neutral-200 mb-2">OdooXAmalthea</h1>
          <p className="text-lg text-neutral-300">Business Management Platform</p>
        </div>

        <div className="max-w-6xl mx-auto">
          {/* API Integration Test */}
          <div className="mb-8">
            <ApiTest />
          </div>
        </div>
      </div>
    </div>
  );
}
