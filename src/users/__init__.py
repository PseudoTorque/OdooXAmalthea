"""
Users module for OdooXAmalthea.

This module provides user management functionality including authentication,
user creation, and role management.
"""

from .main import UsersService, get_users_service

__all__ = [
    'UsersService',
    'get_users_service'
]
