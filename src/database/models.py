"""
Database models for OdooXAmalthea.

This module defines the database models using SQLAlchemy.
"""

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Date, Numeric, Enum, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from typing import Dict, Any

from .database import Base


class Company(Base):
    """
    Company model representing a company.
    """
    __tablename__ = "companies"

    #primary key
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    #fields
    name = Column(String(255), nullable=False, index=True)
    country_id = Column(Integer, ForeignKey("countries.id"), nullable=False, index=True)
    currency_code = Column(String(3), ForeignKey("currencies.id"), nullable=False, index=True)

    #timestamps
    created_at = Column(DateTime, default=datetime.utcnow, index=True, nullable=False)

    def __repr__(self):
        return f"<Company(id={self.id}, name='{self.name}', country='{self.country_id}', currency='{self.currency_code}')>"


class Users(Base):
    """
    Users model for managing all users, their roles, and reporting structure.

    Manages all users, their roles, and their reporting structure.
    """
    __tablename__ = "users"

    # Primary key
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    # Foreign keys
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)

    # User fields
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)

    # Role and reporting structure
    role = Column(Enum('Admin', 'Manager', 'Employee', name='user_role_enum'), nullable=False)
    manager_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Self-referencing foreign key

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    company = relationship("Company", back_populates="users")
    managed_users = relationship("Users", back_populates="manager", remote_side=[id])
    manager = relationship("Users", back_populates="managed_users", remote_side=[manager_id])

    # Relationship with expenses (one-to-many)
    expenses = relationship("Expenses", back_populates="employee", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Users(id='{self.id}', email='{self.email}', full_name='{self.full_name}', role='{self.role}')>"


class Expenses(Base):
    """
    Expenses model for storing every expense claim submitted by employees.

    Stores every expense claim submitted by employees.
    """
    __tablename__ = "expenses"

    # Primary key
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    # Foreign key to employee
    employee_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Expense details
    amount = Column(Numeric(10, 2), nullable=False)  # Original currency amount
    currency_code = Column(String(3), nullable=False)  # Original currency code

    # Converted amount for company currency
    amount_in_company_currency = Column(Numeric(10, 2), nullable=False)

    # Expense metadata
    category = Column(String(100), nullable=False)  # e.g., 'Travel', 'Food', 'Software'
    description = Column(Text, nullable=False)
    expense_date = Column(Date, nullable=False)

    # Status and workflow
    status = Column(Enum('Pending', 'Approved', 'Rejected', name='expense_status_enum'), default='Pending', nullable=False)

    # Receipt
    receipt_url = Column(String(500), nullable=True)  # URL to receipt image

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    employee = relationship("Users", back_populates="expenses")
    approval_statuses = relationship("ExpenseApprovalStatus", back_populates="expense", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Expenses(id='{self.id}', amount={self.amount}, category='{self.category}', status='{self.status}')>"


class ApprovalPolicies(Base):
    """
    ApprovalPolicies model for defining different approval workflows.

    Defines the different approval workflows a company can create.
    """
    __tablename__ = "approval_policies"

    # Primary key
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    # Foreign key to company
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)

    # Policy details
    name = Column(String(255), nullable=False)
    min_amount = Column(Numeric(10, 2), nullable=True)  # Minimum expense amount to trigger policy
    max_amount = Column(Numeric(10, 2), nullable=True)  # Maximum expense amount to trigger policy

    # Relationships
    company = relationship("Company", back_populates="approval_policies")
    steps = relationship("ApprovalSteps", back_populates="policy", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<ApprovalPolicies(id='{self.id}', name='{self.name}', company_id={self.company_id})>"


class ApprovalSteps(Base):
    """
    ApprovalSteps model for defining individual steps within approval policies.

    Defines each individual step or rule within an ApprovalPolicy.
    """
    __tablename__ = "approval_steps"

    # Primary key
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    # Foreign key to policy
    policy_id = Column(Integer, ForeignKey("approval_policies.id"), nullable=False)

    # Step details
    step_sequence = Column(Integer, nullable=False)  # Order for sequential approvals
    rule_type = Column(Enum('Direct', 'Percentage', 'SpecificApprover', name='rule_type_enum'), nullable=False)

    # For Percentage rule type
    approver_group_id = Column(Integer, nullable=True)  # Links to a group (future enhancement)
    percentage_required = Column(Integer, nullable=True)  # Percentage required for approval

    # For SpecificApprover rule type
    specific_approver_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Relationships
    policy = relationship("ApprovalPolicies", back_populates="steps")
    specific_approver = relationship("Users", foreign_keys=[specific_approver_id])
    expense_approval_statuses = relationship("ExpenseApprovalStatus", back_populates="step", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<ApprovalSteps(id='{self.id}', rule_type='{self.rule_type}', step_sequence={self.step_sequence})>"


class ExpenseApprovalStatus(Base):
    """
    ExpenseApprovalStatus model for tracking approval actions.

    A tracking table that records the action of each approver for a specific expense.
    """
    __tablename__ = "expense_approval_status"

    # Primary key
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    # Foreign keys
    expense_id = Column(Integer, ForeignKey("expenses.id"), nullable=False)
    step_id = Column(Integer, ForeignKey("approval_steps.id"), nullable=False)
    approver_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Approval details
    action = Column(Enum('Approved', 'Rejected', name='approval_action_enum'), nullable=False)
    comments = Column(Text, nullable=True)
    action_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    expense = relationship("Expenses", back_populates="approval_statuses")
    step = relationship("ApprovalSteps", back_populates="expense_approval_statuses")
    approver = relationship("Users", foreign_keys=[approver_id])

    def __repr__(self):
        return f"<ExpenseApprovalStatus(id='{self.id}', action='{self.action}', approver_id='{self.approver_id}')>"


class Country(Base):
    """
    Country model for storing country information and currencies.

    This model caches country data from the REST Countries API.
    """
    __tablename__ = "countries"

    # Primary key
    id = Column(Integer, primary_key=True, autoincrement=True)

    # Country information
    name_common = Column(String(255), nullable=False, index=True)
    name_official = Column(String(255), nullable=False)

    # Currency information
    currency_code = Column(String(3), nullable=False, index=True)
    currency_name = Column(String(255), nullable=False)
    currency_symbol = Column(String(255), nullable=False)

    # Metadata
    last_updated = Column(DateTime, default=datetime.utcnow, index=True, nullable=False)
    is_active = Column(Boolean, default=True, index=True, nullable=False)

    def __repr__(self):
        return f"<Country(id={self.id}, name='{self.name_common}', currency_code='{self.currency_code}', currency_name='{self.currency_name}', currency_symbol='{self.currency_symbol}')>"

    def get_currency_data(self) -> Dict[str, Any]:
        """Get currency data as a dictionary."""
        return {
            "code": self.currency_code,
            "name": self.currency_name,
            "symbol": self.currency_symbol
        }

    def set_currency_data(self, currency_data: Dict[str, Any]):
        """Set currency data from a dictionary."""
        self.currency_code = currency_data["code"]
        self.currency_name = currency_data["name"]
        self.currency_symbol = currency_data["symbol"]


class ExchangeRate(Base):
    """
    ExchangeRate model for storing currency exchange rates.

    This model caches exchange rate data from exchangerate-api.com.
    """
    __tablename__ = "exchange_rates"

    # Primary key
    id = Column(Integer, primary_key=True, autoincrement=True)

    # Base currency information
    base_currency = Column(String(3), nullable=False, index=True)

    # Target currency information
    target_currency = Column(String(3), nullable=False, index=True)

    # Exchange rate value
    rate = Column(Numeric(15, 6), nullable=False)

    # API response metadata
    api_date = Column(DateTime, nullable=False)
    time_last_updated = Column(Integer, nullable=False)  # Unix timestamp from API

    # Cache metadata
    last_updated = Column(DateTime, default=datetime.utcnow, index=True, nullable=False)
    is_active = Column(Boolean, default=True, index=True, nullable=False)

    def __repr__(self):
        return f"<ExchangeRate(id={self.id}, base='{self.base_currency}', target='{self.target_currency}', rate={self.rate})>"

    def get_rate_data(self) -> Dict[str, Any]:
        """Get exchange rate data as a dictionary."""
        return {
            "base_currency": self.base_currency,
            "target_currency": self.target_currency,
            "rate": float(self.rate),
            "api_date": self.api_date,
            "time_last_updated": self.time_last_updated
        }


# Add relationships to Company model
Company.users = relationship("Users", back_populates="company", cascade="all, delete-orphan")
Company.approval_policies = relationship("ApprovalPolicies", back_populates="company", cascade="all, delete-orphan")