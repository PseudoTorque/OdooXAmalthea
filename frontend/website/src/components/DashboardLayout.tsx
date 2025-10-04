"use client";

import React from 'react';
import Link from 'next/link';
import { Sidebar, SidebarBody } from '@/components/ui/sidebar';
import { useAuth } from '@/lib/auth-context';
import { IconLogout } from '@tabler/icons-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
  links: Array<{
    label: string;
    href: string;
    icon: React.JSX.Element | React.ReactNode;
  }>;
}

export default function DashboardLayout({ children, title, links }: DashboardLayoutProps) {
  const { user, logout } = useAuth();

  return (
    <div className="flex h-screen bg-black">
      <Sidebar>
        <SidebarBody className="justify-between">
          <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
            <div className="mt-8 flex flex-col gap-2">
              {links.map((link, idx) => (
                <Link key={idx} href={link.href} className="flex items-center justify-start gap-2 group/sidebar py-2">
                  {link.icon}
                  <span className="text-neutral-200 text-sm group-hover/sidebar:translate-x-1 transition duration-150 whitespace-pre inline-block !p-0 !m-0">
                    {link.label}
                  </span>
                </Link>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <button
              onClick={logout}
              className="flex items-center justify-start gap-2 group/sidebar py-2 text-neutral-200 hover:text-neutral-100 transition-colors"
            >
              <IconLogout className="h-5 w-5" />
              <span className="text-sm group-hover/sidebar:translate-x-1 transition duration-150">
                Logout
              </span>
            </button>
          </div>
        </SidebarBody>
      </Sidebar>

      <div className="flex-1 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-neutral-200 mb-2">{title}</h1>
            {title && <p className="text-neutral-300">Welcome back, {user?.full_name}!</p>}
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
