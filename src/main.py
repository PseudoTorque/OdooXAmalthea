from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from sqlalchemy import text
from sqlalchemy.orm import Session
from database import get_db, create_tables, get_engine
from countries_currencies import get_countries_service, get_exchange_rate_service
from users import get_users_service
from models import AdminSignupRequest, LoginRequest

# Initialize database tables
create_tables()

# Initialize countries cache
countries_service = get_countries_service()
countries_service.refresh_cache()

# Initialize exchange rates cache
exchange_rates_service = get_exchange_rate_service()

# Initialize users service
users_service = get_users_service()


app = FastAPI()

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",      # Next.js development server
        "http://127.0.0.1:3000",     # Alternative localhost
        "https://localhost:3000",     # HTTPS development
        "http://localhost:5173",      # Vite development server (alternative)
        "http://127.0.0.1:5173",     # Alternative localhost for Vite
    ],
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods
    allow_headers=["*"],  # Allow all headers
)


@app.get("/health")
async def health_check():
    """Health check endpoint that returns a simple status."""
    return {"status": "healthy", "message": "OdooXAmalthea backend is running"}


@app.get("/db-health")
async def db_health_check(db: Session = Depends(get_db)):
    """Database health check endpoint."""
    try:
        # Test database connection
        db.execute(text("SELECT 1"))
        return {
            "status": "healthy",
            "database": "connected",
            "engine": str(get_engine().url)
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "database": "disconnected",
            "error": str(e)
        }

@app.get("/countries")
async def get_countries():
    """Get all countries."""
    return countries_service.get_all_countries()

@app.get("/exchange-rates/{base_currency}")
async def get_exchange_rates(base_currency: str):
    """Get all exchange rates."""
    return exchange_rates_service.get_all_rates_for_base(base_currency)

@app.get("/exchange-rates/{base_currency}/{target_currency}/{amount}")
async def get_exchange_rate(base_currency: str, target_currency: str, amount: float):
    """Get the exchange rate for a specific amount."""
    return exchange_rates_service.convert_currency(amount, base_currency, target_currency)

@app.post("/signup")
async def admin_signup(request: AdminSignupRequest):
    """Admin signup endpoint."""
    return users_service.handle_admin_signup(request)

@app.post("/login")
async def login(request: LoginRequest):
    """Login endpoint."""
    return users_service.authenticate_user(request.email, request.password)


# User management endpoints (Admin only)
@app.get("/users/company/{company_id}")
async def get_users_by_company(company_id: int, user_type: str = "all"):
    """Get all users by company ID."""
    return users_service.get_all_users_by_company_id(company_id, user_type)


@app.post("/users/{user_id}")
async def update_user(user_id: int, user_data: dict):
    """Update a user."""
    return users_service.update_user_with(user_id, user_data)


@app.post("/users")
async def create_user(user_data: dict):
    """Create a new user."""
    return users_service.create_user(
        email=user_data.get("email"),
        full_name=user_data.get("full_name"),
        password=user_data.get("password"),
        role=user_data.get("role", "Employee"),
        company_id=user_data.get("company_id"),
        manager_id=user_data.get("manager_id")
    )


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
