"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useApi } from '@/lib/api-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
}

interface Currency {
  code: string;
  name: string;
  symbol: string;
}

interface Expense {
  id: number;
  employee_id: number;
  paid_by_id: number;
  amount: number;
  currency_code: string;
  amount_in_company_currency: number;
  category: string;
  description: string;
  expense_date: string;
  status: 'Draft' | 'Submitted' | 'Approved' | 'Rejected';
  remarks?: string;
  receipt_image_base64?: string;
}

interface NewExpenseData {
  description: string;
  category: string;
  amount: string;
  currency_code: string;
  expense_date: string;
  paid_by_id: string;
  remarks: string;
  receipt_image_base64?: string;
}

export default function ExpenseManagement() {
  const { user } = useAuth();
  const api = useApi();
  
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showNewExpenseForm, setShowNewExpenseForm] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [showDetailView, setShowDetailView] = useState(false);
  const [isEditingExpense, setIsEditingExpense] = useState(false);
  const [editExpenseData, setEditExpenseData] = useState<Expense | null>(null);
  
  // Backend totals
  const [draftTotal, setDraftTotal] = useState(0);
  const [waitingApprovalTotal, setWaitingApprovalTotal] = useState(0);
  const [approvedTotal, setApprovedTotal] = useState(0);
  
  const [newExpenseData, setNewExpenseData] = useState<NewExpenseData>({
    description: '',
    category: '',
    amount: '',
    currency_code: '',
    expense_date: new Date().toISOString().split('T')[0],
    paid_by_id: '',
    remarks: '',
  });

  useEffect(() => {
    if (user) {
      fetchExpenses();
      fetchUsers();
      fetchCurrencies();
      fetchCategories();
    }
  }, [user]);

  const fetchExpenses = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      const response = await api.request(`/expenses/employee/${user.id}`);
      if (response.expense_list) {
        setExpenses(response.expense_list);
        // Update totals from backend
        setDraftTotal(response.pending_total || 0);
        setWaitingApprovalTotal(response.waiting_approval_total || 0);
        setApprovedTotal(response.approved_total || 0);
      }
    } catch (error) {
      console.error('Error fetching expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    if (!user?.company_id) return;
    
    try {
      const response = await api.request(`/users/company/${user.company_id}`);
      if (response.success && response.users) {
        setUsers(response.users);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchCurrencies = async () => {
    try {
      const response = await api.request('/currencies');
      if (response.success && response.currencies) {
        setCurrencies(response.currencies);
      }
    } catch (error) {
      console.error('Error fetching currencies:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await api.request('/expense-categories');
      if (response.success && response.categories) {
        setCategories(response.categories);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const getUserName = (userId: number): string => {
    const foundUser = users.find(u => u.id === userId.toString());
    return foundUser ? foundUser.full_name : 'Unknown';
  };

  // Filter out managers and admins for paid_by selector
  const getEligibleUsers = () => {
    return users.filter(u => u.role !== 'Manager' && u.role !== 'Admin');
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const expensePayload = {
        employee_id: parseInt(user!.id),
        paid_by_id: parseInt(newExpenseData.paid_by_id),
        amount: parseFloat(newExpenseData.amount),
        currency_code: newExpenseData.currency_code,
        company_id: user!.company_id,
        category: newExpenseData.category,
        description: newExpenseData.description,
        expense_date: newExpenseData.expense_date,
        remarks: newExpenseData.remarks,
        receipt_image_base64: newExpenseData.receipt_image_base64 || null,
        status: 'Draft'
      };

      const response = await api.request('/expenses', {
        method: 'POST',
        body: JSON.stringify(expensePayload),
      });

      if (response.success) {
        setShowNewExpenseForm(false);
        setNewExpenseData({
          description: '',
          category: '',
          amount: '',
          currency_code: '',
          expense_date: new Date().toISOString().split('T')[0],
          paid_by_id: '',
          remarks: '',
        });
        fetchExpenses();
      } else {
        alert(response.message || 'Failed to create expense');
      }
    } catch (error: any) {
      console.error('Error creating expense:', error);
      alert(error.message || 'Failed to create expense');
    }
  };

  const handleUpdateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editExpenseData) return;

    try {
      const updatePayload = {
        description: editExpenseData.description,
        category: editExpenseData.category,
        amount: editExpenseData.amount,
        currency_code: editExpenseData.currency_code,
        expense_date: editExpenseData.expense_date,
        paid_by_id: editExpenseData.paid_by_id,
        remarks: editExpenseData.remarks,
      };

      const response = await api.request(`/expenses/${editExpenseData.id}/update`, {
        method: 'POST',
        body: JSON.stringify(updatePayload),
      });

      if (response.success) {
        fetchExpenses();
        setShowDetailView(false);
        setSelectedExpense(null);
        setIsEditingExpense(false);
        setEditExpenseData(null);
      } else {
        alert(response.error || 'Failed to update expense');
      }
    } catch (error: any) {
      console.error('Error updating expense:', error);
      alert(error.message || 'Failed to update expense');
    }
  };

  const handleUpdateExpenseStatus = async (expenseId: number, newStatus: string) => {
    try {
      const response = await api.request(`/expenses/${expenseId}/update`, {
        method: 'POST',
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.success) {
        fetchExpenses();
        setShowDetailView(false);
        setSelectedExpense(null);
        setIsEditingExpense(false);
        setEditExpenseData(null);
      } else {
        alert(response.error || 'Failed to update expense');
      }
    } catch (error: any) {
      console.error('Error updating expense:', error);
      alert(error.message || 'Failed to update expense');
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'Draft':
        return 'bg-gray-900/20 text-gray-400';
      case 'Submitted':
        return 'bg-yellow-900/20 text-yellow-400';
      case 'Approved':
        return 'bg-green-900/20 text-green-400';
      case 'Rejected':
        return 'bg-red-900/20 text-red-400';
      default:
        return 'bg-gray-900/20 text-gray-400';
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setNewExpenseData(prev => ({ ...prev, receipt_image_base64: base64String }));
      };
      reader.readAsDataURL(file);
    }
  };

  if (loading && expenses.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-neutral-300">Loading expenses...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-neutral-200">My Expenses</h2>
          <p className="text-neutral-400 mt-1">Manage and track your expense claims</p>
        </div>
        <Button
          onClick={() => {
            setShowNewExpenseForm(true);
            setShowDetailView(false);
          }}
          className="bg-zinc-700 hover:bg-zinc-600 text-neutral-200"
        >
          New Expense
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-zinc-800 rounded-lg p-6 border border-zinc-700">
          <h3 className="font-medium text-neutral-300 mb-2">Total Expenses</h3>
          <p className="text-2xl font-bold text-neutral-100">{expenses.length}</p>
        </div>
        <div className="bg-zinc-800 rounded-lg p-6 border border-zinc-700">
          <h3 className="font-medium text-neutral-300 mb-2">Draft Total</h3>
          <p className="text-2xl font-bold text-gray-400">
            {draftTotal.toFixed(2)}
          </p>
          <p className="text-xs text-neutral-400 mt-1">
            {expenses.filter(e => e.status === 'Draft').length} expenses
          </p>
        </div>
        <div className="bg-zinc-800 rounded-lg p-6 border border-zinc-700">
          <h3 className="font-medium text-neutral-300 mb-2">Waiting Approval</h3>
          <p className="text-2xl font-bold text-yellow-400">
            {waitingApprovalTotal.toFixed(2)}
          </p>
          <p className="text-xs text-neutral-400 mt-1">
            {expenses.filter(e => e.status === 'Submitted').length} expenses
          </p>
        </div>
        <div className="bg-zinc-800 rounded-lg p-6 border border-zinc-700">
          <h3 className="font-medium text-neutral-300 mb-2">Approved Total</h3>
          <p className="text-2xl font-bold text-green-400">
            {approvedTotal.toFixed(2)}
          </p>
          <p className="text-xs text-neutral-400 mt-1">
            {expenses.filter(e => e.status === 'Approved').length} expenses
          </p>
        </div>
      </div>

      {/* New Expense Dialog */}
      <Dialog open={showNewExpenseForm} onOpenChange={setShowNewExpenseForm}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Create New Expense</DialogTitle>
            <DialogDescription>
              Fill in the details below to create a new expense claim.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateExpense} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newExpenseData.description}
                  onChange={(e) => setNewExpenseData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Restaurant bill for client meeting"
                  required
                  className="bg-zinc-800 border-zinc-600 text-neutral-200"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="category">Category</Label>
                <Select
                  value={newExpenseData.category}
                  onValueChange={(value) => setNewExpenseData(prev => ({ ...prev, category: value }))}
                  required
                >
                  <SelectTrigger className="bg-zinc-800 border-zinc-600 text-neutral-200">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={newExpenseData.amount}
                  onChange={(e) => setNewExpenseData(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="0.00"
                  required
                  className="bg-zinc-800 border-zinc-600 text-neutral-200"
                />
              </div>

              <div>
                <Label htmlFor="currency">Currency</Label>
                <Select
                  value={newExpenseData.currency_code}
                  onValueChange={(value) => setNewExpenseData(prev => ({ ...prev, currency_code: value }))}
                  required
                >
                  <SelectTrigger className="bg-zinc-800 border-zinc-600 text-neutral-200">
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((curr) => (
                      <SelectItem key={curr.code} value={curr.code}>
                        {curr.code} - {curr.name} ({curr.symbol})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="expense_date">Expense Date</Label>
                <Input
                  id="expense_date"
                  type="date"
                  value={newExpenseData.expense_date}
                  onChange={(e) => setNewExpenseData(prev => ({ ...prev, expense_date: e.target.value }))}
                  required
                  className="bg-zinc-800 border-zinc-600 text-neutral-200"
                />
              </div>

              <div>
                <Label htmlFor="paid_by">Paid By</Label>
                <Select
                  value={newExpenseData.paid_by_id}
                  onValueChange={(value) => setNewExpenseData(prev => ({ ...prev, paid_by_id: value }))}
                  required
                >
                  <SelectTrigger className="bg-zinc-800 border-zinc-600 text-neutral-200">
                    <SelectValue placeholder="Select user" />
                  </SelectTrigger>
                  <SelectContent>
                    {getEligibleUsers().map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.full_name} ({u.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="remarks">Remarks (Optional)</Label>
                <Textarea
                  id="remarks"
                  value={newExpenseData.remarks}
                  onChange={(e) => setNewExpenseData(prev => ({ ...prev, remarks: e.target.value }))}
                  placeholder="Additional notes..."
                  className="bg-zinc-800 border-zinc-600 text-neutral-200"
                  rows={2}
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="receipt">Attach Receipt (Optional)</Label>
                <Input
                  id="receipt"
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="bg-zinc-800 border-zinc-600 text-neutral-200"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" className="bg-zinc-700 hover:bg-zinc-600">
                Create Expense
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowNewExpenseForm(false)}
                className="border-zinc-600 text-neutral-300 hover:bg-zinc-800"
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Expense Detail Dialog */}
      <Dialog open={showDetailView} onOpenChange={(open: boolean) => {
        setShowDetailView(open);
        if (!open) {
          setSelectedExpense(null);
          setIsEditingExpense(false);
          setEditExpenseData(null);
        }
      }}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {isEditingExpense ? 'Edit Expense' : 'Expense Details'}
            </DialogTitle>
            <DialogDescription>
              {isEditingExpense ? 'Update the expense information below.' : 'View your expense details.'}
            </DialogDescription>
          </DialogHeader>
          
          {selectedExpense && (
            isEditingExpense && editExpenseData ? (
              // Edit Form for Draft expenses
              <form onSubmit={handleUpdateExpense} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label htmlFor="edit-description">Description</Label>
                    <Textarea
                      id="edit-description"
                      value={editExpenseData.description}
                      onChange={(e) => setEditExpenseData(prev => prev ? { ...prev, description: e.target.value } : null)}
                      className="bg-zinc-800 border-zinc-600 text-neutral-200"
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="edit-category">Category</Label>
                    <Select
                      value={editExpenseData.category}
                      onValueChange={(value) => setEditExpenseData(prev => prev ? { ...prev, category: value } : null)}
                    >
                      <SelectTrigger className="bg-zinc-800 border-zinc-600 text-neutral-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="edit-amount">Amount</Label>
                    <Input
                      id="edit-amount"
                      type="number"
                      step="0.01"
                      value={editExpenseData.amount}
                      onChange={(e) => setEditExpenseData(prev => prev ? { ...prev, amount: parseFloat(e.target.value) } : null)}
                      className="bg-zinc-800 border-zinc-600 text-neutral-200"
                    />
                  </div>

                  <div>
                    <Label htmlFor="edit-currency">Currency</Label>
                    <Select
                      value={editExpenseData.currency_code}
                      onValueChange={(value) => setEditExpenseData(prev => prev ? { ...prev, currency_code: value } : null)}
                    >
                      <SelectTrigger className="bg-zinc-800 border-zinc-600 text-neutral-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {currencies.map((curr) => (
                          <SelectItem key={curr.code} value={curr.code}>
                            {curr.code} - {curr.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="edit-expense_date">Expense Date</Label>
                    <Input
                      id="edit-expense_date"
                      type="date"
                      value={editExpenseData.expense_date}
                      onChange={(e) => setEditExpenseData(prev => prev ? { ...prev, expense_date: e.target.value } : null)}
                      className="bg-zinc-800 border-zinc-600 text-neutral-200"
                    />
                  </div>

                  <div>
                    <Label htmlFor="edit-paid_by">Paid By</Label>
                    <Select
                      value={editExpenseData.paid_by_id.toString()}
                      onValueChange={(value) => setEditExpenseData(prev => prev ? { ...prev, paid_by_id: parseInt(value) } : null)}
                    >
                      <SelectTrigger className="bg-zinc-800 border-zinc-600 text-neutral-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {getEligibleUsers().map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="md:col-span-2">
                    <Label htmlFor="edit-remarks">Remarks (Optional)</Label>
                    <Textarea
                      id="edit-remarks"
                      value={editExpenseData.remarks || ''}
                      onChange={(e) => setEditExpenseData(prev => prev ? { ...prev, remarks: e.target.value } : null)}
                      className="bg-zinc-800 border-zinc-600 text-neutral-200"
                      rows={2}
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="bg-zinc-700 hover:bg-zinc-600">
                    Save Changes
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsEditingExpense(false);
                      setEditExpenseData(null);
                    }}
                    className="border-zinc-600 text-neutral-300 hover:bg-zinc-800"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              // View Mode
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label className="text-neutral-400">Description</Label>
                    <p className="text-neutral-200 mt-1">{selectedExpense.description}</p>
                  </div>

                  <div>
                    <Label className="text-neutral-400">Category</Label>
                    <p className="text-neutral-200 mt-1">{selectedExpense.category}</p>
                  </div>

                  <div>
                    <Label className="text-neutral-400">Amount</Label>
                    <p className="text-neutral-200 mt-1">
                      {selectedExpense.currency_code} {selectedExpense.amount}
                    </p>
                  </div>

                  <div>
                    <Label className="text-neutral-400">Expense Date</Label>
                    <p className="text-neutral-200 mt-1">
                      {new Date(selectedExpense.expense_date).toLocaleDateString()}
                    </p>
                  </div>

                  <div>
                    <Label className="text-neutral-400">Paid By</Label>
                    <p className="text-neutral-200 mt-1">{getUserName(selectedExpense.paid_by_id)}</p>
                  </div>

                  <div>
                    <Label className="text-neutral-400">Status</Label>
                    <div className="mt-1">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(selectedExpense.status)}`}>
                        {selectedExpense.status}
                      </span>
                    </div>
                  </div>

                  {selectedExpense.remarks && (
                    <div className="md:col-span-2">
                      <Label className="text-neutral-400">Remarks</Label>
                      <p className="text-neutral-200 mt-1">{selectedExpense.remarks}</p>
                    </div>
                  )}

                  {selectedExpense.receipt_image_base64 && (
                    <div className="md:col-span-2">
                      <Label className="text-neutral-400">Receipt</Label>
                      <img 
                        src={selectedExpense.receipt_image_base64} 
                        alt="Receipt" 
                        className="mt-2 max-w-md rounded border border-zinc-700"
                      />
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-4 border-t border-zinc-700">
                  {selectedExpense.status === 'Draft' && (
                    <>
                      <Button
                        onClick={() => {
                          setIsEditingExpense(true);
                          setEditExpenseData(selectedExpense);
                        }}
                        className="bg-blue-700 hover:bg-blue-600"
                      >
                        Edit Expense
                      </Button>
                      <Button
                        onClick={() => handleUpdateExpenseStatus(selectedExpense.id, 'Submitted')}
                        className="bg-yellow-700 hover:bg-yellow-600"
                      >
                        Submit for Approval
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )
          )}
        </DialogContent>
      </Dialog>

      {/* Expenses Table */}
      <div className="bg-zinc-800 rounded-lg overflow-hidden border border-zinc-700">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-300 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-300 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-300 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-300 uppercase tracking-wider">
                  Paid By
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-300 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-600">
              {expenses.map((expense) => (
                <tr key={expense.id} className="hover:bg-zinc-700">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-200">
                    {expense.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-200">
                    {new Date(expense.expense_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-200">
                    {expense.category}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-200">
                    {getUserName(expense.paid_by_id)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-200">
                    {expense.currency_code} {expense.amount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(expense.status)}`}>
                      {expense.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedExpense(expense);
                        setShowDetailView(true);
                        setShowNewExpenseForm(false);
                      }}
                      className="border-zinc-600 text-neutral-300 hover:bg-zinc-800"
                    >
                      View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {expenses.length === 0 && !loading && (
        <div className="text-center py-12 bg-zinc-800 rounded-lg border border-zinc-700">
          <p className="text-neutral-400 mb-4">No expenses found</p>
          <Button
            onClick={() => setShowNewExpenseForm(true)}
            className="bg-zinc-700 hover:bg-zinc-600 text-neutral-200"
          >
            Create Your First Expense
          </Button>
        </div>
      )}
    </div>
  );
}

