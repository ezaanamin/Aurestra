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

    # NEW — type: credit or debit
    type = db.Column(db.String(10), nullable=False)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "source": self.source,
            "date": self.date.isoformat(),
            "purpose": self.purpose,
            "amount": self.amount,
            "sender": self.sender,
            "receiver": self.receiver,
            "transaction_id": self.transaction_id,
            "notes": self.notes,
            "type": self.type,
            "created_at": self.created_at.isoformat()
        }


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


class AccountBalance(db.Model):
    """
    Stores current balances for each account/wallet.
    Updated whenever transactions are processed.
    """
    __tablename__ = "account_balances"
    
    id = db.Column(db.Integer, primary_key=True)
    
    # Account source (matches Transaction.source)
    source = db.Column(db.String(50), nullable=False, unique=True)  # e.g., "bank", "jazzcash", "easypaisa"
    
    # Current balance
    current_balance = db.Column(db.Float, nullable=False, default=0.0)
    
    # Last update timestamp
    last_updated = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f"<AccountBalance {self.source} | Balance: {self.current_balance:.2f}>"
    
    
    def to_dict(self):
        """Convert to dictionary for API responses"""
        return {
            "id": self.id,
            "source": self.source,
            "balance": self.current_balance,
            "last_updated": self.last_updated.isoformat() if self.last_updated else None
        }


class SavingsGoal(db.Model):
    """
    Stores user savings goals (e.g., 'New Laptop', 'Emergency Fund').
    """
    __tablename__ = "savings_goals"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    target_amount = db.Column(db.Float, nullable=False)
    current_amount = db.Column(db.Float, default=0.0)
    emoji = db.Column(db.String(20), default="💰")
    deadline = db.Column(db.Date, nullable=True)
    
    # Calculate remaining amount dynamically
    @property
    def remaining(self):
        return max(self.target_amount - self.current_amount, 0)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)


    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "target_amount": self.target_amount,
            "current_amount": self.current_amount,
            "emoji": self.emoji,
            "deadline": self.deadline.isoformat() if self.deadline else None,
            "remaining": self.remaining
        }

class Category(db.Model):
    """
    Stores transaction categories.
    """
    __tablename__ = "categories"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, unique=True)
    icon = db.Column(db.String(50), nullable=False, default="cash")
    color = db.Column(db.String(20), nullable=False, default="#64748B")
    cat_type = db.Column(db.String(20), nullable=False, default="spending") # 'spending', 'income', 'both'
    is_default = db.Column(db.Boolean, default=False)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "icon": self.icon,
            "color": self.color,
            "cat_type": self.cat_type,
            "is_default": self.is_default
        }


class User(db.Model):
    """
    Stores user authentication and profile details.
    """
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False) # Storing 'PIN' as hash for now (or plain if simple)
    full_name = db.Column(db.String(100), nullable=True)
    
    # OTP Fields
    otp_code = db.Column(db.String(6), nullable=True)
    otp_expiry = db.Column(db.DateTime, nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # New Avatar URL
    avatar_url = db.Column(db.String(512), nullable=True)
    
    # Notifications Preference
    notifications_enabled = db.Column(db.Boolean, default=True)

    def to_dict(self):
        return {
            "id": self.id,
            "email": self.email,
            "full_name": self.full_name,
            "avatar_url": self.avatar_url,
            "notifications_enabled": self.notifications_enabled
        }



class DeviceToken(db.Model):
    """
    Stores Expo push notification tokens for devices.
    """
    __tablename__ = "device_tokens"

    id = db.Column(db.Integer, primary_key=True)
    token = db.Column(db.String(255), nullable=False, unique=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_seen = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "token": self.token,
            "user_id": self.user_id,
            "created_at": self.created_at.isoformat(),
            "last_seen": self.last_seen.isoformat()
        }
