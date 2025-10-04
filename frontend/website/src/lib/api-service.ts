// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// API Response Types (matching the context types)
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
  error: string;
  user_id?: number;
}

export interface LoginResponse {
  id: string;
  email: string;
  full_name: string;
  role: string;
  company_id: number;
  manager_id?: string;
  error?: string;
}

// -------- Users Types --------
export interface UserSummary {
  id: string;
  email: string;
  full_name: string;
  role: 'Admin' | 'Manager' | 'Employee';
  company_id: number;
  manager_id?: string | null;
}

export interface UsersByCompanyResponse {
  success: boolean;
  users: UserSummary[];
  error?: string;
}

export interface CreateUserRequest {
  email: string;
  full_name: string;
  password: string;
  role: 'Admin' | 'Manager' | 'Employee';
  company_id: number;
  manager_id?: string | null;
}

export interface CreateUserResponse {
  success: boolean;
  message?: string;
  user?: UserSummary;
  error?: string;
}

export interface UpdateUserResponse {
  success: boolean;
  message?: string;
  user?: any;
  error?: string;
}

// -------- Approvals Types --------
export interface SimplifiedPolicyApproverDTO {
  id?: number;
  approver_id: number;
  order_index?: number | null;
}

export interface ApprovalPolicyDTO {
  id?: number;
  company_id: number;
  user_id: number;
  name: string;
  override_manager_id?: number | null;
  is_manager_approver?: boolean;
  is_sequential?: boolean;
  min_approval_percentage?: number | null;
  approvers: SimplifiedPolicyApproverDTO[];
}

export interface UpsertPolicyResponse {
  success: boolean;
  policy_id?: number;
  error?: string;
}

export interface GetPoliciesResponse {
  success: boolean;
  policies: ApprovalPolicyDTO[];
  error?: string;
}

export interface GetPolicyByUserResponse {
  success: boolean;
  policy: ApprovalPolicyDTO | null;
  error?: string;
}

export interface PendingApprovalItem {
  expense_id: number;
  employee_id: number;
  category: string;
  description: string;
  amount: number;
  currency_code: string;
  amount_in_company_currency: number;
  expense_date: string;
}

export interface PendingApprovalsResponse {
  success: boolean;
  approvals: PendingApprovalItem[];
  error?: string;
}

export interface ApprovalActionResponse {
  success: boolean;
  status?: 'Submitted' | 'Approved' | 'Rejected';
  next_approvers?: number[];
  error?: string;
}

// Generic API error interface
interface ApiError {
  detail?: string;
  message?: string;
}

// API Service Class
class ApiService {
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;

    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const errorData: ApiError = await response.json().catch(() => ({}));
        throw new Error(
          errorData.detail || errorData.message || `HTTP error! status: ${response.status}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  // Health endpoints
  async checkHealth(): Promise<HealthResponse> {
    return this.request<HealthResponse>('/health', {
      method: 'GET',
    });
  }

  async checkDBHealth(): Promise<DBHealthResponse> {
    return this.request<DBHealthResponse>('/db-health', {
      method: 'GET',
    });
  }

  // Countries endpoints
  async getCountries(): Promise<Country[]> {
    return this.request<Country[]>('/countries', {
      method: 'GET',
    });
  }

  // Exchange rates endpoints
  async getExchangeRates(baseCurrency: string): Promise<ExchangeRatesResponse> {
    return this.request<ExchangeRatesResponse>(`/exchange-rates/${baseCurrency}`, {
      method: 'GET',
    });
  }

  async convertCurrency(
    baseCurrency: string,
    targetCurrency: string,
    amount: number
  ): Promise<CurrencyConversionResponse> {
    return this.request<CurrencyConversionResponse>(
      `/exchange-rates/${baseCurrency}/${targetCurrency}/${amount}`
    );
  }

  // User endpoints
  async adminSignup(request: AdminSignupRequest): Promise<AdminSignupResponse> {
    return this.request<AdminSignupResponse>('/signup', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async login(email: string, password: string): Promise<LoginResponse> {
    return this.request<LoginResponse>('/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  // -------- Users --------
  async getUsersByCompany(companyId: number, userType: string = 'all'): Promise<UsersByCompanyResponse> {
    return this.request<UsersByCompanyResponse>(`/users/company/${companyId}?user_type=${userType}`, { method: 'GET' });
  }

  async createUser(payload: CreateUserRequest): Promise<CreateUserResponse> {
    return this.request<CreateUserResponse>('/users', { method: 'POST', body: JSON.stringify(payload) });
  }

  async updateUser(userId: string | number, payload: Partial<UserSummary> & { password?: string }): Promise<UpdateUserResponse> {
    return this.request<UpdateUserResponse>(`/users/${userId}`, { method: 'POST', body: JSON.stringify(payload) });
  }

  // -------- Approvals --------
  async getApprovalPolicies(companyId: number): Promise<GetPoliciesResponse> {
    return this.request<GetPoliciesResponse>(`/approvals/policies/${companyId}`, {
      method: 'GET',
    });
  }

  async upsertApprovalPolicy(payload: ApprovalPolicyDTO): Promise<UpsertPolicyResponse> {
    return this.request<UpsertPolicyResponse>('/approvals/policies', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getApprovalPolicyForUser(userId: number): Promise<GetPolicyByUserResponse> {
    return this.request<GetPolicyByUserResponse>(`/approvals/policy/user/${userId}`, {
      method: 'GET',
    });
  }

  async getPendingApprovals(approverId: number): Promise<PendingApprovalsResponse> {
    return this.request<PendingApprovalsResponse>(`/approvals/pending/${approverId}`, {
      method: 'GET',
    });
  }

  async approvalAction(expenseId: number, approverId: number, action: 'Approved' | 'Rejected', comments?: string): Promise<ApprovalActionResponse> {
    return this.request<ApprovalActionResponse>(`/approvals/${expenseId}/action`, {
      method: 'POST',
      body: JSON.stringify({ approver_id: approverId, action, comments }),
    });
  }

  // -------- LLM --------
  async extractReceiptData(imageData: string): Promise<{success: boolean; data?: any; error?: string}> {
    return this.request<{success: boolean; data?: any; error?: string}>('/llm/extract-receipt-data', {
      method: 'POST',
      body: JSON.stringify({ image_data: imageData }),
    });
  }
}

// Export singleton instance
export const apiService = new ApiService();
