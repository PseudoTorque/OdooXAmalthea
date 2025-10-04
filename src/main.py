from fastapi import FastAPI, Depends
import uvicorn
from sqlalchemy import text
from sqlalchemy.orm import Session
from database import get_db, create_tables, get_engine

# Initialize database tables
create_tables()

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


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
