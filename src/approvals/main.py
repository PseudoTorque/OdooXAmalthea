from __future__ import annotations

from typing import Dict, List, Optional, Tuple
from datetime import datetime

from database import get_session
from database import (
    ApprovalPolicies,
    ApprovalPolicySettings,
    ApprovalSteps,
    ApprovalStepSettings,
    ApprovalStepApprover,
    ExpenseApprovalStatus,
    Expenses,
    Users,
)


class ApprovalsService:
    def __init__(self):
        self.session = get_session()

    # ---------- Policy CRUD ----------
    def create_or_update_policy(self, data: Dict) -> Dict:
        try:
            policy_id = data.get("id")
            if policy_id:
                policy: ApprovalPolicies = (
                    self.session.query(ApprovalPolicies).filter_by(id=policy_id).first()
                )
                if not policy:
                    return {"success": False, "error": f"Policy {policy_id} not found"}
                policy.name = data.get("name", policy.name)
                policy.company_id = data.get("company_id", policy.company_id)
                policy.min_amount = data.get("min_amount")
                policy.max_amount = data.get("max_amount")
                # Clear steps and related children for simplicity when updating structure
                for step in list(policy.steps):
                    for appr in list(step.approvers):
                        self.session.delete(appr)
                    if step.settings:
                        self.session.delete(step.settings)
                    self.session.delete(step)
                if policy.settings:
                    self.session.delete(policy.settings)
            else:
                policy = ApprovalPolicies(
                    company_id=data["company_id"],
                    name=data["name"],
                    min_amount=data.get("min_amount"),
                    max_amount=data.get("max_amount"),
                )
                self.session.add(policy)
                self.session.flush()

            # Policy settings
            settings = ApprovalPolicySettings(
                policy_id=policy.id,
                is_manager_approver=bool(data.get("is_manager_approver", False)),
                min_approval_percentage=data.get("min_approval_percentage"),
            )
            self.session.add(settings)
            self.session.flush()

            # Steps
            steps: List[Dict] = data.get("steps", [])
            for step_data in sorted(steps, key=lambda s: int(s.get("step_sequence", 0))):
                step = ApprovalSteps(
                    policy_id=policy.id,
                    step_sequence=step_data.get("step_sequence", 0),
                    rule_type=step_data.get("rule_type", "Direct"),
                    approver_group_id=step_data.get("approver_group_id"),
                    percentage_required=step_data.get("percentage_required"),
                    specific_approver_id=step_data.get("specific_approver_id"),
                )
                self.session.add(step)
                self.session.flush()

                step_settings = ApprovalStepSettings(
                    step_id=step.id,
                    is_sequential=bool(step_data.get("is_sequential", False)),
                    is_manager_step=bool(step_data.get("is_manager_step", False)),
                )
                self.session.add(step_settings)
                self.session.flush()

                # approvers
                for idx, appr in enumerate(step_data.get("approvers", [])):
                    step_appr = ApprovalStepApprover(
                        step_id=step.id,
                        approver_id=appr["approver_id"],
                        is_required=bool(appr.get("is_required", False)),
                        order_index=appr.get("order_index", idx + 1),
                    )
                    self.session.add(step_appr)

            self.session.commit()
            return {"success": True, "policy_id": policy.id}
        except Exception as e:
            self.session.rollback()
            return {"success": False, "error": str(e)}

    def get_policies_by_company(self, company_id: int) -> Dict:
        try:
            policies = (
                self.session.query(ApprovalPolicies).filter_by(company_id=company_id).all()
            )
            def serialize_policy(p: ApprovalPolicies) -> Dict:
                return {
                    "id": p.id,
                    "company_id": p.company_id,
                    "name": p.name,
                    "min_amount": float(p.min_amount) if p.min_amount is not None else None,
                    "max_amount": float(p.max_amount) if p.max_amount is not None else None,
                    "settings": {
                        "is_manager_approver": bool(p.settings.is_manager_approver) if p.settings else False,
                        "min_approval_percentage": p.settings.min_approval_percentage if p.settings else None,
                    },
                    "steps": [
                        {
                            "id": s.id,
                            "step_sequence": s.step_sequence,
                            "rule_type": s.rule_type,
                            "percentage_required": s.percentage_required,
                            "specific_approver_id": s.specific_approver_id,
                            "settings": {
                                "is_sequential": bool(s.settings.is_sequential) if s.settings else False,
                                "is_manager_step": bool(s.settings.is_manager_step) if s.settings else False,
                            },
                            "approvers": [
                                {
                                    "id": a.id,
                                    "approver_id": a.approver_id,
                                    "is_required": bool(a.is_required),
                                    "order_index": a.order_index,
                                }
                                for a in sorted(s.approvers, key=lambda x: (x.order_index or 0))
                            ],
                        }
                        for s in sorted(p.steps, key=lambda x: x.step_sequence)
                    ],
                }

            return {"success": True, "policies": [serialize_policy(p) for p in policies]}
        except Exception as e:
            return {"success": False, "error": str(e)}

    # ---------- Runtime evaluation ----------
    def _find_applicable_policy(self, expense: Expenses) -> Optional[ApprovalPolicies]:
        company_id = self._get_employee_company_id(expense.employee_id)
        amount = float(expense.amount_in_company_currency)
        policies = (
            self.session.query(ApprovalPolicies)
            .filter_by(company_id=company_id)
            .all()
        )
        # Filter by amount bands when present
        applicable: List[ApprovalPolicies] = []
        for p in policies:
            min_ok = p.min_amount is None or amount >= float(p.min_amount)
            max_ok = p.max_amount is None or amount <= float(p.max_amount)
            if min_ok and max_ok:
                applicable.append(p)
        if not applicable:
            return None
        # Choose the most specific policy: highest min_amount then lowest max_amount
        applicable.sort(key=lambda p: (
            float(p.min_amount) if p.min_amount is not None else -1e18,
            float(p.max_amount) if p.max_amount is not None else 1e18,
        ), reverse=True)
        return applicable[0]

    def _get_employee_company_id(self, employee_id: int) -> int:
        user = self.session.query(Users).filter_by(id=employee_id).first()
        return user.company_id if user else 0

    def _get_employee_manager(self, employee_id: int) -> Optional[int]:
        user = self.session.query(Users).filter_by(id=employee_id).first()
        return int(user.manager_id) if user and user.manager_id else None

    def _step_is_complete(self, expense_id: int, step: ApprovalSteps) -> Tuple[bool, Optional[bool]]:
        """
        Returns (is_complete, is_rejected)
        - is_complete: step can be considered finished
        - is_rejected: if step completion means expense rejected
        """
        actions = (
            self.session.query(ExpenseApprovalStatus)
            .filter_by(expense_id=expense_id, step_id=step.id)
            .all()
        )
        approved = [a for a in actions if a.action == 'Approved']
        rejected = [a for a in actions if a.action == 'Rejected']

        if rejected:
            return True, True

        # Manager step behaves like specific approver (the manager)
        is_manager_step = bool(step.settings.is_manager_step) if step.settings else False
        if step.rule_type == 'SpecificApprover' or is_manager_step:
            return (len(approved) >= 1, False)

        if step.rule_type == 'Percentage':
            required_pct = step.percentage_required or 0
            total = max(len(step.approvers), 1)
            pct = int((len(approved) / total) * 100)
            if pct >= required_pct:
                return True, False
            # If everyone acted and threshold not met → rejection
            if len(actions) == total:
                return True, True
            return False, None

        # Direct rule
        is_sequential = bool(step.settings.is_sequential) if step.settings else False
        required_approvers = [a for a in step.approvers if a.is_required]
        if is_sequential:
            # sequential completion when last approver approved
            total_required = required_approvers if required_approvers else list(step.approvers)
            return (len(approved) >= len(total_required), False)
        else:
            if required_approvers:
                return (len(approved) >= len(required_approvers), False)
            # no required → any single approval completes the step
            return (len(approved) >= 1, False)

    def _next_approvers_for_step(self, expense: Expenses, step: ApprovalSteps) -> List[int]:
        # Manager step
        if step.settings and step.settings.is_manager_step:
            manager_id = self._get_employee_manager(expense.employee_id)
            return [manager_id] if manager_id else []

        if step.rule_type == 'SpecificApprover' and step.specific_approver_id:
            return [int(step.specific_approver_id)]

        is_sequential = bool(step.settings.is_sequential) if step.settings else False
        # Who already acted
        actions = (
            self.session.query(ExpenseApprovalStatus)
            .filter_by(expense_id=expense.id, step_id=step.id)
            .all()
        )
        acted_ids = {a.approver_id for a in actions}

        approvers_sorted = sorted(step.approvers, key=lambda a: (a.order_index or 0))
        if is_sequential:
            for a in approvers_sorted:
                if a.approver_id not in acted_ids:
                    return [int(a.approver_id)]
            return []
        else:
            # parallel → all who haven't acted yet
            return [int(a.approver_id) for a in approvers_sorted if a.approver_id not in acted_ids]

    def _compute_next_approvers(self, expense: Expenses) -> List[int]:
        policy = self._find_applicable_policy(expense)
        if not policy:
            return []
        steps = sorted(policy.steps, key=lambda s: s.step_sequence)
        for step in steps:
            complete, _ = self._step_is_complete(expense.id, step)
            if not complete:
                return self._next_approvers_for_step(expense, step)
        return []

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
                next_approvers = self._compute_next_approvers(exp)
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

    def _current_open_step(self, expense: Expenses) -> Optional[ApprovalSteps]:
        policy = self._find_applicable_policy(expense)
        if not policy:
            return None
        for step in sorted(policy.steps, key=lambda s: s.step_sequence):
            complete, _ = self._step_is_complete(expense.id, step)
            if not complete:
                return step
        return None

    def take_action(self, expense_id: int, approver_id: int, action: str, comments: Optional[str]) -> Dict:
        try:
            expense = self.session.query(Expenses).filter_by(id=expense_id).first()
            if not expense:
                return {"success": False, "error": "Expense not found"}

            step = self._current_open_step(expense)
            if not step:
                return {"success": False, "error": "No pending approval step"}

            valid_next = self._next_approvers_for_step(expense, step)
            if approver_id not in valid_next:
                return {"success": False, "error": "Not authorized for current step"}

            record = ExpenseApprovalStatus(
                expense_id=expense_id,
                step_id=step.id,
                approver_id=approver_id,
                action='Approved' if action == 'Approved' else 'Rejected',
                comments=comments,
                action_at=datetime.utcnow(),
            )
            self.session.add(record)
            self.session.commit()

            # Evaluate step result
            is_complete, is_rejected = self._step_is_complete(expense_id, step)
            if is_complete:
                if is_rejected:
                    expense.status = 'Rejected'
                    self.session.commit()
                    return {"success": True, "status": expense.status}
                # Move forward; if no more steps → Approved
                next_approvers = self._compute_next_approvers(expense)
                if not next_approvers:
                    expense.status = 'Approved'
                    self.session.commit()
                    return {"success": True, "status": expense.status}
                else:
                    return {"success": True, "status": expense.status, "next_approvers": next_approvers}
            # Not complete yet (parallel/percentage etc.)
            return {"success": True, "status": expense.status}
        except Exception as e:
            self.session.rollback()
            return {"success": False, "error": str(e)}


def get_approvals_service() -> ApprovalsService:
    return ApprovalsService()


