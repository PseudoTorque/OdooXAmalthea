"""
Exchange Rates service for querying and caching exchange rate data from exchangerate-api.com.

This module provides functionality to fetch currency exchange rates and cache them
in the database for offline access with a shorter TTL than country data.
"""

import requests
import json
import os
from typing import List, Dict, Optional, Any
from datetime import datetime, timedelta
from decimal import Decimal

from database import get_session
from database.models import ExchangeRate, Company


class ExchangeRateService:
    """
    Service class for managing exchange rate data from exchangerate-api.com.

    This class handles querying the exchange rate API, caching the data,
    and providing access to currency exchange rate information.
    """

    API_URL_TEMPLATE = os.getenv("EXCHANGE_RATE_API_URL", "https://api.exchangerate-api.com/v4/latest/{currency_code}")
    CACHE_DURATION_HOURS = int(os.getenv("EXCHANGE_RATE_CACHE_DURATION_HOURS", 1))  # Cache for 2 hours (shorter than countries)

    def __init__(self):
        """Initialize the ExchangeRateService."""
        self.session = get_session()

    def _is_cache_valid(self, rate_record: ExchangeRate) -> bool:
        """
        Check if cached exchange rate data is still valid.

        Args:
            rate_record: The ExchangeRate database record to check

        Returns:
            bool: True if cache is valid, False if needs refresh
        """
        if not rate_record:
            return False

        cache_age = datetime.utcnow() - rate_record.last_updated
        return cache_age < timedelta(hours=self.CACHE_DURATION_HOURS)

    def _fetch_from_api(self, base_currency: str) -> Dict[str, Any]:
        """
        Fetch exchange rate data from exchangerate-api.com.

        Args:
            base_currency: The base currency code (e.g., 'USD', 'EUR')

        Returns:
            API response data

        Raises:
            requests.RequestException: If API request fails
        """
        url = self.API_URL_TEMPLATE.format(currency_code=base_currency.upper())
        response = requests.get(url, timeout=30)

        if response.status_code != 200:
            raise requests.RequestException(
                f"API request failed with status {response.status_code}: {response.text}"
            )

        return response.json()

    def _process_api_data(self, api_data: Dict[str, Any], base_currency: str) -> List[ExchangeRate]:
        """
        Process API data into ExchangeRate model instances.

        Args:
            api_data: Raw data from exchangerate-api.com
            base_currency: The base currency for this data

        Returns:
            List of ExchangeRate model instances
        """
        rates = []

        try:
            # Extract data from API response
            api_base = api_data.get('base', '').upper()
            api_date_str = api_data.get('date', '')
            time_last_updated = api_data.get('time_last_updated', 0)
            rates_data = api_data.get('rates', {})

            if not api_base or not rates_data:
                raise ValueError("Missing required fields in API response")

            # Parse the date
            try:
                api_date = datetime.strptime(api_date_str, '%Y-%m-%d')
            except ValueError:
                # Fallback to current date if parsing fails
                api_date = datetime.utcnow()

            # Create ExchangeRate records for each currency
            for target_currency, rate_value in rates_data.items():
                if target_currency == api_base:
                    continue  # Skip the base currency itself

                try:
                    rate = ExchangeRate(
                        base_currency=api_base,
                        target_currency=target_currency.upper(),
                        rate=Decimal(str(rate_value)),
                        api_date=api_date,
                        time_last_updated=time_last_updated,
                        last_updated=datetime.utcnow(),
                        is_active=True
                    )
                    rates.append(rate)

                except Exception as e:
                    print(f"Error processing rate for {api_base} -> {target_currency}: {e}")
                    continue

        except Exception as e:
            print(f"Error processing API data: {e}")
            raise

        return rates

    def refresh_cache(self, base_currency: str) -> int:
        """
        Refresh the exchange rates cache for a specific base currency.

        Args:
            base_currency: The base currency code (e.g., 'USD', 'EUR')

        Returns:
            Number of rates cached
        """
        try:
            print(f"Fetching exchange rates for base currency: {base_currency}")
            api_data = self._fetch_from_api(base_currency)

            print(f"Received rates data from API for {api_data.get('base', 'unknown')}")

            # Process and cache the data
            rates = self._process_api_data(api_data, base_currency)

            # Clear existing cache for this base currency
            self.session.query(ExchangeRate).filter_by(
                base_currency=base_currency.upper()
            ).delete()

            # Add new data
            for rate in rates:
                self.session.add(rate)

            self.session.commit()

            print(f"Successfully cached {len(rates)} exchange rates for {base_currency}")
            return len(rates)

        except Exception as e:
            self.session.rollback()
            print(f"Error refreshing cache: {e}")
            raise

    def get_exchange_rate(self, base_currency: str, target_currency: str) -> Optional[Dict[str, Any]]:
        """
        Get the exchange rate from base currency to target currency.

        Args:
            base_currency: Base currency code (e.g., 'USD')
            target_currency: Target currency code (e.g., 'EUR')

        Returns:
            Exchange rate data dictionary or None if not found
        """
        # Check if we need to refresh the cache for this base currency
        latest_rate = self.session.query(ExchangeRate).filter_by(
            base_currency=base_currency.upper(),
            target_currency=target_currency.upper(),
            is_active=True
        ).order_by(ExchangeRate.last_updated.desc()).first()

        if not latest_rate or not self._is_cache_valid(latest_rate):
            print(f"Cache miss or stale for {base_currency}->{target_currency}, refreshing...")
            try:
                self.refresh_cache(base_currency)
                # Re-query after refresh
                latest_rate = self.session.query(ExchangeRate).filter_by(
                    base_currency=base_currency.upper(),
                    target_currency=target_currency.upper(),
                    is_active=True
                ).order_by(ExchangeRate.last_updated.desc()).first()
            except Exception as e:
                print(f"Failed to refresh cache for {base_currency}: {e}")
                return None

        return latest_rate.get_rate_data() if latest_rate else None

    def get_all_rates_for_base(self, base_currency: str) -> List[Dict[str, Any]]:
        """
        Get all exchange rates for a specific base currency.

        Args:
            base_currency: Base currency code

        Returns:
            List of exchange rate dictionaries
        """
        # Check if we need to refresh the cache
        existing_count = self.session.query(ExchangeRate).filter_by(
            base_currency=base_currency.upper(),
            is_active=True
        ).count()

        if existing_count == 0:
            print(f"No cached rates found for {base_currency}, fetching from API...")
            self.refresh_cache(base_currency)
        else:
            # Check if the most recent record needs updating
            latest_rate = self.session.query(ExchangeRate).filter_by(
                base_currency=base_currency.upper(),
                is_active=True
            ).order_by(ExchangeRate.last_updated.desc()).first()

            if not self._is_cache_valid(latest_rate):
                print(f"Cache is stale for {base_currency}, refreshing...")
                self.refresh_cache(base_currency)

        # Return all rates for this base currency
        rates = self.session.query(ExchangeRate).filter_by(
            base_currency=base_currency.upper(),
            is_active=True
        ).all()

        return [rate.get_rate_data() for rate in rates]

    def convert_currency(self, amount: float, from_currency: str, to_currency: str) -> Optional[float]:
        """
        Convert an amount from one currency to another.

        Args:
            amount: Amount to convert
            from_currency: Source currency code
            to_currency: Target currency code

        Returns:
            Converted amount or None if conversion not possible
        """
        # If currencies are the same, return original amount
        if from_currency.upper() == to_currency.upper():
            return amount

        # Get the exchange rate
        rate_data = self.get_exchange_rate(from_currency, to_currency)
        if rate_data:
            return float(amount) * float(rate_data['rate'])

        # If direct rate not available, try reverse rate
        reverse_rate_data = self.get_exchange_rate(to_currency, from_currency)
        if reverse_rate_data:
            return float(amount) / float(reverse_rate_data['rate'])

        return None

    def convert_currency_to_company_currency(self, company_id: int, amount: float, from_currency: str) -> Optional[float]:
        """
        Convert an amount from one currency to the company currency.
        """
        company = self.session.query(Company).filter_by(id=company_id).first()
        if not company:
            return None
        return self.convert_currency(amount, from_currency, company.currency_code)

    def get_supported_currencies(self) -> List[str]:
        """
        Get list of all currencies that have exchange rate data cached.

        Returns:
            List of currency codes
        """
        currencies = self.session.query(ExchangeRate.target_currency).distinct().all()
        return [curr[0] for curr in currencies]

    def get_cache_info(self) -> Dict[str, Any]:
        """
        Get information about the current cache state.

        Returns:
            Dictionary with cache statistics
        """
        total_rates = self.session.query(ExchangeRate).filter_by(is_active=True).count()

        # Get the most recent update time
        latest_update = self.session.query(ExchangeRate.last_updated).order_by(
            ExchangeRate.last_updated.desc()
        ).first()

        return {
            "total_cached_rates": total_rates,
            "cache_ttl_hours": self.CACHE_DURATION_HOURS,
            "last_updated": latest_update[0] if latest_update else None,
            "supported_currencies": len(self.get_supported_currencies())
        }

    def __enter__(self):
        """Context manager entry."""
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit."""
        self.session.close()


def get_exchange_rate_service() -> ExchangeRateService:
    """
    Convenience function to get an ExchangeRateService instance.

    Returns:
        ExchangeRateService instance
    """
    return ExchangeRateService()
