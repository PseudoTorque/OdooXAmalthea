"use client";

import React, { createContext, useContext, ReactNode } from 'react';
import { apiService } from '@/lib/api-service';

// API Response Types
export interface HealthResponse {
  status: string;
  message: string;
}

export interface DBHealthResponse {
  status: string;
  database: string;
  engine?: string;
  error?: string;
}

export interface Country {
  id: number;
  name_common: string;
  name_official: string;
  code: string;
  currency_code: string;
  currency_name: string;
  currency_symbol: string;
  last_updated: string;
  is_active: boolean;
}

export interface ExchangeRate {
  currency_code: string;
  rate: number;
  last_updated: string;
}

export interface ExchangeRatesResponse {
  base_currency: string;
  rates: ExchangeRate[];
}

export interface CurrencyConversionResponse {
  amount: number;
  base_currency: string;
  target_currency: string;
  converted_amount: number;
  exchange_rate: number;
}

export interface AdminSignupRequest {
  full_name: string;
  email: string;
  password: string;
  company_name: string;
  country_id: number;
}

export interface AdminSignupResponse {
  success: boolean;
  error?: string;
  user?: any;
  company?: any;
}

// Login response interface
export interface LoginResponse {
  id: string;
  email: string;
  full_name: string;
  role: string;
  company_id: number;
  manager_id?: string;
  error?: string;
}

// API Context Interface
interface ApiContextType {
  // Health endpoints
  checkHealth: () => Promise<HealthResponse>;
  checkDBHealth: () => Promise<DBHealthResponse>;

  // Countries endpoints
  getCountries: () => Promise<Country[]>;

  // Exchange rates endpoints
  getExchangeRates: (baseCurrency: string) => Promise<ExchangeRatesResponse>;
  convertCurrency: (baseCurrency: string, targetCurrency: string, amount: number) => Promise<CurrencyConversionResponse>;

  // User endpoints
  adminSignup: (request: AdminSignupRequest) => Promise<AdminSignupResponse>;
  login: (email: string, password: string) => Promise<LoginResponse>;
}

// Create context
const ApiContext = createContext<ApiContextType | undefined>(undefined);

// API Provider Props
interface ApiProviderProps {
  children: ReactNode;
}

// API Provider Component
export const ApiProvider: React.FC<ApiProviderProps> = ({ children }) => {
  const api = apiService;

  const contextValue: ApiContextType = {
    checkHealth: () => api.checkHealth(),
    checkDBHealth: () => api.checkDBHealth(),
    getCountries: () => api.getCountries(),
    getExchangeRates: (baseCurrency: string) => api.getExchangeRates(baseCurrency),
    convertCurrency: (baseCurrency: string, targetCurrency: string, amount: number) => api.convertCurrency(baseCurrency, targetCurrency, amount),
    adminSignup: (request: AdminSignupRequest) => api.adminSignup(request),
    login: (email: string, password: string) => api.login(email, password),
  };

  return (
    <ApiContext.Provider value={contextValue}>
      {children}
    </ApiContext.Provider>
  );
};

// Custom hook to use API context
export const useApi = (): ApiContextType => {
  const context = useContext(ApiContext);
  if (context === undefined) {
    throw new Error('useApi must be used within an ApiProvider');
  }
  return context;
};
