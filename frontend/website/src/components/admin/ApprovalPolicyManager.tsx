"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { apiService } from '@/lib/api-service';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

type RuleType = 'Direct' | 'Percentage' | 'SpecificApprover';

interface User { id: string; full_name: string; role: string; }

export default function ApprovalPolicyManager() {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [policies, setPolicies] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('Approval rule for miscellaneous expenses');
  const [isManagerApprover, setIsManagerApprover] = useState(false);
  const [managerOverrideId, setManagerOverrideId] = useState<string>('');
  const [minPct, setMinPct] = useState<number | ''>('');
  const [steps, setSteps] = useState<any[]>([{
    step_sequence: 1,
    rule_type: 'Direct' as RuleType,
    settings: { is_sequential: false, is_manager_step: false },
    approvers: [],
  }]);

  const load = async () => {
    if (!user) return;
    const [usersRes, polRes] = await Promise.all([
      apiService.getUsersByCompany(user.company_id),
      apiService.getApprovalPolicies(user.company_id)
    ]);
    if ((usersRes as any).success) setUsers((usersRes as any).users);
    if (polRes.success) setPolicies(polRes.policies);
  };

  useEffect(() => { load(); }, [user]);

  const managerCandidates = useMemo(() => users.filter(u => u.role === 'Manager' || u.role === 'Admin'), [users]);

  const addStep = () => {
    setSteps(prev => [
      ...prev,
      { step_sequence: prev.length + 1, rule_type: 'Direct' as RuleType, settings: { is_sequential: false, is_manager_step: false }, approvers: [] }
    ]);
  };

  const addApprover = (idx: number) => {
    setSteps(prev => prev.map((s, i) => i === idx ? { ...s, approvers: [...s.approvers, { approver_id: parseInt(users[0]?.id || '0'), is_required: false, order_index: (s.approvers?.length || 0) + 1 }] } : s));
  };

  const deleteApprover = (stepIdx: number, approverIdx: number) => {
    setSteps(prev => prev.map((s, i) => i === stepIdx ? { ...s, approvers: s.approvers.filter((_: any, j: number) => j !== approverIdx) } : s));
  };

  const save = async () => {
    if (!user) return;
    const payload = {
      company_id: user.company_id,
      name,
      settings: {
        is_manager_approver: isManagerApprover,
        min_approval_percentage: typeof minPct === 'number' ? minPct : null,
      },
      manager_override_id: managerOverrideId && managerOverrideId !== 'none' ? parseInt(managerOverrideId) : undefined,
      steps,
    };
    const res = await apiService.upsertApprovalPolicy(payload as any);
    if (res.success) {
      setOpen(false);
      await load();
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
              <li key={p.id}>{p.name} — {p.steps.length} steps</li>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Description about rules</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <Label>Minimum Approval percentage</Label>
                <div className="flex items-center gap-2">
                  <Input type="number" value={minPct} onChange={(e) => setMinPct(e.target.value === '' ? '' : parseInt(e.target.value))} />
                  <span className="text-neutral-400">%</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Manager</Label>
                <div className="text-neutral-300">The employee's manager will be the first approver.</div>
              </div>
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
                <Label>Override manager with specific approver (optional)</Label>
                <Select value={managerOverrideId || 'none'} onValueChange={setManagerOverrideId}>
                  <SelectTrigger><SelectValue placeholder="Select approver" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {managerCandidates.map(u => (
                      <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="bg-zinc-900 border border-zinc-700 rounded p-4 space-y-4">
              {steps.map((step, idx) => (
                <div key={idx} className="border border-zinc-700 rounded p-3">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                    <div>
                      <Label>Sequence</Label>
                      <Input type="number" value={step.step_sequence}
                        onChange={(e) => setSteps(prev => prev.map((s, i) => i===idx ? { ...s, step_sequence: parseInt(e.target.value) } : s))} />
                    </div>
                    <div>
                      <Label>Rule</Label>
                      <Select value={step.rule_type}
                        onValueChange={(val) => setSteps(prev => prev.map((s, i) => i===idx ? { ...s, rule_type: val as RuleType } : s))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Direct">Direct</SelectItem>
                          <SelectItem value="Percentage">Percentage</SelectItem>
                          <SelectItem value="SpecificApprover">Specific Approver</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {step.rule_type === 'Percentage' && (
                      <div>
                        <Label>Required %</Label>
                        <Input type="number" value={step.percentage_required || ''}
                          onChange={(e) => setSteps(prev => prev.map((s, i) => i===idx ? { ...s, percentage_required: e.target.value === '' ? null : parseInt(e.target.value) } : s))} />
                      </div>
                    )}
                    {step.rule_type === 'SpecificApprover' && (
                      <div>
                        <Label>Approver</Label>
                        <Select value={String(step.specific_approver_id || '')}
                          onValueChange={(val) => setSteps(prev => prev.map((s, i) => i===idx ? { ...s, specific_approver_id: parseInt(val) } : s))}>
                          <SelectTrigger><SelectValue placeholder="Select approver" /></SelectTrigger>
                          <SelectContent>
                            {managerCandidates.map(u => (
                              <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                    <div>
                      <Label>Is Manager Step</Label>
                      <Select value={step.settings?.is_manager_step ? 'yes' : 'no'}
                        onValueChange={(v) => setSteps(prev => prev.map((s, i) => i===idx ? { ...s, settings: { ...s.settings, is_manager_step: v==='yes' } } : s))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="no">No</SelectItem>
                          <SelectItem value="yes">Yes</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Sequential</Label>
                      <Select value={step.settings?.is_sequential ? 'yes' : 'no'}
                        onValueChange={(v) => setSteps(prev => prev.map((s, i) => i===idx ? { ...s, settings: { ...s.settings, is_sequential: v==='yes' } } : s))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="no">No</SelectItem>
                          <SelectItem value="yes">Yes</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end"><Button variant="outline" className="border-zinc-600" onClick={() => addApprover(idx)}>Add Approver</Button></div>
                  </div>

                  {step.rule_type !== 'SpecificApprover' && (
                    <div className="mt-3 space-y-2">
                      {step.approvers.map((appr: any, aIdx: number) => (
                        <div key={aIdx} className="grid grid-cols-1 md:grid-cols-4 gap-3">
                          <div>
                            <Label>Approver</Label>
                            <Select value={String(appr.approver_id)}
                              onValueChange={(val) => setSteps(prev => prev.map((s, i) => i===idx ? { ...s, approvers: s.approvers.map((aa: any, j: number) => j===aIdx ? { ...aa, approver_id: parseInt(val) } : aa) } : s))}>
                              <SelectTrigger><SelectValue placeholder="Select approver" /></SelectTrigger>
                              <SelectContent>
                                {users.map(u => (
                                  <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Order</Label>
                            <Input type="number" value={appr.order_index || ''}
                              onChange={(e) => setSteps(prev => prev.map((s, i) => i===idx ? { ...s, approvers: s.approvers.map((aa: any, j: number) => j===aIdx ? { ...aa, order_index: e.target.value === '' ? null : parseInt(e.target.value) } : aa) } : s))} />
                          </div>
                          <div>
                            <Label>Required</Label>
                            <Select value={appr.is_required ? 'yes' : 'no'}
                              onValueChange={(v) => setSteps(prev => prev.map((s, i) => i===idx ? { ...s, approvers: s.approvers.map((aa: any, j: number) => j===aIdx ? { ...aa, is_required: v==='yes' } : aa) } : s))}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="no">No</SelectItem>
                                <SelectItem value="yes">Yes</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex items-end">
                            <Button variant="outline" className="border-red-600 text-red-400" onClick={() => deleteApprover(idx, aIdx)}>Delete</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <div className="flex justify-between">
                <Button variant="outline" className="border-zinc-600" onClick={addStep}>Add Step</Button>
                <Button onClick={save} className="bg-zinc-700 hover:bg-zinc-600">Save Policy</Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}


