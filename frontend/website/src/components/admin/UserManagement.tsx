"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useApi } from '@/lib/api-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'Admin' | 'Manager' | 'Employee';
  company_id: number;
  manager_id?: string;
}

interface CreateUserData {
  email: string;
  full_name: string;
  password: string;
  role: 'Admin' | 'Manager' | 'Employee';
  company_id: number;
  manager_id?: string;
}

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);


  const { user } = useAuth();
  const api = useApi();
  const [createFormData, setCreateFormData] = useState<CreateUserData>({
    email: '',
    full_name: '',
    password: '',
    role: 'Employee',
    company_id: user?.company_id || 0,
    manager_id: null,
  });

  // Get available managers (users with Manager role)
  const getAvailableManagers = () => {
    return users.filter(user => user.role === 'Manager');
  };

  // Fetch users when component mounts
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    if (!user?.company_id) return;

    try {
      setLoading(true);
      const response = await api.request(`/users/company/${user.company_id}`);
      if (response.success) {
        setUsers(response.users);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await api.request('/users', {
        method: 'POST',
        body: JSON.stringify(createFormData),
      });

      if (response.success) {
        setShowCreateForm(false);
        setCreateFormData({
          email: '',
          full_name: '',
          password: '',
          role: 'Employee',
          company_id: user?.company_id || 0,
          manager_id: undefined,
        });
        fetchUsers(); // Refresh the list
      }
    } catch (error: any) {
      console.error('Error creating user:', error);
      alert(error.message || 'Failed to create user');
    }
  };

  const handleUpdateUser = async (userId: string, updateData: Partial<User>) => {
    try {
      const response = await api.request(`/users/${userId}`, {
        method: 'POST', // Using POST for update as per the endpoint
        body: JSON.stringify(updateData),
      });

      if (response.success) {
        fetchUsers(); // Refresh the list
        setEditingUser(null);
      }
    } catch (error: any) {
      console.error('Error updating user:', error);
      alert(error.message || 'Failed to update user');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      // For now, we'll just mark as inactive rather than delete
      await handleUpdateUser(userId, { role: 'Inactive' as any });
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-neutral-300">Loading users...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-neutral-200">User Management</h2>
        <Button
          onClick={() => setShowCreateForm(true)}
          className="bg-zinc-700 hover:bg-zinc-600 text-neutral-200"
        >
          Add New User
        </Button>
      </div>

      {/* Create User Form */}
      {showCreateForm && (
        <div className="bg-black border border-zinc-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-neutral-200 mb-4">Create New User</h3>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="create-email">Email</Label>
                <Input
                  id="create-email"
                  type="email"
                  value={createFormData.email}
                  onChange={(e) => setCreateFormData(prev => ({ ...prev, email: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="create-name">Full Name</Label>
                <Input
                  id="create-name"
                  type="text"
                  value={createFormData.full_name}
                  onChange={(e) => setCreateFormData(prev => ({ ...prev, full_name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="create-password">Password</Label>
                <Input
                  id="create-password"
                  type="password"
                  value={createFormData.password}
                  onChange={(e) => setCreateFormData(prev => ({ ...prev, password: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="create-role">Role</Label>
                <Select
                  value={createFormData.role}
                  onValueChange={(value) => setCreateFormData(prev => ({ ...prev, role: value as any }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Employee">Employee</SelectItem>
                    <SelectItem value="Manager">Manager</SelectItem>
                    <SelectItem value="Admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {createFormData.role === 'Employee' && (
                <div>
                  <Label htmlFor="create-manager">Manager (Optional)</Label>
                  <Select
                    value={createFormData.manager_id || ''}
                    onValueChange={(value) => setCreateFormData(prev => ({ ...prev, manager_id: value === "No Manager" ? null : value || null }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a manager" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="No Manager">No Manager</SelectItem>
                      {getAvailableManagers().map((manager) => (
                        <SelectItem key={manager.id} value={manager.id}>
                          {manager.full_name} ({manager.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="bg-zinc-700 hover:bg-zinc-600">
                Create User
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateForm(false)}
                className="border-zinc-600 text-neutral-300 hover:bg-zinc-800"
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-zinc-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-300 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-300 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-300 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-300 uppercase tracking-wider">
                  Manager
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-600">
              {users.filter(user => user.role !== 'Admin').map((user) => (
                <tr key={user.id} className="hover:bg-zinc-700">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-200">
                    {editingUser?.id === user.id ? (
                      <Input
                        value={editingUser.full_name}
                        onChange={(e) => setEditingUser(prev => prev ? { ...prev, full_name: e.target.value } : null)}
                        className="bg-zinc-600 border-zinc-500 text-neutral-200"
                      />
                    ) : (
                      user.full_name
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-200">
                    {user.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-200">
                    {editingUser?.id === user.id ? (
                      <Select
                        value={editingUser.role}
                        onValueChange={(value) => setEditingUser(prev => prev ? { ...prev, role: value as any } : null)}
                      >
                        <SelectTrigger className="bg-zinc-600 border-zinc-500">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Employee">Employee</SelectItem>
                          <SelectItem value="Manager">Manager</SelectItem>
                          <SelectItem value="Admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        user.role === 'Admin' ? 'bg-red-900/20 text-red-400' :
                        user.role === 'Manager' ? 'bg-blue-900/20 text-blue-400' :
                        'bg-green-900/20 text-green-400'
                      }`}>
                        {user.role}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-200">
                    {editingUser?.id === user.id ? (
                      editingUser.role === 'Employee' ? (
                        <Select
                          value={editingUser.manager_id || ''}
                          onValueChange={(value) => setEditingUser(prev => prev ? { ...prev, manager_id: value === "No Manager" ? null : value || null } : null)}
                        >
                          <SelectTrigger className="bg-zinc-600 border-zinc-500">
                            <SelectValue placeholder="Select a manager" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="No Manager">No Manager</SelectItem>
                            {getAvailableManagers().map((manager) => (
                              <SelectItem key={manager.id} value={manager.id}>
                                {manager.full_name} ({manager.email})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-neutral-400">N/A</span>
                      )
                    ) : (
                      user.role === 'Employee' ? (
                        user.manager_id ?
                          (() => {
                            const manager = users.find(m => m.id === user.manager_id);
                            return manager ? `${manager.full_name} (${manager.email})` : 'Unknown Manager';
                          })()
                          : 'No Manager'
                      ) : (
                        <span className="text-neutral-400">N/A</span>
                      )
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex gap-2">
                      {editingUser?.id === user.id ? (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleUpdateUser(user.id, editingUser)}
                            className="bg-zinc-600 hover:bg-zinc-500"
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingUser(null)}
                            className="border-zinc-600 text-neutral-300 hover:bg-zinc-800"
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingUser(user)}
                            className="border-zinc-600 text-neutral-300 hover:bg-zinc-800"
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteUser(user.id)}
                            className="border-red-600 text-red-400 hover:bg-red-900/20"
                          >
                            Delete
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {users.filter(user => user.role !== 'Admin').length === 0 && !loading && (
        <div className="text-center py-8 text-neutral-400">
          No users found in your company.
        </div>
      )}
    </div>
  );
}
