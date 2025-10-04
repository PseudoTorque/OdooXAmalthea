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

  private async request<T>(
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
}

// Export singleton instance
export const apiService = new ApiService();
