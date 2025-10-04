from __future__ import annotations

from typing import Dict, List, Optional
from datetime import datetime

from database import get_session
from database.models import (
    ApprovalPolicies,
    ApprovalPolicyApprover,
    ExpenseApprovalStatus,
    Expenses,
    Users,
)


class ApprovalsService:
    def __init__(self):
        self.session = get_session()

    # ---------- Policy CRUD (simplified) ----------
    def create_or_update_policy(self, data: Dict) -> Dict:
        try:
            policy_id = data.get("id")
            if policy_id:
                policy: ApprovalPolicies = (
                    self.session.query(ApprovalPolicies).filter_by(id=policy_id).first()
                )
                if not policy:
                    return {"success": False, "error": f"Policy {policy_id} not found"}
                policy.company_id = int(data.get("company_id", policy.company_id))
                policy.user_id = int(data.get("user_id", policy.user_id))
                policy.name = data.get("name", policy.name)
                policy.override_manager_id = data.get("override_manager_id")
                policy.is_manager_approver = bool(data.get("is_manager_approver", policy.is_manager_approver))
                policy.is_sequential = bool(data.get("is_sequential", policy.is_sequential))
                policy.min_approval_percentage = data.get("min_approval_percentage")
                # Clear existing approvers
                for a in list(policy.approvers):
                    self.session.delete(a)
            else:
                policy = ApprovalPolicies(
                    company_id=int(data["company_id"]),
                    user_id=int(data["user_id"]),
                    name=data["name"],
                    override_manager_id=data.get("override_manager_id"),
                    is_manager_approver=bool(data.get("is_manager_approver", False)),
                    is_sequential=bool(data.get("is_sequential", False)),
                    min_approval_percentage=data.get("min_approval_percentage"),
                )
                self.session.add(policy)
                self.session.flush()

            # Insert approvers list
            approvers: List[Dict] = data.get("approvers", [])
            for idx, a in enumerate(approvers):
                self.session.add(
                    ApprovalPolicyApprover(
                        policy_id=policy.id,
                        approver_id=int(a["approver_id"]),
                        order_index=a.get("order_index", idx + 1),
                    )
                )

            self.session.commit()
            return {"success": True, "policy_id": policy.id}
        except Exception as e:
            self.session.rollback()
            return {"success": False, "error": str(e)}

    def get_policies_by_company(self, company_id: int) -> Dict:
        try:
            policies = self.session.query(ApprovalPolicies).filter_by(company_id=company_id).all()

            def serialize(p: ApprovalPolicies) -> Dict:
                return {
                    "id": p.id,
                    "company_id": p.company_id,
                    "user_id": p.user_id,
                    "name": p.name,
                    "override_manager_id": p.override_manager_id,
                    "is_manager_approver": bool(p.is_manager_approver),
                    "is_sequential": bool(p.is_sequential),
                    "min_approval_percentage": p.min_approval_percentage,
                    "approvers": [
                        {
                            "id": a.id,
                            "approver_id": a.approver_id,
                            "order_index": a.order_index,
                        }
                        for a in sorted(p.approvers, key=lambda x: (x.order_index or 0))
                    ],
                }

            return {"success": True, "policies": [serialize(p) for p in policies]}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def get_policy_by_user(self, user_id: int) -> Dict:
        try:
            p = self.session.query(ApprovalPolicies).filter_by(user_id=user_id).first()
            if not p:
                return {"success": True, "policy": None}
            policy = {
                "id": p.id,
                "company_id": p.company_id,
                "user_id": p.user_id,
                "name": p.name,
                "override_manager_id": p.override_manager_id,
                "is_manager_approver": bool(p.is_manager_approver),
                "is_sequential": bool(p.is_sequential),
                "min_approval_percentage": p.min_approval_percentage,
                "approvers": [
                    {
                        "id": a.id,
                        "approver_id": a.approver_id,
                        "order_index": a.order_index,
                    }
                    for a in sorted(p.approvers, key=lambda x: (x.order_index or 0))
                ],
            }
            return {"success": True, "policy": policy}
        except Exception as e:
            return {"success": False, "error": str(e)}

    # ---------- Runtime evaluation (simplified) ----------
    def _find_applicable_policy(self, expense: Expenses) -> Optional[ApprovalPolicies]:
        return (
            self.session.query(ApprovalPolicies)
            .filter_by(user_id=expense.employee_id)
            .first()
        )

    def _get_employee_company_id(self, employee_id: int) -> int:
        user = self.session.query(Users).filter_by(id=employee_id).first()
        return user.company_id if user else 0

    def _get_employee_manager(self, employee_id: int) -> Optional[int]:
        user = self.session.query(Users).filter_by(id=employee_id).first()
        print("user, ", user)
        print(user.manager_id)
        return int(user.manager_id) if user and user.manager_id else None
    def _policy_approver_list(self, expense: Expenses, policy: ApprovalPolicies) -> List[int]:
        approver_ids: List[int] = []
        print(expense.employee_id, "expense.employee_id")
        if bool(policy.is_manager_approver):
            override_id = policy.override_manager_id
            manager_id = override_id if override_id else self._get_employee_manager(expense.employee_id)
            print(manager_id, "manager_id")
            if manager_id:
                approver_ids.append(int(manager_id))
        # Append static approvers
        for a in sorted(policy.approvers, key=lambda x: (x.order_index or 0)):
            if int(a.approver_id) not in approver_ids:
                approver_ids.append(int(a.approver_id))
        return approver_ids

    def _compute_next_approvers(self, expense: Expenses) -> List[int]:
        policy = self._find_applicable_policy(expense)
        if not policy:
            return []
        approver_order = self._policy_approver_list(expense, policy)
        print(approver_order)
        if not approver_order:
            return []

        actions = (
            self.session.query(ExpenseApprovalStatus)
            .filter_by(expense_id=expense.id)
            .all()
        )
        print(actions)
        acted_ids = {a.approver_id for a in actions}
        print(acted_ids)
        if bool(policy.is_sequential):
            for user_id in approver_order:
                if user_id not in acted_ids:
                    return [user_id]
            return []
        else:
            return [uid for uid in approver_order if uid not in acted_ids]

    # ---------- Public actions ----------
    def submit_expense_for_approval(self, expense_id: int) -> Dict:
        try:
            expense = self.session.query(Expenses).filter_by(id=expense_id).first()
            if not expense:
                return {"success": False, "error": "Expense not found"}

            expense.status = 'Submitted'
            self.session.commit()
            next_approvers = self._compute_next_approvers(expense)
            return {"success": True, "next_approvers": next_approvers}
        except Exception as e:
            self.session.rollback()
            return {"success": False, "error": str(e)}

    def get_pending_for_approver(self, approver_id: int) -> Dict:
        try:
            # Consider only submitted expenses
            expenses = self.session.query(Expenses).filter_by(status='Submitted').all()
            result = []
            for exp in expenses:
                print(exp)
                next_approvers = self._compute_next_approvers(exp)
                print(next_approvers)
                if approver_id in next_approvers:
                    result.append({
                        "expense_id": exp.id,
                        "employee_id": exp.employee_id,
                        "category": exp.category,
                        "description": exp.description,
                        "amount": float(exp.amount),
                        "currency_code": exp.currency_code,
                        "amount_in_company_currency": float(exp.amount_in_company_currency),
                        "expense_date": exp.expense_date.isoformat(),
                    })
            return {"success": True, "approvals": result}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def _has_rejection(self, expense_id: int) -> bool:
        actions = (
            self.session.query(ExpenseApprovalStatus)
            .filter_by(expense_id=expense_id)
            .all()
        )
        return any(a.action == 'Rejected' for a in actions)

    def take_action(self, expense_id: int, approver_id: int, action: str, comments: Optional[str]) -> Dict:
        try:
            expense = self.session.query(Expenses).filter_by(id=expense_id).first()
            if not expense:
                return {"success": False, "error": "Expense not found"}

            # Verify approver is eligible now
            valid_next = self._compute_next_approvers(expense)
            if approver_id not in valid_next:
                return {"success": False, "error": "Not authorized for current step"}

            record = ExpenseApprovalStatus(
                expense_id=expense_id,
                approver_id=approver_id,
                action='Approved' if action == 'Approved' else 'Rejected',
                comments=comments,
                action_at=datetime.utcnow(),
            )
            self.session.add(record)
            self.session.commit()

            # Evaluate overall result
            if self._has_rejection(expense_id):
                expense.status = 'Rejected'
                self.session.commit()
                return {"success": True, "status": expense.status}

            policy = self._find_applicable_policy(expense)
            approver_order = self._policy_approver_list(expense, policy) if policy else []
            actions = (
                self.session.query(ExpenseApprovalStatus)
                .filter_by(expense_id=expense_id)
                .all()
            )
            approved_count = len([a for a in actions if a.action == 'Approved'])
            total_required = len(approver_order)

            if policy and bool(policy.is_sequential):
                # Approved when all in order approved
                if approved_count >= total_required:
                    expense.status = 'Approved'
                    self.session.commit()
                    return {"success": True, "status": expense.status}
                else:
                    next_approvers = self._compute_next_approvers(expense)
                    return {"success": True, "status": expense.status, "next_approvers": next_approvers}
            else:
                # Parallel: check min approval percentage
                pct_required = int(policy.min_approval_percentage) if policy and policy.min_approval_percentage is not None else 100
                pct = int((approved_count / max(total_required, 1)) * 100)
                if pct >= pct_required:
                    expense.status = 'Approved'
                    self.session.commit()
                    return {"success": True, "status": expense.status}
                else:
                    # If everyone acted and threshold not met → reject
                    if len(actions) >= total_required:
                        expense.status = 'Rejected'
                        self.session.commit()
                        return {"success": True, "status": expense.status}
                    next_approvers = self._compute_next_approvers(expense)
                    return {"success": True, "status": expense.status, "next_approvers": next_approvers}
        except Exception as e:
            self.session.rollback()
            return {"success": False, "error": str(e)}


def get_approvals_service() -> ApprovalsService:
    return ApprovalsService()


