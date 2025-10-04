# OdooXAmalthea — Expense Tracker (Competition 2025)

## Problem Statement
Build an Expense Tracker that enables employees to submit expenses, managers to approve or reject them, and admins to configure policies and manage users. The system should be fast, reliable, and production-lean with sensible caching and clear separation of concerns across frontend and backend.

## Team
- Team Name: Blank
  
## Showcase video link
https://drive.google.com/file/d/1HDG3th-M1HNUOGPn-4VdS0NrhDyY6CiZ/view?usp=sharing

## Tech Stack
- Backend: FastAPI, SQLAlchemy, SQLite
- Frontend: Next.js (App Router), TypeScript, Tailwind-based UI components
- Services: SMTP for email (credentials + notifications), currency/country data cache, exchange rate cache, simple LLM-powered receipt extraction

## Architecture Overview
- Monorepo with `src/` (backend) and `frontend/website/` (frontend)
- REST API served by FastAPI at port 8000
- Next.js frontend consumes API via a typed `api-service`
- SQLite database file at `src/database/odooxamalthea.db`

## Features

### Core Expense Flow
- Draft → Submitted → Approved/Rejected workflow on each expense
- Rich expense entity: amount, currency, converted company currency, category, description, date, remarks, base64 receipt
- Auto-conversion to company currency via exchange rates cache
- Manager approvals with comments

### Simplified Approvals Engine
- One-policy-per-user (enforced at app level)
- Optional manager-as-approver toggle
- Ordered list of static approvers
- Sequential or parallel approvals
- Minimum approval percentage for parallel approvals
- Computes “next approvers” on submission and after each action
- Prevents actions by non-eligible approvers for the current step

### User Management
- Admin sign-up creates company and initial admin user
- Create/Update users with roles: Admin, Manager, Employee
- Manager assignments for employees
- Salted+hashed passwords (SHA-256 + per-user random salt)
- Credentials email sending from Admin UI (defaults to password: `testpassword`)

### Countries and Currencies (Caching)
- Countries + currency metadata cached in DB via REST Countries API
- Exchange rates cached in DB via exchangerate-api.com
- Configurable TTLs and API URLs via environment variables
- DB indices and selective refresh to reduce API pressure and speed up queries

### Email Service
- SMTP-based email sending with app passwords (e.g., Gmail)
- Endpoints for credentials and generic notifications
- Styled HTML email with plain-text fallback for credentials delivery

### LLM Receipt Extraction (Optional)
- Endpoint to extract receipt data from a base64 image payload
- Pluggable LLM (google-genai package installed); configure as needed for your environment

### Frontend (Next.js + TypeScript)
- App Router with protected routes based on roles (Admin/Manager/Employee)
- Admin dashboard components:
  - User Management: create user, role assignment, manager selection, send credentials via email
  - Approval Policy Manager: configure per-user policies (manager toggle, sequential/parallel, approvers, minimum percentage)
- Employee dashboard component:
  - Expense Management: create/update expenses, submit for approval, currency conversions
- Manager dashboard component:
  - Approvals list: act on pending approvals (Approve/Reject)
- Shared `DashboardLayout` with sidebar links and logout
- Centralized API client (`api-service.ts`) for backend endpoints

### Performance & Robustness
- Database-backed caches for countries and exchange rates with TTL validation
- Lean SQLAlchemy models with indexed columns for common filter/join paths
- Early normalization of currencies to company currency for faster aggregations
- Minimal payloads and straightforward endpoints for low latency
- CORS configured for local dev environments

### Security & Safety
- Passwords stored as salted+hashed values; verification performed server-side
- Role-based route protection on the frontend
- Basic input validation and explicit error paths on API calls

### Getting Started

Prerequisites
- Python 3.11+ (tested with 3.13)
- Node.js 18+
- SMTP account for email (e.g., Gmail app password)

Backend — Run Instructions
1) Create and activate a virtual environment (Windows PowerShell)
```
python -m venv .venv
.venv\Scripts\Activate.ps1
```

1) Install dependencies
```
pip install -U pip
pip install fastapi "uvicorn[standard]" sqlalchemy requests google-genai
```

1) (Optional) Configure environment variables for email
```
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your_email@gmail.com
SMTP_APP_PASSWORD=your_app_password
```

1) Start the API server (defaults to http://localhost:8000)
```
python -m uvicorn src.main:app --reload --port 8000
```

Notes
- On first startup, country data cache is refreshed automatically. Exchange rates are fetched on-demand per base currency.
- The SQLite DB lives at `src/database/odooxamalthea.db` and is created automatically.

Frontend — Run Instructions
1) Install Node dependencies
```
cd frontend/website
npm install
```

2) Create a `.env.local` file
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

3) Run the dev server (http://localhost:3000)
```
npm run dev
```

### Key API Endpoints (Summary)
- Health: GET /health, GET /db-health
- Countries: GET /countries
- Exchange Rates: GET /exchange-rates/{base}, GET /exchange-rates/{base}/{target}/{amount}
- Auth: POST /signup, POST /login
- Users: GET /users/company/{company_id}, POST /users, POST /users/{user_id}
- Expenses: GET /expenses/employee/{employee_id}, POST /expenses, POST /expenses/{expense_id}/update
- Approvals: GET /approvals/policies/{company_id}, POST /approvals/policies, GET /approvals/policy/user/{user_id}, GET /approvals/pending/{approver_id}, POST /approvals/{expense_id}/action
- Mail: POST /mail/send-credentials, POST /mail/send-notification
- LLM (optional): POST /llm/extract-receipt-data

### Competition Notes
This project is submitted for the OdooXAmalthea 2025 competition. It focuses on correctness, clarity, and practical performance via database caching and a simplified, well-reasoned approval engine that balances flexibility with developer ergonomics.

