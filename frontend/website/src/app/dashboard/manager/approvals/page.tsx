"use client";

import { ProtectedRoute, useAuth } from '@/lib/auth-context';
import DashboardLayout from '@/components/DashboardLayout';
import { IconClipboardList } from '@tabler/icons-react';
import React, { useEffect, useState } from 'react';
import { apiService } from '@/lib/api-service';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface PendingApprovalItem {
  expense_id: number;
  employee_id: number;
  category: string;
  description: string;
  amount: number;
  currency_code: string;
  amount_in_company_currency: number;
  expense_date: string;
}

export default function ManagerApprovalsPage() {
  const links = [
    {
      label: "Approvals",
      href: "/dashboard/manager/approvals",
      icon: <IconClipboardList className="h-5 w-5" />,
    },
  ];

  const { user } = useAuth();
  const [items, setItems] = useState<PendingApprovalItem[]>([]);
  const [commentByExpense, setCommentByExpense] = useState<Record<number, string>>({});

  const load = async () => {
    if (!user) return;
    const res = await apiService.getPendingApprovals(parseInt(user.id));
    if (res.success) setItems(res.approvals || []);
  };

  useEffect(() => {
    load();
  }, [user]);

  const takeAction = async (expenseId: number, action: 'Approved' | 'Rejected') => {
    if (!user) return;
    const resp = await apiService.approvalAction(expenseId, parseInt(user.id), action, commentByExpense[expenseId]);
    if (resp.success) {
      await load();
    } else {
      alert(resp.error || 'Failed to submit action');
    }
  };

  return (
    <ProtectedRoute allowedRoles={["Manager", "Admin"]}>
      <DashboardLayout title="Approvals" links={links}>
        <div className="bg-zinc-800 rounded-lg overflow-hidden border border-zinc-700">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-zinc-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-300 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-300 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-300 uppercase tracking-wider">Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-300 uppercase tracking-wider">Comment</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-600">
                {items.map((it) => (
                  <tr key={it.expense_id} className="hover:bg-zinc-700">
                    <td className="px-6 py-3 text-sm text-neutral-200">{it.description}</td>
                    <td className="px-6 py-3 text-sm text-neutral-200">{it.category}</td>
                    <td className="px-6 py-3 text-sm text-neutral-200">{it.currency_code} {it.amount} (≈ {it.amount_in_company_currency})</td>
                    <td className="px-6 py-3 text-sm text-neutral-200 w-64">
                      <Textarea
                        value={commentByExpense[it.expense_id] || ''}
                        onChange={(e) => setCommentByExpense((prev) => ({ ...prev, [it.expense_id]: e.target.value }))}
                        rows={2}
                        className="bg-zinc-800 border-zinc-600"
                        placeholder="Optional comment"
                      />
                    </td>
                    <td className="px-6 py-3 text-sm">
                      <div className="flex gap-2">
                        <Button className="bg-green-700 hover:bg-green-600" onClick={() => takeAction(it.expense_id, 'Approved')}>Approve</Button>
                        <Button className="bg-red-700 hover:bg-red-600" onClick={() => takeAction(it.expense_id, 'Rejected')}>Reject</Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-6 text-center text-neutral-400">No approvals pending</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}


