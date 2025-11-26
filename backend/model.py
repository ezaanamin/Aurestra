from database import db
from datetime import datetime

class MonthlyBalance(db.Model):
    """
    Stores the monthly summary of balances for bank + wallet combined.
    Includes calculated fields for expense and net savings. Budget data 
    is managed separately in the Budget model.
    """
    __tablename__ = "monthly_balances"

    id = db.Column(db.Integer, primary_key=True)
    source = db.Column(db.String(20), nullable=False)  # e.g., "combined"
    month = db.Column(db.String(7), nullable=False, unique=True)    # Format: "YYYY-MM"
    
    # Balance Information
    opening_balance = db.Column(db.Float, nullable=False)
    closing_balance = db.Column(db.Float, nullable=False)
    
    # Financial Performance Metrics
    expense = db.Column(db.Float, nullable=True)       # Total expense (money out, always non-negative)
    savings = db.Column(db.Float, nullable=True)       # Net savings/income (money in, always non-negative)
    
    # Metadata
    fetched_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return (
            f"<MonthlyBalance {self.month} | "
            f"Open: {self.opening_balance:.2f} | "
            f"Close: {self.closing_balance:.2f} | "
            f"Expense: {self.expense:.2f} | "
            f"Savings: {self.savings:.2f}>"
        )



class Transaction(db.Model):
    """
    Stores individual transactions from bank or wallet emails.
    """
    __tablename__ = "transactions"

    id = db.Column(db.Integer, primary_key=True)

    
    source = db.Column(db.String(20), nullable=False)

    
    date = db.Column(db.DateTime, nullable=False)

    # Category (prints, gym, food, research paper etc.)
    purpose = db.Column(db.String(255), nullable=True)

    # Amount received
    amount = db.Column(db.Float, nullable=False)

    # Sender / Who actually sent the money
    sender = db.Column(db.String(255), nullable=True)

    # NEW — Receiver (Hiba Dawood, Haris Masood, Umair etc.)
    receiver = db.Column(db.String(255), nullable=True)

    # NEW — unique easypaisa transaction ID for duplicate protection
    transaction_id = db.Column(db.String(50), unique=True, nullable=True)

    # Optional extra details (store name, bank name etc.)
    notes = db.Column(db.String(255), nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"<Transaction {self.source} | {self.amount} | {self.date} | {self.sender} → {self.receiver}>"


class Budget(db.Model):
   
    __tablename__ = "budgets"

    id = db.Column(db.Integer, primary_key=True)
    month = db.Column(db.String(7), nullable=False, unique=True)  # Format: "YYYY-MM"
    total_budget = db.Column(db.Float, nullable=False)

    # Updated columns for detailed savings tracking: Needs, Wants, and Total
    needs = db.Column(db.Float, nullable=False, default=0.0)
    wants = db.Column(db.Float, nullable=False, default=0.0) # Re-introduced for non-essential goals
    saving = db.Column(db.Float, nullable=False, default=0.0) # Total planned or achieved savings

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"<Budget {self.month} | Total: {self.total_budget} | Savings (Total): {self.saving}>"
