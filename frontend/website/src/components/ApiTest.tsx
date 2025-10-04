"use client";

import { useApi } from '../lib/api-context';
import { useState, useEffect } from 'react';

export default function ApiTest() {
  const {
    checkHealth,
    checkDBHealth,
    getCountries,
    getExchangeRates,
    convertCurrency,
    adminSignup
  } = useApi();

  const [healthStatus, setHealthStatus] = useState<string>('');
  const [dbStatus, setDbStatus] = useState<string>('');
  const [countries, setCountries] = useState<any[]>([]);
  const [exchangeRates, setExchangeRates] = useState<any[]>([]);
  const [conversion, setConversion] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Test health check on component mount
  useEffect(() => {
    const testHealth = async () => {
      try {
        const health = await checkHealth();
        setHealthStatus(health.message);
      } catch (error) {
        setHealthStatus(`Error: ${error}`);
      }
    };

    const testDBHealth = async () => {
      try {
        const dbHealth = await checkDBHealth();
        setDbStatus(dbHealth.status);
      } catch (error) {
        setDbStatus(`Error: ${error}`);
      }
    };

    testHealth();
    testDBHealth();
  }, [checkHealth, checkDBHealth]);

  const handleGetCountries = async () => {
    setLoading(true);
    try {
      const countriesData = await getCountries();
      setCountries(countriesData.slice(0, 5)); // Show first 5 countries
    } catch (error) {
      console.error('Error fetching countries:', error);
    }
    setLoading(false);
  };

  const handleGetExchangeRates = async () => {
    setLoading(true);
    try {
      const rates = await getExchangeRates('USD');
      setExchangeRates(rates.rates.slice(0, 5)); // Show first 5 rates
    } catch (error) {
      console.error('Error fetching exchange rates:', error);
    }
    setLoading(false);
  };

  const handleConvertCurrency = async () => {
    setLoading(true);
    try {
      const conversion = await convertCurrency('USD', 'EUR', 100);
      setConversion(conversion);
    } catch (error) {
      console.error('Error converting currency:', error);
    }
    setLoading(false);
  };

  const handleSignup = async () => {
    setLoading(true);
    try {
      const signupData = {
        full_name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        company_name: 'Test Company',
        country_id: 1
      };
      const result = await adminSignup(signupData);
      alert(`Signup result: ${result.message}`);
    } catch (error) {
      console.error('Error signing up:', error);
      alert(`Signup error: ${error}`);
    }
    setLoading(false);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">API Integration Test</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Health Status */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-3">Health Status</h2>
          <p className="text-green-600">API: {healthStatus}</p>
          <p className="text-blue-600">Database: {dbStatus}</p>
        </div>

        {/* API Actions */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-3">API Actions</h2>
          <div className="space-y-2">
            <button
              onClick={handleGetCountries}
              disabled={loading}
              className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 disabled:opacity-50"
            >
              Get Countries
            </button>
            <button
              onClick={handleGetExchangeRates}
              disabled={loading}
              className="w-full bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600 disabled:opacity-50"
            >
              Get Exchange Rates (USD)
            </button>
            <button
              onClick={handleConvertCurrency}
              disabled={loading}
              className="w-full bg-purple-500 text-white py-2 px-4 rounded hover:bg-purple-600 disabled:opacity-50"
            >
              Convert 100 USD to EUR
            </button>
            <button
              onClick={handleSignup}
              disabled={loading}
              className="w-full bg-orange-500 text-white py-2 px-4 rounded hover:bg-orange-600 disabled:opacity-50"
            >
              Test Signup
            </button>
          </div>
        </div>

        {/* Countries */}
        {countries.length > 0 && (
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-3">Countries (First 5)</h2>
            <div className="space-y-2">
              {countries.map((country) => (
                <div key={country.id} className="flex justify-between">
                  <span>{country.name}</span>
                  <span className="text-gray-500">{country.currency_code}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Exchange Rates */}
        {exchangeRates.length > 0 && (
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-3">Exchange Rates (First 5)</h2>
            <div className="space-y-2">
              {exchangeRates.map((rate) => (
                <div key={rate.currency_code} className="flex justify-between">
                  <span>{rate.currency_code}</span>
                  <span>{rate.rate}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Currency Conversion */}
        {conversion && (
          <div className="bg-white p-4 rounded-lg shadow md:col-span-2">
            <h2 className="text-xl font-semibold mb-3">Currency Conversion</h2>
            <div className="text-lg">
              <p>Amount: {conversion.amount} {conversion.base_currency}</p>
              <p>Exchange Rate: {conversion.exchange_rate}</p>
              <p>Converted: {conversion.converted_amount} {conversion.target_currency}</p>
            </div>
          </div>
        )}
      </div>

      {loading && (
        <div className="mt-4 text-center">
          <p className="text-gray-500">Loading...</p>
        </div>
      )}
    </div>
  );
}
