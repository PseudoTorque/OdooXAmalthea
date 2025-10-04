from pydantic import BaseModel, Field
from typing import List, Optional

class AdminSignupRequest(BaseModel):
    full_name: str
    email: str
    password: str
    company_name: str
    country_id: int

class LoginRequest(BaseModel):
    email: str
    password: str


class ApprovalPolicyApproverIn(BaseModel):
    approver_id: int
    order_index: Optional[int] = None


class ApprovalPolicyUpsertRequest(BaseModel):
    id: Optional[int] = Field(default=None, description="Provide for update; omit for create")
    company_id: int
    user_id: int
    name: str
    override_manager_id: Optional[int] = None
    is_manager_approver: bool = False
    is_sequential: bool = False
    min_approval_percentage: Optional[int] = Field(default=None, ge=0, le=100)
    approvers: List[ApprovalPolicyApproverIn] = []
