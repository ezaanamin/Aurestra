from flask import jsonify, request
from fetchers import fetch_latest_bank_email, fetch_latest_wallet_email
from database import app, db  # Import app from database.py
from model import MonthlyBalance, Transaction, Budget, AccountBalance, SavingsGoal, Category
from datetime import datetime, date, timedelta
import os
from dateutil.relativedelta import relativedelta
from werkzeug.utils import secure_filename
from time import time
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
import jwt
import smtplib
import secrets
import random
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import random
from functools import wraps
from model import User

# Config is already loaded in database.py



# JWT Secret
app.config['SECRET_KEY'] = 'super_secret_jwt_key_ezaan_123'  # Change in production

# Email Config (Gmail)
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587
# Ideally these should be env vars
SMTP_EMAIL = "ezaan.amin@gmail.com" 
# NOTE: User needs to provide App Password in .env or we assume it is the Wallet email
SMTP_PASSWORD = os.getenv("WALLET_APP_PASSWORD") or os.getenv("wallet_APP_PASSWORD") or os.getenv("APP_PASSWORD") or os.getenv("OPTP_APP_PASSWORD") 

# -------------------------
# UTILS
# -------------------------
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            if auth_header.startswith("Bearer "):
                token = auth_header.split(" ")[1]
        
        if not token:
            return jsonify({'message': 'Token is missing!'}), 401
        
        try:
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
            current_user = User.query.get(data['user_id'])
            if not current_user:
                return jsonify({'message': 'User invalid!'}), 401
        except:
            return jsonify({'message': 'Token is invalid!'}), 401
            
        return f(current_user, *args, **kwargs)
    
    return decorated

def send_otp_email(to_email, otp_code):
    try:
        msg = MIMEMultipart('alternative')
        msg['From'] = SMTP_EMAIL
        msg['To'] = to_email
        msg['Subject'] = "Your Aurestra Verification Code"
        
        # Plain text fallback
        text = f"Your Aurestra verification code is: {otp_code}\n\nValid for 5 minutes."
        
        # HTML Version
        html = f"""
        <html>
          <body style="font-family: Arial, sans-serif; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
              <h2 style="color: #3B82F6;">Aurestra</h2>
              <p>Hello,</p>
              <p>Your verification code for secure login is:</p>
              <div style="background-color: #f8fafc; padding: 15px; text-align: center; border-radius: 5px; font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #1e293b;">
                {otp_code}
              </div>
              <p style="color: #666; font-size: 14px; margin-top: 20px;">This code is valid for 5 minutes. Do not share this code with anyone.</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
              <p style="color: #999; font-size: 12px; text-align: center;">&copy; 2026 Aurestra Finance. All rights reserved.</p>
            </div>
          </body>
        </html>
        """
        
        msg.attach(MIMEText(text, 'plain'))
        msg.attach(MIMEText(html, 'html'))
        
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SMTP_EMAIL, SMTP_PASSWORD)
        text = msg.as_string()
        server.sendmail(SMTP_EMAIL, to_email, text)
        server.quit()
        return True
    except Exception as e:
        print(f"⚠️ Failed to send email: {e}")
        return False

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
# REPORTS ROUTES
# -------------------------
@app.route("/api/reports/statement", methods=["POST"])
def get_statement_report():
    data = request.get_json() or {}
    
    # Input: month "YYYY-MM" (e.g. "2026-01")
    # If provided, we want the PREVIOUS month ("2025-12").
    # If NOT provided, we assume "today" is the input, so we want previous month relative to today.
    
    input_month_str = data.get("month")
    
    try:
        if input_month_str:
            input_date = datetime.strptime(input_month_str, "%Y-%m")
        else:
            input_date = datetime.now()
            
        # Calculate target month (Previous Month)
        # First day of input month
        first_of_input = input_date.replace(day=1)
        # Last day of previous month
        last_of_prev = first_of_input - timedelta(days=1)
        # First day of previous month
        first_of_prev = last_of_prev.replace(day=1)
        
        target_month_str = first_of_prev.strftime("%Y-%m")
        target_year = first_of_prev.year
        target_month = first_of_prev.month
        
    except ValueError:
        return jsonify({"error": "Invalid month format. Use YYYY-MM"}), 400

    with app.app_context():
        # 1. Fetch Summary for Target Month
        summary = MonthlyBalance.query.filter_by(month=target_month_str).first()
        
        opening_bal = 0.0
        closing_bal = 0.0
        
        if summary:
            opening_bal = summary.opening_balance
            closing_bal = summary.closing_balance
        else:
            # Try to auto-calculate if missing?
            # Or just return 0s
            pass
            
        # 2. Fetch Transactions for Target Month
        transactions = Transaction.query.filter(
            extract('year', Transaction.date) == target_year,
            extract('month', Transaction.date) == target_month
        ).order_by(Transaction.date.desc()).all()
        
        # 3. Calculate Income vs Expense
        total_income = 0.0
        total_expense = 0.0
        
        income_breakdown = {}
        expense_breakdown = {}
        
        tx_list = []
        
        for tx in transactions:
            amount = tx.amount
            category = tx.purpose or "Uncategorized"
            
            if tx.type == 'credit':
                total_income += amount
                income_breakdown[category] = income_breakdown.get(category, 0) + amount
            elif tx.type == 'debit':
                total_expense += amount
                expense_breakdown[category] = expense_breakdown.get(category, 0) + amount
                
            tx_list.append(tx.to_dict())
            
        # 4. Determine Surplus / Deficit
        surplus = total_income - total_expense
        status = "Surplus" if surplus >= 0 else "Deficit"
        
        return jsonify({
            "target_month": target_month_str,
            "opening_balance": opening_bal,
            "closing_balance": closing_bal,
            "summary": {
                "income": total_income,
                "expenses": total_expense,
                "net": surplus,
                "status": status
            },
            "breakdown": {
                "income": income_breakdown,
                "expenses": expense_breakdown
            },
            "transactions": tx_list
        })


# -------------------------
# BASIC ROUTES
# -------------------------
@app.route("/")
def home():
    return "Backend Running ✅"

# -------------------------
# AUTH ROUTES
# -------------------------
@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password') 
    
    user = User.query.filter_by(email=email).first()
    
    if not user:
        user = User(email=email, password_hash=password, full_name="Ezaan Amin")
        db.session.add(user)
        db.session.commit()
    else:
        # DEBUG LOGS
        print(f"DEBUG LOGIN: Request for {email}")
        print(f"DEBUG LOGIN: Input Pass: '{password}'")
        print(f"DEBUG LOGIN: Stored Pass: '{user.password_hash}'")

        if user.password_hash != password:
             return jsonify({'message': 'Invalid credentials'}), 401

    # Generate Real Random OTP (Secure)
    # Using secrets for cryptographic randomness
    otp = ''.join([str(secrets.randbelow(10)) for _ in range(6)])
    
    user.otp_code = otp
    user.otp_expiry = datetime.utcnow() + timedelta(minutes=5)
    db.session.commit()
    
    # Attempt to send Email
    email_success = send_otp_email(user.email, otp)
    
    if email_success:
        return jsonify({'message': 'OTP sent to email', 'otp_required': True}), 200
    else:
        # Fallback: Log OTP to console and allow login flow (Soft Fail)
        print(f"⚠️ [AUTH] Email sending failed. DEBUG OTP for {email}: {otp}")
        return jsonify({'message': 'OTP sent (Check Console/Dev)', 'otp_required': True}), 200

@app.route("/api/verify-otp", methods=["POST"])
def verify_otp():
    data = request.get_json()
    email = data.get('email')
    otp = data.get('otp')
    
    user = User.query.filter_by(email=email).first()
    
    if not user:
        return jsonify({'message': 'User not found'}), 404
        
    if user.otp_code != otp:
        return jsonify({'message': 'Invalid OTP'}), 400
        
    if datetime.utcnow() > user.otp_expiry:
        return jsonify({'message': 'OTP expired'}), 400
        
    # Generate JWT
    token = jwt.encode({
        'user_id': user.id,
        'email': user.email,
        'exp': datetime.utcnow() + timedelta(hours=2)
    }, app.config['SECRET_KEY'], algorithm="HS256")
    
    # Clear OTP
    user.otp_code = None
    db.session.commit()
    
    return jsonify({
        'token': token,
        'user': user.to_dict()
    }), 200

@app.route("/api/profile", methods=["GET", "POST"])
@token_required
def profile(current_user):
    if request.method == "GET":
        with app.app_context():
            # Calculate stats
            tx_count = Transaction.query.count()
            goals_count = SavingsGoal.query.count()
            categories_count = db.session.query(func.count(func.distinct(Transaction.purpose))).scalar()
            
            user_data = current_user.to_dict()
            user_data['stats'] = {
                'transactions': tx_count,
                'goals': goals_count,
                'categories': categories_count
            }
            return jsonify(user_data)
    
    if request.method == "POST":
        data = request.get_json()
        if 'full_name' in data:
            current_user.full_name = data['full_name']
        if 'email' in data:
            current_user.email = data['email']
        if 'avatar_url' in data:
            current_user.avatar_url = data['avatar_url']
        if 'notifications_enabled' in data:
            current_user.notifications_enabled = bool(data['notifications_enabled'])
        
        db.session.commit()
        return jsonify(current_user.to_dict())


@app.route("/api/bank/latest")
def bank_latest():
    data = fetch_latest_bank_email()
    return jsonify(data)

# Static Config for Uploads
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static/uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

@app.route('/static/uploads/<filename>')
def serve_upload(filename):
    from flask import send_from_directory
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@app.route("/api/upload/avatar", methods=["POST"])
@token_required
def upload_avatar(current_user):
    if 'avatar' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['avatar']
    
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
        
    if file:
        timestamp = int(time())
        filename = secure_filename(f"user_{current_user.id}_{timestamp}_{file.filename}")
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        # Build URL (Relative for now)
        avatar_url = f"/static/uploads/{filename}"
        
        current_user.avatar_url = avatar_url
        db.session.commit()
        
        return jsonify({'message': 'File uploaded', 'avatar_url': avatar_url}), 200

@app.route("/api/wallet/latest")
def wallet_latest():
    data = fetch_latest_wallet_email()
    return jsonify(data)

@app.route("/api/accounts", methods=["GET"])
def get_accounts():
    with app.app_context():
        # 1. Start with fresh statement balance if possible
        try:
            bank_data = fetch_latest_bank_email()
            if "balances" in bank_data:
                closing_bal = bank_data["balances"].get("closing_balance", 0.0)
                bank_acc = AccountBalance.query.filter_by(source="bank").first()
                if bank_acc:
                    bank_acc.current_balance = closing_bal
                    bank_acc.last_updated = datetime.utcnow()
                    
                    # SAVE TRANSACTIONS
                    extracted_txs = bank_data.get("transactions", [])
                    for tx in extracted_txs:
                        try:
                            tx_date = datetime.strptime(tx["date"], "%d/%m/%Y")
                        except:
                            tx_date = datetime.utcnow()

                        exists = Transaction.query.filter(
                            Transaction.date == tx_date,
                            Transaction.amount == tx["amount"],
                            Transaction.type == tx["type"]
                        ).first()
                        
                        if not exists:
                            new_tx = Transaction(
                                source="bank",
                                date=tx_date,
                                amount=tx["amount"],
                                type=tx["type"],
                                purpose="Uncategorized",
                                sender="Bank Statement",
                                receiver="Me",
                                notes=tx["description"][:250]
                            )
                            db.session.add(new_tx)
                    
                    db.session.commit()
        except:
            pass

        # 2. Fetch all accounts
        accounts = AccountBalance.query.all()
        
        # 3. Calculate Total Savings Allocation (only ACTIVE ones)
        total_allocated = db.session.query(func.sum(SavingsGoal.current_amount))\
            .filter(SavingsGoal.current_amount < SavingsGoal.target_amount).scalar() or 0.0

        # 4. Calculate LIVE Balance (Statement + Recent SMS Adjustments)
        response_data = []
        cutoff_date = datetime.today().replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        for acc in accounts:
            acc_dict = acc.to_dict()
            
            if acc.source == 'bank':
                # Find ONLY SMS transactions since start of current month (PDF transactions are ALREADY in current_balance)
                live_txs = Transaction.query.filter(
                    Transaction.source == 'sms',
                    Transaction.date >= cutoff_date
                ).all()
                
                adjustment = 0.0
                for tx in live_txs:
                    if tx.type == 'credit':
                        adjustment += tx.amount
                    elif tx.type == 'debit':
                        adjustment -= tx.amount
                
                # TOTAL DYNAMIC BALANCE Calculation
                # Starting Point: Real Statement Balance
                # Add: New Real-time SMS Transactions (+/-)
                # Subtract: Money Set Aside for Savings
                live_balance = acc.current_balance + adjustment - total_allocated
                
                # Update response (We do NOT save this back to DB permanently to avoid double-counting on refresh)
                acc_dict['balance'] = live_balance
                acc_dict['statement_base'] = acc.current_balance
                acc_dict['live_adjustment'] = adjustment
                acc_dict['savings_reduction'] = total_allocated
                
            response_data.append(acc_dict)

        return jsonify(response_data)

@app.route("/api/savings-goals", methods=["GET", "POST"])
def manage_savings_goals():
    if request.method == "GET":
        goals = SavingsGoal.query.all()
        return jsonify([g.to_dict() for g in goals])
    
    if request.method == "POST":
        data = request.get_json()
        name = data.get("name")
        target = float(data.get("target_amount", 0))
        current = float(data.get("current_amount", 0))
        emoji = data.get("emoji", "💰")
        deadline_str = data.get("deadline") # YYYY-MM-DD
        
        deadline_date = None
        if deadline_str:
            try:
                deadline_date = datetime.strptime(deadline_str, "%Y-%m-%d").date()
            except:
                pass
        
        new_goal = SavingsGoal(
            name=name,
            target_amount=target,
            current_amount=current,
            emoji=emoji,
            deadline=deadline_date
        )
        db.session.add(new_goal)
        db.session.commit()
        
        return jsonify(new_goal.to_dict()), 201

@app.route("/api/savings-goals/<int:id>", methods=["PUT"])
def update_savings_goal(id):
    try:
        goal = SavingsGoal.query.get(id)
        if not goal:
            return jsonify({"error": "Goal not found"}), 404
            
        data = request.get_json()
        if "name" in data:
            goal.name = data["name"]
        if "target_amount" in data:
            goal.target_amount = float(data["target_amount"])
        if "current_amount" in data:
            goal.current_amount = float(data["current_amount"])
        if "emoji" in data:
            goal.emoji = data["emoji"]
        if "deadline" in data:
            try:
                goal.deadline = datetime.strptime(data["deadline"], "%Y-%m-%d").date()
            except:
                pass
                
        db.session.commit()
        return jsonify(goal.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@app.route("/api/savings-goals/<int:id>", methods=["DELETE"])
def delete_savings_goal(id):
    try:
        goal = SavingsGoal.query.get(id)
        if not goal:
            return jsonify({"error": "Goal not found"}), 404
            
        db.session.delete(goal)
        db.session.commit()
        return jsonify({"message": "Goal deleted successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@app.route("/api/savings-goals/<int:id>/contribute", methods=["POST"])
def contribute_to_savings_goal(id):
    try:
        goal = SavingsGoal.query.get(id)
        if not goal:
            return jsonify({"error": "Goal not found"}), 404
            
        data = request.get_json()
        amount = float(data.get("amount", 0))
        
        if amount <= 0:
            return jsonify({"error": "Amount must be greater than zero"}), 400
            
        goal.current_amount += amount
        db.session.commit()
        return jsonify(goal.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
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
        # 1. Determine Income (Budget > Transaction Credits)
        # We do this first so we can use it in response regardless of summary source
        budget_entry = Budget.query.filter_by(month=current_month).first()
        if budget_entry and budget_entry.total_budget > 0:
            total_income_val = budget_entry.total_budget
        else:
            from sqlalchemy import func, extract
            total_income_val = (
                db.session.query(func.sum(Transaction.amount))
                .filter(
                    extract('year', Transaction.date) == datetime.now().year,
                    extract('month', Transaction.date) == datetime.now().month,
                    Transaction.type == 'credit'
                )
                .scalar() or 0.0
            )

        summaries = MonthlyBalance.query.filter_by(month=current_month).all()
        
        # Auto-calculate if not found
        if not summaries:
            print(f"ℹ️ No summary found for {current_month}, calculating now...")
            summary_data = calculate_combined_summary()
            
            if "error" in summary_data:
                # If calculation fails (e.g. no emails at all), we should NOT return 404.
                # We return a ZERO summary so the app works.
                print(f"⚠️ Summary calculation failed: {summary_data['error']}. Using 0.0 defaults.")
                opening = 0.0
                closing = 0.0
                calculated_expense = 0.0
                # calculated_savings = 0.0 # We will derive this
            else:
                opening = summary_data["total_opening_balance"]
                closing = summary_data["total_closing_balance"]
                calculated_expense = summary_data["total_expense"]
                # calculated_savings = summary_data["total_savings"]

            # Use our robust total_income_val
            final_savings = total_income_val - calculated_expense

            new_summary = MonthlyBalance(
                source="combined",
                month=current_month,
                opening_balance=opening,
                closing_balance=closing,
                expense=calculated_expense,
                savings=final_savings,
                fetched_at=datetime.utcnow()
            )
            db.session.add(new_summary)
            try:
                db.session.commit()
                print(f"✅ Auto-calculated summary for {current_month} saved.")
                
                # Now return the new summary
                return jsonify({
                    "month": current_month,
                    "opening_balance": opening,
                    "closing_balance": closing,
                    "total_expense": calculated_expense,
                    "total_income": total_income_val,
                    "total_savings": final_savings,
                    "fetched_at": datetime.utcnow().strftime("%d %b %Y %H:%M:%S")
                })
            except Exception as e:
                db.session.rollback()
                print(f"❌ Failed to save auto-summary: {e}")
                return jsonify({"error": "Failed to save summary"}), 500

        # If summary exists
        summary = summaries[0]
        
        # Re-calc expense from transactions for freshness (optional but good)
        # Or just use the summary.expense if we trust it. 
        # Let's trust summary.expense for expense, but override income.
        
        # Actually, let's keep the dynamic expense calc if it was there before?
        # The previous code calculated total_expense dynamically. Let's keep that pattern.
        total_expense_val = (
            db.session.query(func.sum(Transaction.amount))
            .filter(
                extract('year', Transaction.date) == datetime.now().year,
                extract('month', Transaction.date) == datetime.now().month,
                Transaction.type == 'debit'
            )
            .scalar() or 0.0
        )

        fetched_at_str = summary.fetched_at.strftime("%d %b %Y %H:%M:%S") if summary.fetched_at else None
        return jsonify({
            "month": summary.month,
            "opening_balance": summary.opening_balance,
            "closing_balance": summary.closing_balance,
            "total_expense": total_expense_val, # Use calculated expense from transactions
            "total_income": total_income_val,   # Use calculated/budget income
            "total_savings": total_income_val - total_expense_val, # consistently derived
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
@token_required
def get_budget(current_user):
    month = datetime.now().strftime("%Y-%m")
    
    with app.app_context():
        budget = Budget.query.filter_by(month=month).first()
        # ... logic ... (simplified, just call existing logic or wrap it)
        # Note: Original code didn't use user ID, but we should eventually.
        # For now, we just protecting the route.
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

@app.route("/api/register-device", methods=["POST"])
def register_device():
    data = request.get_json()
    token = data.get("token")
    auth_header = request.headers.get('Authorization')
    user_id = None

    if auth_header and auth_header.startswith("Bearer "):
        try:
            jwt_token = auth_header.split(" ")[1]
            payload = jwt.decode(jwt_token, app.config['SECRET_KEY'], algorithms=["HS256"])
            user_id = payload.get('user_id')
        except:
            pass

    if token:
        from model import DeviceToken
        existing = DeviceToken.query.filter_by(token=token).first()
        if existing:
            existing.last_seen = datetime.utcnow()
            if user_id:
                existing.user_id = user_id
            db.session.commit()
            return {"status": "success", "message": "Token updated"}, 200
        else:
            new_token = DeviceToken(token=token, user_id=user_id)
            db.session.add(new_token)
            db.session.commit()
            print("📥 Registered persistent device token:", token)
            return {"status": "success", "message": "Token registered"}, 201

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
        body="Backend test push"
    )
    return {"status": "sent"}, 200

# -------------------------
# TRANSACTION ROUTES
# -------------------------
@app.route('/api/analytics/trend', methods=['GET'])
def get_analytics_trend():
    period = request.args.get('period', default='month')
    
    data_points = []
    
    if period == 'week':
        # Last 7 days
        for i in range(6, -1, -1):
            target_date = datetime.now().date() - timedelta(days=i)
            total = (
                db.session.query(func.sum(Transaction.amount))
                .filter(
                    func.date(Transaction.date) == target_date,
                    Transaction.type == 'debit'
                )
                .scalar() or 0.0
            )
            data_points.append({
                "label": target_date.strftime("%a"), # Mon, Tue...
                "value": float(total)
            })
            
    elif period == 'month':
        # Last 6 months (default behavior for trend)
        for i in range(5, -1, -1):
            target_date = datetime.now() - relativedelta(months=i)
            month_str = target_date.strftime("%Y-%m")
            
            total = (
                db.session.query(func.sum(Transaction.amount))
                .filter(
                    extract('year', Transaction.date) == target_date.year,
                    extract('month', Transaction.date) == target_date.month,
                    Transaction.type == 'debit'
                )
                .scalar() or 0.0
            )
            data_points.append({
                "label": target_date.strftime("%b"), # Jan, Feb...
                "value": float(total)
            })
            
    elif period == 'year':
        # Current year months
        for i in range(1, 13):
            year = datetime.now().year
            total = (
                db.session.query(func.sum(Transaction.amount))
                .filter(
                    extract('year', Transaction.date) == year,
                    extract('month', Transaction.date) == i,
                    Transaction.type == 'debit'
                )
                .scalar() or 0.0
            )
            data_points.append({
                "label": date(year, i, 1).strftime("%b"),
                "value": float(total)
            })
            
    elif period == 'all':
        # Last 5 years
        for i in range(4, -1, -1):
            year = datetime.now().year - i
            total = (
                db.session.query(func.sum(Transaction.amount))
                .filter(
                    extract('year', Transaction.date) == year,
                    Transaction.type == 'debit'
                )
                .scalar() or 0.0
            )
            data_points.append({
                "label": str(year),
                "value": float(total)
            })
            
    return jsonify(data_points), 200

@app.route('/api/latest-transactions', methods=['GET'])
def latest_transactions():
    try:
        limit = request.args.get('limit', default=4, type=int)
        transactions = (
            db.session.query(Transaction)
            .order_by(desc(Transaction.date))
            .limit(limit)
            .all()
        )

        result = [txn.to_dict() for txn in transactions]

        return jsonify(result), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/transactions/top-categories', methods=['GET'])
def top_spending_categories():
    period = request.args.get('period', default='month')
    
    query = db.session.query(
        Transaction.purpose.label("category"),
        func.sum(Transaction.amount).label("total_spent")
    ).filter(
        Transaction.purpose.isnot(None),
        Transaction.amount > 0,
        Transaction.type == 'debit'
    )

    if period == 'week':
        start_date = datetime.now() - timedelta(days=7)
        query = query.filter(Transaction.date >= start_date)
    elif period == 'month':
        latest_date = db.session.query(func.max(Transaction.date)).scalar()
        if not latest_date:
            return jsonify([]), 200
        latest_year = latest_date.year
        latest_month = latest_date.month
        query = query.filter(
            extract('year', Transaction.date) == latest_year,
            extract('month', Transaction.date) == latest_month
        )
    elif period == 'year':
        latest_date = db.session.query(func.max(Transaction.date)).scalar()
        if not latest_date:
            return jsonify([]), 200
        latest_year = latest_date.year
        query = query.filter(extract('year', Transaction.date) == latest_year)
    # 'all' doesn't need extra filtering
    
    categories = (
        query.group_by(Transaction.purpose)
        .order_by(func.sum(Transaction.amount).desc())
        .limit(10) # Increased limit for better breakdown
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
        
        from model import AccountBalance
        accounts = [acc.to_dict() for acc in AccountBalance.query.all()]
        
        if True: # Always try to send if we have tokens (send_push_to_all handles the check)
            try:
                if transaction.type == 'debit':
                    merchant = transaction.receiver or "Merchant"
                    title = "💸 New Spending Detected"
                    body = f"You just spent PKR {transaction.amount:,.0f} at {merchant}. Tap to categorize it now!"
                    send_push_to_all(title, body)
                elif transaction.type == 'credit':
                    sender = transaction.sender or "Source"
                    title = "💰 Money Received!"
                    body = f"PKR {transaction.amount:,.0f} has been credited to your account from {sender}. Tap to see details."
                    send_push_to_all(title, body)
            except Exception as e:
                print(f"⚠️ Push notification failed: {e}")

        
        return jsonify({
            "status": "success",
            "message": "Transaction created from SMS",
            "transaction": transaction.to_dict(),
            "accounts": accounts
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
# CATEGORY ROUTES
# -------------------------
@app.route('/api/categories', methods=['GET'])
def get_categories():
    categories = Category.query.all()
    return jsonify([c.to_dict() for c in categories]), 200

@app.route('/api/categories', methods=['POST'])
def add_category():
    data = request.json
    name = data.get('name')
    if not name:
        return jsonify({"error": "Name is required"}), 400
    
    # Check if exists
    if Category.query.filter_by(name=name).first():
        return jsonify({"error": "Category already exists"}), 400
    
    category = Category(
        name=name,
        icon=data.get('icon', 'cash'),
        color=data.get('color', '#64748B'),
        cat_type=data.get('cat_type', 'spending'),
        is_default=False
    )
    db.session.add(category)
    db.session.commit()
    return jsonify(category.to_dict()), 201

@app.route('/api/categories/<int:id>', methods=['DELETE'])
def delete_category(id):
    category = Category.query.get(id)
    if not category:
        return jsonify({"error": "Category not found"}), 404
    
    if category.is_default:
        return jsonify({"error": "Cannot delete default categories"}), 400
        
    db.session.delete(category)
    db.session.commit()
    return jsonify({"message": "Category deleted"}), 200

@app.route('/api/transactions/<int:id>', methods=['PUT'])
def update_transaction(id):
    try:
        data = request.json
        txn = Transaction.query.get(id)
        if not txn:
            return jsonify({"error": "Transaction not found"}), 404
            
        if "purpose" in data:
            txn.purpose = data["purpose"]
        if "notes" in data:
            txn.notes = data["notes"]
            
        db.session.commit()
        return jsonify({"message": "Transaction updated", "transaction": {
            "id": txn.id,
            "purpose": txn.purpose,
            "notes": txn.notes
        }})
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@app.route('/api/set_salary', methods=['POST'])
def set_salary():
    try:
        data = request.json
        amount = float(data.get("amount", 0))
        # Default to current month if not provided
        month_str = data.get("month", datetime.now().strftime("%Y-%m"))
        
        budget = Budget.query.filter_by(month=month_str).first()
        if not budget:
             budget = Budget(month=month_str, total_budget=amount)
             db.session.add(budget)
        else:
             budget.total_budget = amount

        # Auto-Calculate 50/30/20 Rule
        budget.needs = amount * 0.50
        budget.wants = amount * 0.30
        budget.saving = amount * 0.20
            
        db.session.commit()
        return jsonify({
            "message": "Salary updated successfully", 
            "salary": amount, 
            "month": month_str,
            "breakdown": {
                "needs": budget.needs,
                "wants": budget.wants,
                "saving": budget.saving
            }
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

# -------------------------
# STARTUP
# -------------------------
def seed_categories():
    """Seed the database with default categories."""
    defaults = [
        {"name": "Food & Snacks", "icon": "food", "color": "#FF6B6B", "type": "spending"},
        {"name": "Movies", "icon": "movie", "color": "#EC4899", "type": "spending"},
        {"name": "Tea", "icon": "coffee", "color": "#F59E0B", "type": "spending"},
        {"name": "Therapy", "icon": "brain", "color": "#8B5CF6", "type": "spending"},
        {"name": "Uber", "icon": "car", "color": "#4ECDC4", "type": "spending"},
        {"name": "Audible Subscription", "icon": "headphones", "color": "#A78BFA", "type": "spending"},
        {"name": "Google One Subscription", "icon": "google", "color": "#3B82F6", "type": "spending"},
        {"name": "Ride / Transport", "icon": "car", "color": "#4ECDC4", "type": "spending"},
        {"name": "Bills & Utilities", "icon": "receipt", "color": "#3B82F6", "type": "spending"},
        {"name": "Shopping", "icon": "shopping", "color": "#A78BFA", "type": "spending"},
        {"name": "Healthcare", "icon": "hospital", "color": "#10B981", "type": "spending"},
        {"name": "Education", "icon": "school", "color": "#F59E0B", "type": "spending"},
        {"name": "Groceries", "icon": "cart", "color": "#10B981", "type": "spending"},
        {"name": "Personal Care", "icon": "sparkles", "color": "#8B5CF6", "type": "spending"},
        {"name": "Online Services", "icon": "web", "color": "#3B82F6", "type": "spending"},
        {"name": "Gym & Fitness", "icon": "dumbbell", "color": "#FF6B6B", "type": "spending"},
        {"name": "Income", "icon": "cash", "color": "#10B981", "type": "income"},
        {"name": "Bonus", "icon": "gift", "color": "#F59E0B", "type": "income"},
        {"name": "Investment", "icon": "trending-up", "color": "#3B82F6", "type": "income"},
        {"name": "Uncategorized", "icon": "help-circle", "color": "#64748B", "type": "both"},
    ]
    
    with app.app_context():
        for cat_data in defaults:
            cat = Category.query.filter_by(name=cat_data["name"]).first()
            if not cat:
                cat = Category(
                    name=cat_data["name"],
                    icon=cat_data["icon"],
                    color=cat_data["color"],
                    cat_type=cat_data["type"],
                    is_default=True
                )
                db.session.add(cat)
            else:
                # Update type for existing default categories if needed
                cat.cat_type = cat_data["type"]
        db.session.commit()
        print("✅ Categories seeded")

if __name__ == "__main__":
    with app.app_context():
        db.create_all()
        print("✅ Tables ensured in database")
        seed_categories()
    app.run(host="0.0.0.0", port=5000, debug=True)