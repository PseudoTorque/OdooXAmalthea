"""
Countries and Currencies module for OdooXAmalthea.

This module provides access to country and currency data from the REST Countries API.
"""

from .countries import CountriesService, get_countries_service
from .currencies import ExchangeRateService, get_exchange_rate_service  # Import currency utilities if any

__all__ = [
    'CountriesService',
    'get_countries_service',
    'ExchangeRateService',
    'get_exchange_rate_service'
]
