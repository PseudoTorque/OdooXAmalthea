from database import get_session, Expenses
from datetime import date, datetime
class ExpensesService:
    def __init__(self):
        self.session = get_session()

    def get_expense_details_for_employee(self, employee_id: int) -> dict:
        """
        Get the details of an expense for an employee.
        """
        try:
            pending_total, waiting_approval_total, approved_total = 0, 0, 0
            expense_list = []
            expenses = self.session.query(Expenses).filter_by(employee_id=employee_id).all()
            for expense in expenses:
                if expense.status == "Draft":
                    pending_total += expense.amount
                elif expense.status == "Submitted":
                    waiting_approval_total += expense.amount
                elif expense.status == "Approved":
                    approved_total += expense.amount

                expense_list.append({
                    "id": expense.id,
                    "employee_id": expense.employee_id,
                    "paid_by_id": expense.paid_by_id,
                    "amount": expense.amount,
                    "currency_code": expense.currency_code,
                    "amount_in_company_currency": expense.amount_in_company_currency,
                    "category": expense.category,
                    "description": expense.description,
                    "expense_date": expense.expense_date,
                    "status": expense.status,
                    "remarks": expense.remarks,
                    "receipt_image_base64": expense.receipt_image_base64
                })

            return {
                "pending_total": pending_total,
                "waiting_approval_total": waiting_approval_total,
                "approved_total": approved_total,
                "expense_list": expense_list
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    def _add_expense_to_database(self, expense: Expenses) -> bool:
        """
        Add a new expense.
        """
        try:
            self.session.add(expense)
            self.session.commit()
            return True
        except Exception as e:
            print(e)
            return False
    
    def _update_expense_in_database(self, expense_id: int, update_data: dict) -> bool:
        """
        Update an expense in the database.
        """
        try:
            self.session.query(Expenses).filter_by(id=expense_id).update(update_data)
            self.session.commit()
            return True
        except Exception as e:
            return False
    
    def _delete_expense_from_database(self, expense_id: int) -> bool:
        """
        Delete an expense from the database.
        """
        try:
            self.session.query(Expenses).filter_by(id=expense_id).delete()
            self.session.commit()
            return True
        except Exception as e:
            return False
    
    def add_expense(self,
                    employee_id: int,
                    paid_by_id: int,
                    amount: float,
                    currency_code: str,
                    amount_in_company_currency: float,
                    category: str,
                    description: str,
                    expense_date: date,
                    remarks: str,
                    receipt_image_base64: str,
                    status: str = "Draft") -> bool:
        """
        Add a new expense.
        """
        try:
            expense = Expenses(employee_id=employee_id,
                        paid_by_id=paid_by_id,
                        amount=amount,
                        currency_code=currency_code,
                        amount_in_company_currency=amount_in_company_currency,
                        category=category,
                        description=description,
                        expense_date=datetime.strptime(expense_date, "%Y-%m-%d"),
                        remarks=remarks,
                        receipt_image_base64=receipt_image_base64,
                        status=status)

            return self._add_expense_to_database(expense)
        except Exception as e:
            print(e)
            self.session.rollback()
            return False

def get_expenses_service():
    """
    Get the expenses service.
    """
    return ExpensesService()

            