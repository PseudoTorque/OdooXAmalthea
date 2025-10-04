"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { apiService } from '@/lib/api-service';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface User { id: string; full_name: string; role: string; }

type ApproverRow = { approver_id: number; order_index?: number | null };

export default function ApprovalPolicyManager() {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [policies, setPolicies] = useState<any[]>([]);
  const [open, setOpen] = useState(false);

  // Simplified policy state
  const [policyId, setPolicyId] = useState<number | null>(null);
  const [applyToUserId, setApplyToUserId] = useState<string>('');
  const [name, setName] = useState('Approval rule for miscellaneous expenses');
  const [isManagerApprover, setIsManagerApprover] = useState(false);
  const [overrideManagerId, setOverrideManagerId] = useState<string>('none');
  const [isSequential, setIsSequential] = useState(false);
  const [minPct, setMinPct] = useState<number | ''>('');
  const [approvers, setApprovers] = useState<ApproverRow[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const load = async () => {
    if (!user) return;
    const [usersRes, polRes] = await Promise.all([
      apiService.getUsersByCompany(user.company_id),
      apiService.getApprovalPolicies(user.company_id)
    ]);
    if ((usersRes as any).success) setUsers((usersRes as any).users);
    if (polRes.success) setPolicies(polRes.policies);
    // Default selected user
    if (!applyToUserId && (usersRes as any).success) {
      const first = (usersRes as any).users.find((u: User) => u.role !== 'Admin');
      setApplyToUserId(first ? first.id : (usersRes as any).users[0]?.id || '');
    }
  };

  const hydrateFromServer = (p: any | null) => {
    if (!p) {
      setPolicyId(null);
      setName('Approval rule for miscellaneous expenses');
      setIsManagerApprover(false);
      setOverrideManagerId('none');
      setIsSequential(false);
      setMinPct('');
      setApprovers([]);
      return;
    }
    setPolicyId(p.id);
    setName(p.name || '');
    setIsManagerApprover(!!p.is_manager_approver);
    setOverrideManagerId(p.override_manager_id ? String(p.override_manager_id) : 'none');
    setIsSequential(!!p.is_sequential);
    setMinPct(p.min_approval_percentage ?? '');
    setApprovers((p.approvers || []).map((a: any) => ({ approver_id: a.approver_id, order_index: a.order_index })));
  };

  const loadPolicyForUser = async (uid: string) => {
    if (!uid) return;
    const res = await apiService.getApprovalPolicyForUser(parseInt(uid));
    if (res.success) {
      hydrateFromServer(res.policy);
    }
  };

  useEffect(() => { load(); }, [user]);
  useEffect(() => { if (applyToUserId) loadPolicyForUser(applyToUserId); }, [applyToUserId]);

  const managerCandidates = useMemo(() => users.filter(u => u.role === 'Manager' || u.role === 'Admin'), [users]);

  const addApprover = (newId?: string) => {
    const id = newId ? parseInt(newId) : parseInt(users[0]?.id || '0');
    setApprovers(prev => [...prev, { approver_id: id, order_index: (prev.length + 1) }]);
  };

  const deleteApprover = (idx: number) => {
    setApprovers(prev => prev.filter((_, i) => i !== idx).map((a, i) => ({ ...a, order_index: i + 1 })));
  };

  const onDragStart = (index: number) => setDragIndex(index);
  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => e.preventDefault();
  const onDrop = (index: number) => {
    if (dragIndex === null || dragIndex === index) return;
    setApprovers(prev => {
      const copy = [...prev];
      const [moved] = copy.splice(dragIndex, 1);
      copy.splice(index, 0, moved);
      return copy.map((a, i) => ({ ...a, order_index: i + 1 }));
    });
    setDragIndex(null);
  };

  const save = async () => {
    if (!user || !applyToUserId) return;
    const payload: any = {
      id: policyId || undefined,
      company_id: user.company_id,
      user_id: parseInt(applyToUserId),
      name,
      override_manager_id: overrideManagerId !== 'none' ? parseInt(overrideManagerId) : undefined,
      is_manager_approver: isManagerApprover,
      is_sequential: isSequential,
      min_approval_percentage: typeof minPct === 'number' ? minPct : undefined,
      approvers: approvers.map((a, idx) => ({ approver_id: a.approver_id, order_index: idx + 1 })),
    };
    const res = await apiService.upsertApprovalPolicy(payload);
    if (res.success) {
      setOpen(false);
      await load();
      await loadPolicyForUser(applyToUserId);
    } else {
      alert(res.error || 'Failed to save policy');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold text-neutral-200">Approval Policies</h3>
        <Button className="bg-zinc-700 hover:bg-zinc-600" onClick={() => setOpen(true)}>Configure Policy</Button>
      </div>

      <div className="bg-zinc-800 rounded-lg p-4 border border-zinc-700">
        {policies.length === 0 ? (
          <div className="text-neutral-400">No policies found. Click Configure Policy to create one.</div>
        ) : (
          <ul className="list-disc pl-6 text-neutral-200">
            {policies.map((p) => (
              <li key={p.id}>{p.name} — Applies to user ID {p.user_id} — Approvers: {(p.approvers?.length || 0) + (p.is_manager_approver ? 1 : 0)}</li>
            ))}
          </ul>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Configure Approval Policy</DialogTitle>
            <DialogDescription>Define approvers, sequence, and rules.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>User</Label>
                <Select value={applyToUserId} onValueChange={(v) => setApplyToUserId(v)}>
                  <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
                  <SelectContent>
                    {users.map(u => (
                      <SelectItem key={u.id} value={u.id}>{u.full_name} ({u.role})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label>Policy name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label>Is manager an approver?</Label>
                <Select value={isManagerApprover ? 'yes' : 'no'} onValueChange={(v) => setIsManagerApprover(v==='yes')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no">No</SelectItem>
                    <SelectItem value="yes">Yes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Override manager (optional)</Label>
                <Select value={overrideManagerId} onValueChange={setOverrideManagerId}>
                  <SelectTrigger><SelectValue placeholder="Select approver" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {managerCandidates.map(u => (
                      <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Approvers sequence</Label>
                <Select value={isSequential ? 'sequential' : 'parallel'} onValueChange={(v) => setIsSequential(v==='sequential')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="parallel">Parallel</SelectItem>
                    <SelectItem value="sequential">Sequential</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Minimum approval %</Label>
                <div className="flex items-center gap-2">
                  <Input type="number" value={minPct} onChange={(e) => setMinPct(e.target.value === '' ? '' : parseInt(e.target.value))} />
                  <span className="text-neutral-400">%</span>
                </div>
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-700 rounded p-4 space-y-3">
              <div className="flex justify-between items-center">
                <Label>Approvers</Label>
                <div className="flex gap-2">
                  <Select onValueChange={(v) => addApprover(v)}>
                    <SelectTrigger className="w-64"><SelectValue placeholder="Add approver" /></SelectTrigger>
                    <SelectContent>
                      {users.map(u => (
                        <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" className="border-zinc-600" onClick={() => addApprover()}>Add</Button>
                </div>
              </div>

              <div className="space-y-2">
                {approvers.map((appr, idx) => (
                  <div key={idx}
                       className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center border border-zinc-700 rounded p-2"
                       draggable
                       onDragStart={() => onDragStart(idx)}
                       onDragOver={onDragOver}
                       onDrop={() => onDrop(idx)}>
                    <div>
                      <Label>Approver</Label>
                      <Select value={String(appr.approver_id)} onValueChange={(v) => setApprovers(prev => prev.map((a, i) => i===idx ? { ...a, approver_id: parseInt(v) } : a))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {users.map(u => (
                            <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Order</Label>
                      <Input type="number" value={appr.order_index || ''} onChange={(e) => setApprovers(prev => prev.map((a, i) => i===idx ? { ...a, order_index: e.target.value === '' ? null : parseInt(e.target.value) } : a))} />
                    </div>
                    <div className="flex items-end">
                      <Button variant="outline" className="border-red-600 text-red-400" onClick={() => deleteApprover(idx)}>Remove</Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="text-neutral-400 text-sm">Drag rows to reorder approvers.</div>
            </div>

            <div className="flex justify-end gap-3">
              <Button onClick={save} className="bg-zinc-700 hover:bg-zinc-600">Save Policy</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}


