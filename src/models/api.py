from pydantic import BaseModel

class AdminSignupRequest(BaseModel):
    full_name: str
    email: str
    password: str
    company_name: str
    country_id: int