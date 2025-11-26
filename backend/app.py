# app.py
from flask import Flask, jsonify, request
from fetchers import fetch_latest_bank_email, fetch_latest_wallet_email
from database import db  # SQLAlchemy instance
from model import MonthlyBalance, Transaction, Budget
from datetime import datetime
from dateutil.relativedelta import relativedelta
from fetchers import (
    fetch_latest_bank_email,
    fetch_latest_wallet_email,
    fetch_and_save_easypaisa_emails,
    calculate_combined_summary

)
from fcm_utils import send_push_to_all
from sqlalchemy import func
from sqlalchemy import desc
from sqlalchemy import extract
app = Flask(__name__)

# -------------------------
# CONFIGURATION (example)
# -------------------------
import os
from dotenv import load_dotenv
load_dotenv()

MYSQL_USER = os.getenv("MYSQL_USER")
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD")
MYSQL_HOST = os.getenv("MYSQL_HOST", "localhost")
MYSQL_PORT = os.getenv("MYSQL_PORT", 3306)
MYSQL_DB = os.getenv("MYSQL_DB", "finance")

app.config['SQLALCHEMY_DATABASE_URI'] = f"mysql+mysqlconnector://{MYSQL_USER}:{MYSQL_PASSWORD}@{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DB}"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)


def save_monthly_summary(month, total_open, total_close):
    with app.app_context():
        # Check if entry already exists
        existing = MonthlyBalance.query.filter_by(month=month).first()
        if existing:
            print(f"✅ Summary for {month} already exists in DB.")
            return
        summary = MonthlyBalance(
            source="combined",
            month=month,
            opening_balance=total_open,
            closing_balance=total_close
        )
        db.session.add(summary)
        db.session.commit()
        print(f"✅ Saved monthly summary for {month} in DB.")

# -------------------------
# ROUTES
# -------------------------
@app.route("/")
def home():
    return "Backend Running ✅"

@app.route("/api/bank/latest")
def bank_latest():
    data = fetch_latest_bank_email()
    return jsonify(data)

@app.route("/api/wallet/latest")
def wallet_latest():
    data = fetch_latest_wallet_email()
    return jsonify(data)

@app.route("/api/calculate-summary", methods=["POST"])
def calculate_summary():
    current_month = datetime.now().strftime("%Y-%m")

    try:
        existing = MonthlyBalance.query.filter_by(month=current_month).first()
        if existing:
            db.session.delete(existing)
            db.session.commit()
            print(f"✅ Existing summary for {current_month} deleted.")

        # --- STEP 1: Run the calculation logic ---
        # This function now returns total_expense (non-negative) and total_savings (non-negative)
        summary_data = calculate_combined_summary()
        
        if "error" in summary_data:
            # Send specific error if calculation failed
            db.session.rollback() # Ensure rollback if the service layer failed
            return jsonify({
                "message": "Calculation failed.",
                "error": summary_data["error"]
            }), 400

        # --- STEP 2: Extract the calculated values ---
        # We now rely on calculate_combined_summary for the correct non-negative values
        opening = summary_data["total_opening_balance"]
        closing = summary_data["total_closing_balance"]
        calculated_expense = summary_data["total_expense"] # Now non-negative
        calculated_savings = summary_data["total_savings"] # New, non-negative value
        
        # --- STEP 3: Create and Save the new record ---
        new_summary = MonthlyBalance(
            source="combined",
            month=current_month,
            opening_balance=opening,
            closing_balance=closing,
            expense=calculated_expense,
            savings=calculated_savings # NEW: Assigning the calculated savings value
        )
        db.session.add(new_summary)
        db.session.commit()
        print(f"✅ New summary for {current_month} saved.")

        # Successful response with a clear message only
        return jsonify({
            "message": f"Monthly summary for {current_month} calculated and saved successfully."
        }), 200

    except Exception as e:
        # Catch unexpected server errors
        db.session.rollback()
        print(f"🚨 Server error during summary calculation: {e}")
        return jsonify({
            "message": "An unexpected server error occurred.",
            "error": str(e)
        }), 500

    
@app.route("/api/monthly-summary", methods=["GET"])
def get_monthly_summary_from_db():
    """
    Fetch monthly summary from the database for the current month.
    """
    # Automatically get current month in "YYYY-MM" format
    current_month = datetime.now().strftime("%Y-%m")

    with app.app_context():
        # Using .all() to prepare for future feature where you might fetch multiple months, 
        # but for now, we still only query the current month.
        summaries = MonthlyBalance.query.filter_by(month=current_month).all()
        
        if not summaries:
            return jsonify({"error": f"No summary found for {current_month}"}), 404

        # Since we are fetching only one record for the current month, process the first one.
        summary = summaries[0]
        
        fetched_at_str = summary.fetched_at.strftime("%d %b %Y %H:%M:%S") if summary.fetched_at else None

        return jsonify({
            "month": summary.month,
            "opening_balance": summary.opening_balance,
            "closing_balance": summary.closing_balance,
            "expense": summary.expense,
            "savings": summary.savings,  # NEW: Added 'savings'
            "fetched_at": fetched_at_str
        })



@app.route("/api/budget", methods=["POST"])
def save_budget():
    data = request.get_json()
    month = datetime.now().strftime("%Y-%m")
    
    # New list of required fields based on the updated budget structure
    required_fields = ['income', 'needs', 'wants', 'saving']
    
    for field in required_fields:
        if field not in data:
            return jsonify({
                "message": f"Missing '{field}' in request body. All fields: {', '.join(required_fields)} are required."
            }), 400
    
    # Validate and convert all budget components to float
    try:
        total_budget_amount = float(data['income'])
        needs_amount = float(data['needs'])
        wants_amount = float(data['wants'])
        saving_amount = float(data['saving'])

        # Optional: Add a check to ensure the breakdown equals the total income
        if not (abs(total_budget_amount - (needs_amount + wants_amount + saving_amount)) < 0.01):
             print(f"⚠️ Warning: Budget breakdown ({needs_amount + wants_amount + saving_amount}) does not match income ({total_budget_amount}).")
             # You might choose to return an error (400) here instead of just a warning.

    except ValueError:
        return jsonify({
            "message": "Invalid value provided. 'income', 'needs', 'wants', and 'saving' must all be numbers."
        }), 400
    
    with app.app_context():
        try:
            # Check if a budget already exists for this month
            # Assumes 'Budget' model has a 'month' attribute
            existing_budget = Budget.query.filter_by(month=month).first()

            if existing_budget:
                # Update existing budget with all four new fields
                existing_budget.total_budget = total_budget_amount
                existing_budget.needs = needs_amount
                existing_budget.wants = wants_amount
                existing_budget.saving = saving_amount
                
                db.session.commit()
                print(f"✅ Budget for {month} updated.")
                
                return jsonify({
                    "message": f"Budget for {month} updated successfully with breakdown.",
                    "month": month,
                    "total_budget": total_budget_amount,
                    "needs": needs_amount,
                    "wants": wants_amount,
                    "saving": saving_amount
                }), 200
            else:
                # Create a new budget entry including the new fields
                new_budget = Budget(
                    month=month,
                    total_budget=total_budget_amount,
                    needs=needs_amount,
                    wants=wants_amount,
                    saving=saving_amount
                )
                db.session.add(new_budget)
                db.session.commit()
                print(f"✅ New budget for {month} created.")
                
                return jsonify({
                    "message": f"New budget for {month} created successfully with breakdown.",
                    "month": month,
                    "total_budget": total_budget_amount,
                    "needs": needs_amount,
                    "wants": wants_amount,
                    "saving": saving_amount
                }), 201
        except Exception as e:
            # Rollback in case of database error
            db.session.rollback()
            return jsonify({"message": f"Database error occurred: {str(e)}"}), 500
        

@app.route("/api/budget", methods=["GET"])
def get_budget():
   
    month = datetime.now().strftime("%Y-%m")
    
    with app.app_context():
        # Check if a budget exists for this month
        budget = Budget.query.filter_by(month=month).first()
        if not budget:
            # If no budget is set, return a 404 with a clear message
            return jsonify({"message": f"No budget found for {month}."}), 404

        # Assumes 'budget.created_at' exists in the model
        created_at_str = budget.created_at.strftime("%Y-%m-%d %H:%M:%S")

        # Return the complete budget object, including the new breakdown fields
        return jsonify({
            "month": budget.month,
            "total_budget": budget.total_budget,
            "needs": budget.needs,
            "wants": budget.wants,
            "saving": budget.saving,
            "created_at": created_at_str
        }), 200

@app.route("/api/budget/history", methods=["GET"])
def get_budget_history():
    """
    Fetches the budget and monthly balance (actual expense/savings) for the 
    last four months.
    """
    # 1. Define the range of months
    months_to_fetch = 4
    months_list = []
    today = datetime.now()

    # Generate the list of month strings (e.g., ['2025-07', '2025-06', '2025-05', '2025-04'])
    for i in range(months_to_fetch):
        target_date = today - relativedelta(months=i)
        months_list.append(target_date.strftime("%Y-%m"))

    with app.app_context():
        # 2. Fetch all required data in one go for efficiency
        # Filter both Budget and MonthlyBalance tables by the list of month strings
        
        # Budget data
        budget_records = Budget.query.filter(Budget.month.in_(months_list)).all()
        budget_map = {b.month: b for b in budget_records}

        # Monthly Balance (Actuals) data
        balance_records = MonthlyBalance.query.filter(MonthlyBalance.month.in_(months_list)).all()
        balance_map = {m.month: m for m in balance_records}
        
        # 3. Compile the final list, iterating over the desired months_list (newest to oldest)
        history_data = []
        for month_str in months_list:
            budget_rec = budget_map.get(month_str)
            balance_rec = balance_map.get(month_str)
            
            # Skip months with absolutely no data, or include with zero values
            if not budget_rec and not balance_rec:
                continue

            history_data.append({
                "month": month_str,
                "budget": {
                    "total_budget": getattr(budget_rec, 'total_budget', 0.0),
                    "needs": getattr(budget_rec, 'needs', 0.0),
                    "wants": getattr(budget_rec, 'wants', 0.0),
                    "saving": getattr(budget_rec, 'saving', 0.0),
                },
                "actual": {
                    "expense": getattr(balance_rec, 'expense', 0.0),
                    "savings": getattr(balance_rec, 'savings', 0.0),
                    "closing_balance": getattr(balance_rec, 'closing_balance', 0.0),
                }
            })

    # Return the historical data (newest month first)
    return jsonify(history_data), 200
# -------------------------
# CREATE TABLES AND RUN SERVER
# -------------------------
DEVICE_TOKENS = set()   # You can store in DB later

@app.route("/api/register-device", methods=["POST"])
def register_device():
    data = request.get_json()
    token = data.get("token")

    if token:
        DEVICE_TOKENS.add(token)
        print("📥 Registered device token:", token)
        return {"status": "success"}, 200

    return {"error": "Token missing"}, 400

@app.route("/api/easypaisa/latest", methods=["GET", "POST"])
def easypaisa_latest():
    """
    Fetch unread Easypaisa transaction emails, save them, and notify devices.
    """
    result = fetch_and_save_easypaisa_emails()
    
    # Only send notification if there are new transactions
    if result.get("count", 0) > 0:
        title = "New Easypaisa Transactions"
        body = f"You have {result['count']} new transaction(s) saved."
        try:
            send_push_to_all(title, body)
            print("✅ Push notification sent to all registered devices.")
        except Exception as e:
            print(f"❌ Failed to send push notification: {e}")
    
    return jsonify(result)


@app.route("/api/send-test", methods=["POST"])
def send_test_push():
    from fcm_utils import send_push_to_all
    from app import DEVICE_TOKENS

    send_push_to_all(
        title="Test FCM",
        body="Backend successfully triggered a push",
        tokens=list(DEVICE_TOKENS)
    )
    return {"status": "sent"}, 200


@app.route('/api/latest-transactions', methods=['GET'])
def latest_transactions():
    try:
        # Fetch top 4 latest transactions
        transactions = (
            db.session.query(Transaction)
            .order_by(desc(Transaction.date))
            .limit(4)
            .all()
        )

        result = [
            {
                "id": txn.id,
                "source": txn.source,
                "date": txn.date.strftime("%Y-%m-%d"),
                "purpose": txn.purpose,
                "amount": txn.amount,
                "sender": txn.sender
            }
            for txn in transactions
        ]

        return jsonify(result), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
# -------------------------
# Top 4 spending categories for latest month
# -------------------------
@app.route('/api/transactions/top-categories', methods=['GET'])
def top_spending_categories():
    # Get latest transaction date
    latest_date = db.session.query(func.max(Transaction.date)).scalar()
    if not latest_date:
        return jsonify([]), 200

    latest_year = latest_date.year
    latest_month = latest_date.month
    print("Latest year-month for transactions:", latest_year, latest_month)

    # Aggregate spending by category
    # FIX: Removed the Transaction.amount < 0 filter. 
    # Assumes expenses are positive amounts OR you will need a separate column 
    # (like 'type') to distinguish income/expense if amount is always positive.
    categories = (
        db.session.query(
            Transaction.purpose.label("category"),
            func.sum(Transaction.amount).label("total_spent")
        )
        .filter(
            extract('year', Transaction.date) == latest_year,
            extract('month', Transaction.date) == latest_month,
            Transaction.purpose.isnot(None),  # Only include categorized transactions
            Transaction.amount > 0  # Assuming positive amounts are expenses based on your data
        )
        .group_by(Transaction.purpose)
        .order_by(func.sum(Transaction.amount).desc())  # Largest sum = most spending
        .limit(4)
        .all()
    )

    result = [
        {"category": cat.category, "total_spent": cat.total_spent}
        for cat in categories
    ]
    return jsonify(result), 200
if __name__ == "__main__":
    with app.app_context():
        db.create_all()
        print("✅ Tables ensured in database")

    app.run(host="0.0.0.0", port=5000, debug=True)
