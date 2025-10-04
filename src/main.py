from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from sqlalchemy import text
from sqlalchemy.orm import Session
from database import get_db, create_tables, get_engine
from countries_currencies import get_countries_service, get_exchange_rate_service
from users import get_users_service
from models import AdminSignupRequest, LoginRequest, ApprovalPolicyUpsertRequest
from expenses import get_expenses_service
from approvals.main import get_approvals_service
from mail_service.main import send_credentials_email as svc_send_credentials_email, send_notification_email as svc_send_notification_email
from datetime import datetime
# Initialize database tables
create_tables()

# Initialize countries cache
countries_service = get_countries_service()
countries_service.refresh_cache()

# Initialize exchange rates cache
exchange_rates_service = get_exchange_rate_service()

# Initialize users service
users_service = get_users_service()

# Initialize expenses service
expenses_service = get_expenses_service()
approvals_service = get_approvals_service()


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


@app.get("/expenses/employee/{employee_id}")
async def get_expenses_by_employee(employee_id: int):
    """Get all expenses by employee ID."""
    return expenses_service.get_expense_details_for_employee(employee_id)


@app.post("/expenses")
async def create_expense(expense_data: dict):
    """Create a new expense."""
    result = expenses_service.add_expense(
        employee_id=expense_data.get("employee_id"),
        paid_by_id=expense_data.get("paid_by_id"),
        amount=expense_data.get("amount"),
        currency_code=expense_data.get("currency_code"),
        amount_in_company_currency=exchange_rates_service.convert_currency_to_company_currency(expense_data.get("company_id"),
                                                                                                    expense_data.get("amount"),
                                                                                               expense_data.get("currency_code")),
        category=expense_data.get("category"),
        description=expense_data.get("description"),
        expense_date=expense_data.get("expense_date"),
        remarks=expense_data.get("remarks"),
        receipt_image_base64=expense_data.get("receipt_image_base64"),
        status=expense_data.get("status", "Draft")
    )
    return {"success": result, "message": "Expense created successfully" if result else "Failed to create expense"}


@app.get("/currencies")
async def get_all_currencies():
    """Get all available currencies."""
    from database import get_session, Country
    session = get_session()
    try:
        countries = session.query(Country).filter_by(is_active=True).all()
        currencies = {}
        for country in countries:
            if country.currency_code not in currencies:
                currencies[country.currency_code] = {
                    "code": country.currency_code,
                    "name": country.currency_name,
                    "symbol": country.currency_symbol
                }
        return {"success": True, "currencies": list(currencies.values())}
    except Exception as e:
        return {"success": False, "error": str(e)}
    finally:
        session.close()


@app.get("/expense-categories")
async def get_expense_categories():
    """Get list of expense categories."""
    categories = ["Food", "Travel", "Accommodation", "Transport", "Office Supplies", "Software", "Hardware", "Other"]
    return {"success": True, "categories": categories}


@app.post("/expenses/{expense_id}/update")
async def update_expense(expense_id: int, update_data: dict):
    """Update an existing expense."""
    from database import get_session, Expenses
    session = get_session()
    try:
        expense = session.query(Expenses).filter_by(id=expense_id).first()
        if not expense:
            return {"success": False, "error": "Expense not found"}
        
        # Update allowed fields
        if "description" in update_data:
            expense.description = update_data["description"]
        if "category" in update_data:
            expense.category = update_data["category"]
        if "amount" in update_data:
            expense.amount = update_data["amount"]
        if "currency_code" in update_data:
            expense.currency_code = update_data["currency_code"]
        if "expense_date" in update_data:
            expense.expense_date = datetime.strptime(update_data["expense_date"], "%Y-%m-%d")
        if "remarks" in update_data:
            expense.remarks = update_data["remarks"]
        if "status" in update_data:
            expense.status = update_data["status"]
            # When moving to Submitted via this endpoint, return next approvers as hint
            if update_data["status"] == "Submitted":
                session.commit()
                try:
                    next_approvers = approvals_service.submit_expense_for_approval(expense_id).get("next_approvers", [])
                except Exception:
                    next_approvers = []
                return {"success": True, "message": "Expense submitted", "next_approvers": next_approvers}
        if "paid_by_id" in update_data:
            expense.paid_by_id = update_data["paid_by_id"]
        
        session.commit()
        return {"success": True, "message": "Expense updated successfully"}
    except Exception as e:
        session.rollback()
        return {"success": False, "error": str(e)}
    finally:
        session.close()


# ---------------- Approvals Endpoints ----------------

@app.get("/approvals/policies/{company_id}")
async def get_policies(company_id: int):
    return approvals_service.get_policies_by_company(company_id)


@app.post("/approvals/policies")
async def upsert_policy(policy: ApprovalPolicyUpsertRequest):
    return approvals_service.create_or_update_policy(policy.dict())


@app.get("/approvals/policy/user/{user_id}")
async def get_policy_for_user(user_id: int):
    return approvals_service.get_policy_by_user(user_id)


@app.get("/approvals/pending/{approver_id}")
async def get_pending_approvals(approver_id: int):
    return approvals_service.get_pending_for_approver(approver_id)


@app.post("/approvals/{expense_id}/action")
async def approval_action(expense_id: int, data: dict):
    return approvals_service.take_action(expense_id, int(data.get("approver_id")), data.get("action"), data.get("comments"))


# ---------------- Mail Endpoints ----------------
@app.post("/mail/send-credentials")
async def send_credentials(payload: dict):
    """Send credentials email to a user."""
    recipient = payload.get("recipient_email")
    full_name = payload.get("full_name")
    password = payload.get("password")
    if not recipient or not full_name or not password:
        return {"success": False, "error": "recipient_email, full_name and password are required"}
    return svc_send_credentials_email(recipient, full_name, password)


@app.post("/mail/send-notification")
async def send_notification(payload: dict):
    """Send a general notification email."""
    recipient = payload.get("recipient_email")
    subject = payload.get("subject")
    message_body = payload.get("message_body")
    if not recipient or not subject:
        return {"success": False, "error": "recipient_email and subject are required"}
    return svc_send_notification_email(recipient, subject, message_body or "")


# LLM endpoints
@app.post("/llm/extract-receipt-data")
async def extract_receipt_data_endpoint(data: dict):
    """Extract receipt data from base64 image using AI."""
    from llm.main import extract_receipt_data
    try:
        image_data = data.get("image_data")
        if not image_data:
            return {"success": False, "error": "No image data provided"}

        result = extract_receipt_data(image_data)
        if result:
            return {"success": True, "data": result}
        else:
            return {"success": False, "error": "Failed to extract receipt data"}
    except Exception as e:
        return {"success": False, "error": str(e)}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
