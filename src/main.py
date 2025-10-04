from fastapi import FastAPI, Depends
import uvicorn
from sqlalchemy import text
from sqlalchemy.orm import Session
from database import get_db, create_tables, get_engine
from countries_currencies import get_countries_service, get_exchange_rate_service

# Initialize database tables
create_tables()

# Initialize countries cache
countries_service = get_countries_service()
countries_service.refresh_cache()

# Initialize exchange rates cache
exchange_rates_service = get_exchange_rate_service()

app = FastAPI()


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

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
