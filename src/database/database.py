"""
Database module for OdooXAmalthea.

This module provides database connection and session management using SQLAlchemy.
"""

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

# Database configuration
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./database/odooxamalthea.db")

# Create SQLAlchemy engine
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}  # Needed only for SQLite
)

# Create SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create Base class for models
Base = declarative_base()


def get_db():
    """
    Dependency function to get database session.

    Yields:
        Session: Database session
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables():
    """
    Create all database tables.

    This function should be called to initialize the database schema.
    """
    Base.metadata.create_all(bind=engine)


def get_engine():
    """
    Get the SQLAlchemy engine instance.

    Returns:
        Engine: SQLAlchemy engine
    """
    return engine


def get_session():
    """
    Get a new database session.

    Returns:
        Session: Database session
    """
    return SessionLocal()


# Initialize database tables when module is imported
# Uncomment the line below if you want tables created automatically on import
# create_tables()
