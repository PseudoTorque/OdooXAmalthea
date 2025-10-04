from typing import Optional
from models.api import AdminSignupRequest
from database import get_session
from database.models import Company, Users, Country
import hashlib
import secrets


class UsersService:
    def __init__(self):
        self.session = get_session()

    def _hash_password(self, password: str) -> str:
        """
        Hash a password using SHA-256 with a random salt.

        Args:
            password: Plain text password

        Returns:
            Hashed password string
        """
        salt = secrets.token_hex(16)  # Generate a random salt
        pwdhash = hashlib.sha256((password + salt).encode('utf-8')).hexdigest()
        return f"{salt}:{pwdhash}"

    def _verify_password(self, password: str, hashed_password: str) -> bool:
        """
        Verify a password against its hash.

        Args:
            password: Plain text password
            hashed_password: Previously hashed password

        Returns:
            True if password matches, False otherwise
        """
        try:
            salt, pwdhash = hashed_password.split(':')
            return hashlib.sha256((password + salt).encode('utf-8')).hexdigest() == pwdhash
        except (ValueError, AttributeError):
            return False

    def handle_admin_signup(self, request: AdminSignupRequest) -> dict:
        """
        Handle admin user signup by creating a new company and admin user.

        Args:
            request: AdminSignupRequest containing signup details

        Returns:
            Dictionary with success status and created entities info
        """
        try:
            # Check if company with this name already exists
            existing_company = self.session.query(Company).filter_by(name=request.company_name).first()
            if existing_company:
                return {
                    "success": False,
                    "error": f"Company with name '{request.company_name}' already exists"
                }

            # Check if user with this email already exists
            existing_user = self.session.query(Users).filter_by(email=request.email).first()
            if existing_user:
                return {
                    "success": False,
                    "error": f"User with email '{request.email}' already exists"
                }

            # Verify country exists
            country = self.session.query(Country).filter_by(id=request.country_id, is_active=True).first()
            if not country:
                return {
                    "success": False,
                    "error": f"Country with ID {request.country_id} not found or inactive"
                }

            # Create new company
            company = Company(
                name=request.company_name,
                country_id=request.country_id,
                currency_code=country.currency_code  # Use country's currency as company currency
            )

            # Create admin user
            admin_user = Users(
                company_id=company.id,  # Will be set after company is added to session
                email=request.email,
                password_hash=self._hash_password(request.password),
                full_name=request.full_name,
                role="Admin"
            )

            # Add company first to get its ID
            self.session.add(company)
            self.session.flush()  # Get the company ID without committing

            # Set the company_id for the user
            admin_user.company_id = company.id

            # Add admin user
            self.session.add(admin_user)

            # Commit the transaction
            self.session.commit()

            return {
                "success": True,
                "message": "Admin user and company created successfully",
                "company": {
                    "id": company.id,
                    "name": company.name,
                    "country_id": company.country_id,
                    "currency_code": company.currency_code
                },
                "user": {
                    "id": str(admin_user.id),
                    "email": admin_user.email,
                    "full_name": admin_user.full_name,
                    "role": admin_user.role,
                    "company_id": admin_user.company_id
                }
            }

        except Exception as e:
            print(e)
            self.session.rollback()
            return {
                "success": False,
                "error": f"Failed to create admin user and company: {str(e)}"
            }

        finally:
            self.session.close()

    def create_user(self, email: str, full_name: str, password: str, role: str = "Employee",
                   company_id: int = None, manager_id: str = None) -> dict:
        """
        Create a new user.

        Args:
            email: User email
            full_name: User full name
            password: User password (will be hashed)
            role: User role ('Admin', 'Manager', 'Employee')
            company_id: Company ID (required for non-admin users)
            manager_id: Manager user ID (optional)

        Returns:
            Dictionary with success status and user info
        """
        try:
            # Validate role
            if role not in ['Admin', 'Manager', 'Employee']:
                return {
                    "success": False,
                    "error": f"Invalid role '{role}'. Must be 'Admin', 'Manager', or 'Employee'"
                }

            # Check if user with this email already exists
            existing_user = self.session.query(Users).filter_by(email=email).first()
            if existing_user:
                return {
                    "success": False,
                    "error": f"User with email '{email}' already exists"
                }

            # For non-admin users, company_id is required
            if role != "Admin" and company_id is None:
                return {
                    "success": False,
                    "error": "Company ID is required for non-admin users"
                }

            # Verify company exists if provided
            if company_id:
                company = self.session.query(Company).filter_by(id=company_id).first()
                if not company:
                    return {
                        "success": False,
                        "error": f"Company with ID {company_id} not found"
                    }

            # Verify manager exists if provided
            if manager_id:
                manager = self.session.query(Users).filter_by(id=manager_id).first()
                if not manager:
                    return {
                        "success": False,
                        "error": f"Manager with ID {manager_id} not found"
                    }

            # Create user
            user = Users(
                company_id=company_id,
                email=email,
                password_hash=self._hash_password(password),
                full_name=full_name,
                role=role,
                manager_id=manager_id
            )

            self.session.add(user)
            self.session.commit()

            return {
                "success": True,
                "message": f"User '{full_name}' created successfully",
                "user": {
                    "id": str(user.id),
                    "email": user.email,
                    "full_name": user.full_name,
                    "role": user.role,
                    "company_id": user.company_id,
                    "manager_id": user.manager_id
                }
            }

        except Exception as e:
            self.session.rollback()
            return {
                "success": False,
                "error": f"Failed to create user: {str(e)}"
            }

        finally:
            self.session.close()

    def get_user_by_email(self, email: str) -> Optional[dict]:
        """
        Get user information by email.

        Args:
            email: User email address

        Returns:
            User dictionary or None if not found
        """
        try:
            user = self.session.query(Users).filter_by(email=email).first()
            if user:
                return {
                    "id": str(user.id),
                    "email": user.email,
                    "full_name": user.full_name,
                    "role": user.role,
                    "company_id": user.company_id,
                    "manager_id": str(user.manager_id) if user.manager_id else None,
                    "created_at": user.created_at
                }
            return None
        finally:
            self.session.close()

    def authenticate_user(self, email: str, password: str) -> Optional[dict]:
        """
        Authenticate a user with email and password.

        Args:
            email: User email
            password: Plain text password

        Returns:
            User dictionary if authentication successful, None otherwise
        """
        try:
            user = self.session.query(Users).filter_by(email=email).first()
            print(user, self._verify_password(password, user.password_hash))
            if user and self._verify_password(password, user.password_hash):
                return {
                    "id": str(user.id),
                    "email": user.email,
                    "full_name": user.full_name,
                    "role": user.role,
                    "company_id": user.company_id,
                    "manager_id": str(user.manager_id) if user.manager_id else None
                }
            return {
                "error": "Invalid credentials, Please try again."
            }
        finally:
            self.session.close()


def get_users_service() -> UsersService:
    """
    Convenience function to get a UsersService instance.

    Returns:
        UsersService instance
    """
    return UsersService()