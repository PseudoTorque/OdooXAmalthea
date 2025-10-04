"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useApi } from './api-context';
import { useRouter } from 'next/navigation';
import type { AdminSignupRequest } from './api-context';

// User interface matching the database model
export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'Admin' | 'Manager' | 'Employee';
  company_id: number;
  manager_id?: string;
  created_at: string;
  company?: {
    id: number;
    name: string;
    country_id: number;
    currency_code: string;
  };
}

// Auth context interface
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (request: AdminSignupRequest) => Promise<{ success: boolean; error?: string; user?: User }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth Provider Props
interface AuthProviderProps {
  children: ReactNode;
}

// Auth Provider Component
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const api = useApi();
  const router = useRouter();

  // Load user from localStorage on mount
  useEffect(() => {
    const loadUserFromStorage = () => {
      try {
        const storedUser = localStorage.getItem('odooxamalthea_user');
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
        }
      } catch (error) {
        console.error('Error loading user from localStorage:', error);
        localStorage.removeItem('odooxamalthea_user');
      } finally {
        setIsLoading(false);
      }
    };

    loadUserFromStorage();
  }, []);

  // Save user to localStorage whenever user state changes
  useEffect(() => {
    if (user) {
      localStorage.setItem('odooxamalthea_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('odooxamalthea_user');
    }
  }, [user]);

  // Signup function
  const signup = async (request: AdminSignupRequest): Promise<{ success: boolean; error?: string; user?: User }> => {
    try {
      setIsLoading(true);

      // Call the admin signup API
      const response = await api.adminSignup(request);

      console.log(response)

      if (response.success) {
        // Create user object from signup response
        const newUser: User = {
          id: response.user.id,
          email: response.user.email,
          full_name: response.user.full_name,
          role: response.user.role,
          company_id: response.user.company_id,
          manager_id: undefined,
          created_at: new Date().toISOString(), // Backend doesn't return this, so we'll use current time
          company: {
            id: response.company.id,
            name: response.company.name,
            country_id: response.company.country_id,
            currency_code: response.company.currency_code
          }
        };



        // Set user in state and localStorage
        setUser(newUser);

        return { success: true, user: newUser };
      }
      return { success: false, error: response.error || 'Signup failed' };
    } catch (error: any) {
      console.error('Signup error:', error);
      return { success: false, error: error.message || 'Signup failed. Please try again.' };
    } finally {
      setIsLoading(false);
    }
  };

  // Login function
  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);

      // Call the login API endpoint through the API context
      const response = await api.login(email, password);

      if (response.id) {
        // Create user object from login response
        const newUser: User = {
          id: response.id,
          email: response.email,
          full_name: response.full_name,
          role: response.role as 'Admin' | 'Manager' | 'Employee',
          company_id: response.company_id,
          manager_id: response.manager_id,
          created_at: new Date().toISOString(), // Backend doesn't return this, so we'll use current time
          // Note: Company details would need to be fetched separately if needed
        };

        // Set user in state and localStorage
        setUser(newUser);

        return { success: true };
      }

      return { success: false, error: response.error || 'Login failed' };
    } catch (error: any) {
      console.error('Login error:', error);
      return { success: false, error: error.message || 'Invalid credentials. Please try again.' };
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = () => {
    setUser(null);
    localStorage.removeItem('odooxamalthea_user');
    router.push('/login');
  };

  // Refresh user data (useful for updating user info after profile changes)
  const refreshUser = async () => {
    if (user) {
      try {
        // In a real app, you'd fetch fresh user data from the API
        // For now, we'll just keep the existing user data
        console.log('Refreshing user data...');
      } catch (error) {
        console.error('Error refreshing user data:', error);
      }
    }
  };

  const isAuthenticated = !!user;

  const contextValue: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    login,
    signup,
    logout,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Protected Route Component
export const ProtectedRoute: React.FC<{
  children: ReactNode;
  allowedRoles?: ('Admin' | 'Manager' | 'Employee')[];
}> = ({ children, allowedRoles }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }

    if (!isLoading && isAuthenticated && allowedRoles && user) {
      if (!allowedRoles.includes(user.role)) {
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
      }
    }
  }, [isAuthenticated, isLoading, user, allowedRoles, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-neutral-300">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect to login
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return null; // Will redirect to appropriate dashboard
  }

  return <>{children}</>;
};

// Public Route Component (for login/signup pages)
export const PublicRoute: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-neutral-300">Loading...</div>
      </div>
    );
  }

  if (isAuthenticated) {
    return null; // Will redirect to dashboard
  }

  return <>{children}</>;
};
