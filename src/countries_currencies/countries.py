"""
Countries service for querying and caching country data from REST Countries API.

This module provides functionality to fetch country information and currency data
from the REST Countries API and cache it in the database for offline access.
"""


from typing import List, Dict, Optional, Any
from datetime import datetime, timedelta
import os

import requests

from database import get_session
from database.models import Country


class CountriesService:
    """
    Service class for managing country data from REST Countries API.

    This class handles querying the REST Countries API, caching the data,
    and providing access to country and currency information.
    """

    API_URL = os.getenv("REST_COUNTRIES_API_URL", "https://restcountries.com/v3.1/all")
    API_FIELDS = "fields=name,currencies"
    CACHE_DURATION_HOURS = int(os.getenv("REST_COUNTRIES_CACHE_DURATION_HOURS", 24))  # Cache data for 24 hours

    def __init__(self):
        """Initialize the CountriesService."""
        self.session = get_session()

    def _is_cache_valid(self, country_record: Country) -> bool:
        """
        Check if cached country data is still valid.

        Args:
            country_record: The Countries database record to check

        Returns:
            bool: True if cache is valid, False if needs refresh
        """
        if not country_record:
            return False

        cache_age = datetime.utcnow() - country_record.last_updated
        return cache_age < timedelta(hours=self.CACHE_DURATION_HOURS)

    def _fetch_from_api(self) -> List[Dict[str, Any]]:
        """
        Fetch country data from the REST Countries API.

        Returns:
            List of country data dictionaries

        Raises:
            requests.RequestException: If API request fails
        """
        url = f"{self.API_URL}?{self.API_FIELDS}"
        response = requests.get(url, timeout=30)

        if response.status_code != 200:
            raise requests.RequestException(
                f"API request failed with status {response.status_code}: {response.text}"
            )

        return response.json()

    def _extract_currency_data(self, currency_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Extract currency data from API response.

        IMPORTANT: Only extracts the first currency from the provided data from the API response.
        """
        
        target = list(currency_data.keys())[0]
        return {
            "code": target,
            "name": currency_data[target].get('name', ''),
            "symbol": currency_data[target].get('symbol', '')
        }

    def _process_api_data(self, api_data: List[Dict[str, Any]]) -> List[Country]:
        """
        Process API data into Countries model instances.

        Args:
            api_data: Raw data from REST Countries API

        Returns:
            List of Countries model instances
        """
        countries = []

        for country_data in api_data:
            try:
                name_info = country_data.get('name', {})
                currencies = country_data.get('currencies', {})

                if not name_info or not currencies:
                    raise ValueError(f"Missing required fields in API response for country: {name_info}")

                # Create Countries record
                country = Country(
                    name_common=name_info.get('common', ''),
                    name_official=name_info.get('official', ''),
                    currency_code=self._extract_currency_data(currencies).get('code', ''),
                    currency_name=self._extract_currency_data(currencies).get('name', ''),
                    currency_symbol=self._extract_currency_data(currencies).get('symbol', ''),
                    last_updated=datetime.utcnow(),
                    is_active=True
                )

                countries.append(country)

            except Exception as e:
                print(f"Error processing country data: {e} for country: {name_info}")
                continue

        return countries

    def refresh_cache(self) -> int:
        """
        Refresh the countries cache by fetching fresh data from the API.

        Returns:
            Number of countries cached
        """
        try:
            print("Fetching country data from REST Countries API...")
            api_data = self._fetch_from_api()

            print(f"Received {len(api_data)} countries from API")

            # Process and cache the data
            countries = self._process_api_data(api_data)

            # Clear existing cache
            self.session.query(Country).delete()

            # Add new data
            for country in countries:
                self.session.add(country)

            self.session.commit()

            print(f"Successfully cached {len(countries)} countries")
            return len(countries)

        except Exception as e:
            self.session.rollback()
            print(f"Error refreshing cache: {e}")
            raise

    def get_all_countries(self) -> List[Dict[str, Any]]:
        """
        Get all cached countries.

        Returns:
            List of Country dictionaries
        """
        # Check if we need to refresh the cache
        existing_count = self.session.query(Country).count()

        if existing_count == 0:
            print("No cached countries found, fetching from API...")
            self.refresh_cache()
        else:
            # Check if the most recent record needs updating
            latest_country = self.session.query(Country).order_by(
                Country.last_updated.desc()
            ).first()

            if not self._is_cache_valid(latest_country):
                print("Cache is stale, refreshing...")
                self.refresh_cache()

        return [{
            "id": country.id,
            "name_common": country.name_common,
            "name_official": country.name_official,
            "currency_code": country.currency_code,
            "currency_name": country.currency_name,
            "currency_symbol": country.currency_symbol,
            "last_updated": country.last_updated,
            "is_active": country.is_active
        } for country in self.session.query(Country).filter_by(is_active=True).all()]

    def get_country_by_id(self, country_id: int) -> Optional[Country]:
        """
        Get a country by its id.

        Args:
            country_id: Country id

        Returns:
            Country dictionary or None if not found
        """
        return self.session.query(Country).filter_by(id=country_id, is_active=True).first()

    def get_currency_info(self, country_id: int) -> Optional[Dict[str, Any]]:
        """
        Get currency information for a specific country.

        Args:
            country_id: Country id

        Returns:
            Dictionary of currency information or None if not found
        """
        country = self.get_country_by_id(country_id)
        return country.get_currency_data() if country else None

    def __enter__(self):
        """Context manager entry."""
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit."""
        self.session.close()


def get_countries_service() -> CountriesService:
    """
    Convenience function to get a CountriesService instance.

    Returns:
        CountriesService instance
    """
    return CountriesService()
