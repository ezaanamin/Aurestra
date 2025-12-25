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
from sms_parser import process_bank_sms, BankAlhabibSMSParser

app = Flask(__name__)

# -------------------------
# CONFIGURATION
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

# Simple in-memory rate limiting
from collections import defaultdict
from time import time

request_counts = defaultdict(list)

def rate_limit_check(key, limit, window):
    """Simple rate limiting: limit requests per window (seconds)"""
    now = time()
    request_counts[key] = [req_time for req_time in request_counts[key] if now - req_time < window]
    
    if len(request_counts[key]) >= limit:
        return False
    
    request_counts[key].append(now)
    return True

def save_monthly_summary(month, total_open, total_close):
    with app.app_context():
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
# BASIC ROUTES
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

# -------------------------
# SUMMARY ROUTES
# -------------------------
@app.route("/api/calculate-summary", methods=["POST"])
def calculate_summary():
    current_month = datetime.now().strftime("%Y-%m")

    try:
        existing = MonthlyBalance.query.filter_by(month=current_month).first()
        if existing:
            db.session.delete(existing)
            db.session.commit()
            print(f"✅ Existing summary for {current_month} deleted.")

        summary_data = calculate_combined_summary()
        
        if "error" in summary_data:
            db.session.rollback()
            return jsonify({
                "message": "Calculation failed.",
                "error": summary_data["error"]
            }), 400

        opening = summary_data["total_opening_balance"]
        closing = summary_data["total_closing_balance"]
        calculated_expense = summary_data["total_expense"]
        calculated_savings = summary_data["total_savings"]
        
        new_summary = MonthlyBalance(
            source="combined",
            month=current_month,
            opening_balance=opening,
            closing_balance=closing,
            expense=calculated_expense,
            savings=calculated_savings
        )
        db.session.add(new_summary)
        db.session.commit()
        print(f"✅ New summary for {current_month} saved.")

        return jsonify({
            "message": f"Monthly summary for {current_month} calculated and saved successfully."
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"🚨 Server error during summary calculation: {e}")
        return jsonify({
            "message": "An unexpected server error occurred.",
            "error": str(e)
        }), 500

@app.route("/api/monthly-summary", methods=["GET"])
def get_monthly_summary_from_db():
    current_month = datetime.now().strftime("%Y-%m")

    with app.app_context():
        summaries = MonthlyBalance.query.filter_by(month=current_month).all()
        
        if not summaries:
            return jsonify({"error": f"No summary found for {current_month}"}), 404

        summary = summaries[0]
        fetched_at_str = summary.fetched_at.strftime("%d %b %Y %H:%M:%S") if summary.fetched_at else None

        return jsonify({
            "month": summary.month,
            "opening_balance": summary.opening_balance,
            "closing_balance": summary.closing_balance,
            "expense": summary.expense,
            "savings": summary.savings,
            "fetched_at": fetched_at_str
        })

# -------------------------
# BUDGET ROUTES
# -------------------------
@app.route("/api/budget", methods=["POST"])
def save_budget():
    data = request.get_json()
    month = datetime.now().strftime("%Y-%m")
    
    required_fields = ['income', 'needs', 'wants', 'saving']
    
    for field in required_fields:
        if field not in data:
            return jsonify({
                "message": f"Missing '{field}' in request body."
            }), 400
    
    try:
        total_budget_amount = float(data['income'])
        needs_amount = float(data['needs'])
        wants_amount = float(data['wants'])
        saving_amount = float(data['saving'])
    except ValueError:
        return jsonify({
            "message": "Invalid value provided. All amounts must be numbers."
        }), 400
    
    with app.app_context():
        try:
            existing_budget = Budget.query.filter_by(month=month).first()

            if existing_budget:
                existing_budget.total_budget = total_budget_amount
                existing_budget.needs = needs_amount
                existing_budget.wants = wants_amount
                existing_budget.saving = saving_amount
                db.session.commit()
                
                return jsonify({
                    "message": f"Budget for {month} updated successfully.",
                    "month": month,
                    "total_budget": total_budget_amount,
                    "needs": needs_amount,
                    "wants": wants_amount,
                    "saving": saving_amount
                }), 200
            else:
                new_budget = Budget(
                    month=month,
                    total_budget=total_budget_amount,
                    needs=needs_amount,
                    wants=wants_amount,
                    saving=saving_amount
                )
                db.session.add(new_budget)
                db.session.commit()
                
                return jsonify({
                    "message": f"Budget for {month} created successfully.",
                    "month": month,
                    "total_budget": total_budget_amount,
                    "needs": needs_amount,
                    "wants": wants_amount,
                    "saving": saving_amount
                }), 201
        except Exception as e:
            db.session.rollback()
            return jsonify({"message": f"Database error: {str(e)}"}), 500

@app.route("/api/budget", methods=["GET"])
def get_budget():
    month = datetime.now().strftime("%Y-%m")
    
    with app.app_context():
        budget = Budget.query.filter_by(month=month).first()
        if not budget:
            return jsonify({"message": f"No budget found for {month}."}), 404

        created_at_str = budget.created_at.strftime("%Y-%m-%d %H:%M:%S")

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
    months_to_fetch = 4
    months_list = []
    today = datetime.now()

    for i in range(months_to_fetch):
        target_date = today - relativedelta(months=i)
        months_list.append(target_date.strftime("%Y-%m"))

    with app.app_context():
        budget_records = Budget.query.filter(Budget.month.in_(months_list)).all()
        budget_map = {b.month: b for b in budget_records}

        balance_records = MonthlyBalance.query.filter(MonthlyBalance.month.in_(months_list)).all()
        balance_map = {m.month: m for m in balance_records}
        
        history_data = []
        for month_str in months_list:
            budget_rec = budget_map.get(month_str)
            balance_rec = balance_map.get(month_str)
            
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

    return jsonify(history_data), 200

# -------------------------
# DEVICE & NOTIFICATIONS
# -------------------------
DEVICE_TOKENS = set()

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
    result = fetch_and_save_easypaisa_emails()
    
    if result.get("count", 0) > 0:
        title = "New Easypaisa Transactions"
        body = f"You have {result['count']} new transaction(s) saved."
        try:
            send_push_to_all(title, body)
            print("✅ Push notification sent.")
        except Exception as e:
            print(f"❌ Failed to send push: {e}")
    
    return jsonify(result)

@app.route("/api/send-test", methods=["POST"])
def send_test_push():
    send_push_to_all(
        title="Test FCM",
        body="Backend test push",
        tokens=list(DEVICE_TOKENS)
    )
    return {"status": "sent"}, 200

# -------------------------
# TRANSACTION ROUTES
# -------------------------
@app.route('/api/latest-transactions', methods=['GET'])
def latest_transactions():
    try:
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

@app.route('/api/transactions/top-categories', methods=['GET'])
def top_spending_categories():
    latest_date = db.session.query(func.max(Transaction.date)).scalar()
    if not latest_date:
        return jsonify([]), 200

    latest_year = latest_date.year
    latest_month = latest_date.month

    categories = (
        db.session.query(
            Transaction.purpose.label("category"),
            func.sum(Transaction.amount).label("total_spent")
        )
        .filter(
            extract('year', Transaction.date) == latest_year,
            extract('month', Transaction.date) == latest_month,
            Transaction.purpose.isnot(None),
            Transaction.amount > 0
        )
        .group_by(Transaction.purpose)
        .order_by(func.sum(Transaction.amount).desc())
        .limit(4)
        .all()
    )

    result = [
        {"category": cat.category, "total_spent": cat.total_spent}
        for cat in categories
    ]
    return jsonify(result), 200

# -------------------------
# SMS ROUTES (NEW) 🎉
# -------------------------

@app.route("/api/sms/process", methods=["POST"])
def process_sms():
    """Process bank SMS and create transaction"""
    try:
        if not rate_limit_check('sms_process', 20, 60):
            return jsonify({"error": "Rate limit exceeded"}), 429
        
        data = request.get_json()
        
        if not data or 'message' not in data:
            return jsonify({"error": "SMS message required"}), 400
        
        message = data.get('message')
        sender = data.get('sender', 'BAHL')
        
        if not message or len(message.strip()) < 10:
            return jsonify({"error": "Invalid SMS message"}), 400
        
        transaction = process_bank_sms(message, sender)
        
        if not transaction:
            if not BankAlhabibSMSParser.is_transaction_sms(message):
                return jsonify({
                    "status": "skipped",
                    "message": "SMS is not a transaction (OTP, info, etc.)"
                }), 200
            else:
                return jsonify({
                    "status": "failed",
                    "message": "Could not parse transaction from SMS"
                }), 400
        
        print(f"✅ SMS transaction created: {transaction.id}")
        
        return jsonify({
            "status": "success",
            "message": "Transaction created from SMS",
            "transaction": transaction.to_dict()
        }), 201
        
    except Exception as e:
        print(f"❌ Error processing SMS: {e}")
        return jsonify({"error": "Failed to process SMS"}), 500

@app.route("/api/sms/test", methods=["POST"])
def test_sms_parsing():
    """Test SMS parsing without saving"""
    try:
        if not rate_limit_check('sms_test', 10, 60):
            return jsonify({"error": "Rate limit exceeded"}), 429
        
        data = request.get_json()
        
        if not data or 'message' not in data:
            return jsonify({"error": "SMS message required"}), 400
        
        message = data.get('message')
        sender = data.get('sender', 'BAHL')
        
        transaction_data = BankAlhabibSMSParser.parse_sms(message, sender)
        
        if not transaction_data:
            if not BankAlhabibSMSParser.is_transaction_sms(message):
                return jsonify({
                    "status": "skipped",
                    "message": "Not a transaction SMS"
                }), 200
            else:
                return jsonify({
                    "status": "failed",
                    "message": "Could not parse SMS"
                }), 400
        
        response = {
            "status": "success",
            "message": "SMS parsed successfully",
            "parsed_data": {
                "type": transaction_data['type'],
                "amount": transaction_data['amount'],
                "purpose": transaction_data['purpose'],
                "date": transaction_data['date'].isoformat(),
                "notes": transaction_data['notes'],
            }
        }
        
        if transaction_data['type'] == 'credit':
            response['parsed_data']['sender'] = transaction_data['sender']
        else:
            response['parsed_data']['receiver'] = transaction_data['receiver']
        
        return jsonify(response), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/sms/batch", methods=["POST"])
def process_batch_sms():
    """Process multiple SMS messages"""
    try:
        if not rate_limit_check('sms_batch', 5, 60):
            return jsonify({"error": "Rate limit exceeded"}), 429
        
        data = request.get_json()
        
        if not data or 'messages' not in data:
            return jsonify({"error": "Messages array required"}), 400
        
        messages = data.get('messages', [])
        
        if not isinstance(messages, list) or len(messages) == 0:
            return jsonify({"error": "Messages must be non-empty array"}), 400
        
        if len(messages) > 50:
            return jsonify({"error": "Maximum 50 messages per batch"}), 400
        
        results = {
            'total': len(messages),
            'created': 0,
            'skipped': 0,
            'failed': 0,
            'transactions': [],
            'errors': []
        }
        
        for idx, msg_data in enumerate(messages):
            try:
                message = msg_data.get('message')
                sender = msg_data.get('sender', 'BAHL')
                
                if not message:
                    results['failed'] += 1
                    results['errors'].append({'index': idx, 'error': 'Empty message'})
                    continue
                
                if not BankAlhabibSMSParser.is_transaction_sms(message):
                    results['skipped'] += 1
                    continue
                
                transaction = process_bank_sms(message, sender)
                
                if transaction:
                    results['created'] += 1
                    results['transactions'].append({
                        'id': transaction.id,
                        'type': transaction.type,
                        'amount': transaction.amount,
                        'purpose': transaction.purpose
                    })
                else:
                    results['failed'] += 1
                    results['errors'].append({'index': idx, 'error': 'Parse failed'})
                    
            except Exception as e:
                results['failed'] += 1
                results['errors'].append({'index': idx, 'error': str(e)})
        
        print(f"✅ Batch: {results['created']} created, {results['skipped']} skipped, {results['failed']} failed")
        
        return jsonify(results), 200
        
    except Exception as e:
        return jsonify({"error": "Batch processing failed"}), 500

# -------------------------
# STARTUP
# -------------------------
if __name__ == "__main__":
    with app.app_context():
        db.create_all()
        print("✅ Tables ensured in database")

    app.run(host="0.0.0.0", port=5000, debug=True)