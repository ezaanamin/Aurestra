import os
import email
import imaplib
from datetime import datetime, timedelta
from email.header import decode_header
import fitz  # PyMuPDF
from utils import decode_mime_words, extract_text_from_pdf
from balances import extract_balances_from_bank, extract_balances_from_wallet, extract_transactions_from_bank
from config import *
from PIL import Image
import re
from model import Transaction
from utils import decode_mime_words  # ensure you have this utility
from database import db

# -------------------------
# SETUP
# -------------------------
IMAP_HOST = "imap.gmail.com"
ATTACHMENTS_DIR = "attachments"
os.makedirs(ATTACHMENTS_DIR, exist_ok=True)


def clean(text):
    if not isinstance(text, str):
        return None
    return text.replace("\xa0", " ").strip()

# -------------------------
# HELPERS
# -------------------------
def get_search_date():
    """
    Returns the search date string for email query.
    We look back 30 days to ensure we catch the latest monthly statement
    even if the user opens the app mid-month.
    Format: 01-Jan-2025
    """
    # Look back to the 1st of the previous month
    today = datetime.today()
    first_of_this_month = today.replace(day=1)
    prev_month = first_of_this_month - timedelta(days=1)
    first_of_prev_month = prev_month.replace(day=1)
    return first_of_prev_month.strftime("%d-%b-%Y")

def safe_float(val):
    try:
        return float(str(val).replace(",", "")) if val is not None else 0.0
    except:
        return 0.0

def decode_mime_words(s):
    """Decodes MIME-encoded email subject lines."""
    decoded = decode_header(s)
    return ''.join(
        str(t[0], t[1] or 'utf-8') if isinstance(t[0], bytes) else t[0]
        for t in decoded
    )



# -------------------------
# FETCH LATEST BANK EMAIL
# -------------------------
def fetch_latest_bank_email():
    try:
        mail = imaplib.IMAP4_SSL(IMAP_HOST)
        print(f"📧 Connecting to IMAP as: {BANK_EMAIL_ACCOUNT}")
        mail.login(BANK_EMAIL_ACCOUNT, BANK_APP_PASSWORD)
        mail.select("inbox")

        search_date = get_search_date()
        status, data = mail.search(None, f'FROM "{BANK_SENDER}" SINCE "{search_date}"')

        if status != "OK" or not data[0]:
            mail.logout()
            return {"error": "Bank statement not available."}

        # Get list of email IDs (latest are at the end)
        email_ids = data[0].split()
        
        all_transactions = []
        all_email_data = []  # Store all processed emails with metadata
        processed_count = 0

        # Scan EARLIEST to LATEST to build the state
        for e_id in email_ids:
            print(f"📧 Processing email ID: {e_id}")
            try:
                status, msg_data = mail.fetch(e_id, "(RFC822)")
                if status != "OK": continue
                
                msg = email.message_from_bytes(msg_data[0][1])
                subject = decode_mime_words(msg.get("Subject", ""))
                
                # Parse Date
                date_str = msg.get("Date")
                statement_date = datetime.utcnow() # Fallback
                try:
                    statement_date = email.utils.parsedate_to_datetime(date_str)
                    if statement_date.tzinfo is not None:
                        statement_date = statement_date.replace(tzinfo=None)
                except:
                    pass

                # Extract PDF
                extracted_text = None
                if msg.is_multipart():
                    for part in msg.walk():
                        filename = part.get_filename()
                        if filename and filename.lower().endswith(".pdf"):
                            path = os.path.join(ATTACHMENTS_DIR, f"stm_{e_id}.pdf")
                            with open(path, "wb") as f:
                                f.write(part.get_payload(decode=True))
                            
                            extracted_text = extract_text_from_pdf(path, BANK_PDF_PASSWORD)
                            if os.path.exists(path):
                                os.remove(path)
                            if extracted_text:
                                break 

                if extracted_text:
                    is_target = TARGET_ACCOUNT_NUMBER and TARGET_ACCOUNT_NUMBER in extracted_text
                    
                    if IGNORE_ACCOUNT_NUMBER and IGNORE_ACCOUNT_NUMBER in extracted_text:
                         if not is_target:
                            print(f"🚫 Ignoring Statement for Account ending in {IGNORE_ACCOUNT_NUMBER}")
                            continue

                    if TARGET_ACCOUNT_NUMBER and not is_target:
                        print(f"⏭️  Skipping non-target email.")
                        continue
                        
                    if is_target:
                        print(f"🎯 Target Account {TARGET_ACCOUNT_NUMBER} FOUND!")

                    # ISOLATE ACCOUNT SECTION (Very Important for Multi-Account PDFs)
                    target_text = extracted_text
                    if TARGET_ACCOUNT_NUMBER:
                        clean_text = re.sub(r'\s+', ' ', extracted_text)
                        acct_pos = clean_text.find(TARGET_ACCOUNT_NUMBER)
                        if acct_pos != -1:
                            # Find the account section start in original text
                            original_acct_pos = extracted_text.find(TARGET_ACCOUNT_NUMBER)
                            target_text = extracted_text[original_acct_pos:]
                            
                            # Find end of section (next account or summary)
                            next_ref = re.search(r'Account No\s*:\s*\d+|SUMMARY OF ALL ACCOUNTS', target_text[len(TARGET_ACCOUNT_NUMBER):])
                            if next_ref:
                                target_text = target_text[:len(TARGET_ACCOUNT_NUMBER) + next_ref.start()]
                                print(f"✂️ Isolated section: {len(target_text)} chars")

                    # PASS TARGET SECTION TO EXTRACTORS
                    balances = extract_balances_from_bank(target_text, target_account=TARGET_ACCOUNT_NUMBER)
                    transactions = extract_transactions_from_bank(target_text)
                    
                    opening_bal = safe_float(balances.get("opening_balance", 0))
                    closing_bal = safe_float(balances.get("closing_balance", 0))
                    
                    print(f"💰 Email {e_id} - Opening: {opening_bal}, Closing: {closing_bal}, Txs: {len(transactions)}")
                    
                    # Store email data with metadata
                    all_email_data.append({
                        'email_id': e_id,
                        'date': statement_date,
                        'opening_balance': opening_bal,
                        'closing_balance': closing_bal,
                        'transactions': transactions,
                        'subject': subject
                    })
                    
                    # Accumulate ALL Transactions
                    all_transactions.extend(transactions)
                    processed_count += 1
                        
            except Exception as inner_e:
                print(f"⚠️ Error processing email {e_id}: {inner_e}")
                continue

        mail.logout()

        if processed_count == 0:
             return {"error": "No bank statements found in recent emails."}

        # SORT emails by date to ensure correct order
        all_email_data.sort(key=lambda x: x['date'])
        
        print(f"\n📊 BALANCE EXTRACTION SUMMARY:")
        print(f"   Total emails processed: {processed_count}")
        for idx, email_data in enumerate(all_email_data):
            print(f"   Email {idx+1} ({email_data['date'].date()}): Open={email_data['opening_balance']}, Close={email_data['closing_balance']}")
        
        # CRITICAL FIX: Extract balances correctly
        # Opening: First opening balance from EARLIEST email
        first_opening = all_email_data[0]['opening_balance']
        
        # Closing: Must come from MONTH-END statement (30th or 31st)
        # Find the email with date closest to month-end
        last_closing = all_email_data[-1]['closing_balance']  # Default fallback
        
        # Try to find statement dated at month-end (28-31)
        month_end_candidates = [
            email_data for email_data in all_email_data 
            if email_data['date'].day >= 28  # 28, 29, 30, or 31
        ]
        
        if month_end_candidates:
            # Use the LATEST month-end statement
            month_end_statement = month_end_candidates[-1]
            last_closing = month_end_statement['closing_balance']
            print(f"\n🎯 Using MONTH-END statement from {month_end_statement['date'].date()} (day {month_end_statement['date'].day})")
        else:
            print(f"\n⚠️ No month-end statement found (days 28-31), using latest email")
        
        print(f"\n✅ FINAL BALANCES:")
        print(f"   Opening (from earliest): {first_opening}")
        print(f"   Closing (from latest): {last_closing}")

        final_balances = {
            "opening_balance": first_opening,
            "closing_balance": last_closing
        }

        return {
            "balances": final_balances,
            "transactions": all_transactions,
            "count": len(all_transactions),
            "emails_processed": processed_count
        }

    except Exception as e:
        return {"error": f"Bank email fetch error: {str(e)}"}

# -------------------------
# FETCH LATEST WALLET EMAIL
# -------------------------
def fetch_latest_wallet_email():
    try:
        mail = imaplib.IMAP4_SSL(IMAP_HOST)
        mail.login(BANK_EMAIL_ACCOUNT, WALLET_APP_PASSWORD)
        mail.select("inbox")

        search_date = get_search_date()
        status, data = mail.search(None, f'(SUBJECT "{WALLET_SUBJECT_KEYWORD}" SINCE "{search_date}")')

        if status != "OK" or not data[0]:
            mail.logout()
            return {"error": "Wallet statement not available."}

        latest_id = data[0].split()[-1]
        status, msg_data = mail.fetch(latest_id, "(RFC822)")
        msg = email.message_from_bytes(msg_data[0][1])

        subject = decode_mime_words(msg.get("Subject", ""))
        sender = decode_mime_words(msg.get("From", "Unknown"))
        result = {"from": sender, "subject": subject, "balances": {}}

        if WALLET_SUBJECT_KEYWORD.lower() not in subject.lower():
            mail.logout()
            return {"error": "Wallet email subject does not match."}

        if msg.is_multipart():
            for part in msg.walk():
                filename = part.get_filename()
                if filename and filename.lower().endswith(".pdf"):
                    path = os.path.join(ATTACHMENTS_DIR, "wallet_statement.pdf")
                    with open(path, "wb") as f:
                        f.write(part.get_payload(decode=True))
                    text = extract_text_from_pdf(path)
                    os.remove(path)
                    if text:
                        result["balances"] = extract_balances_from_wallet(text)
                        break

        mail.logout()
        return result

    except Exception as e:
        return {"error": f"Wallet email fetch error: {str(e)}"}

def parse_amount(amount_str):
    """Convert amount string like 'Rs. 6,700.00' to float 6700.0"""
    try:
        cleaned = amount_str.replace("Rs.", "").replace(",", "").strip()
        return float(cleaned)
    except:
        return 0.0

def parse_date(date_str):
    """Parse flexible date formats like '4 Nov 2025' or '09 November 2025'"""
    for fmt in ("%d %b %Y", "%d %B %Y"):
        try:
            return datetime.strptime(date_str, fmt)
        except:
            continue
    return None

def clean_category(cat_str):
    """Remove extra symbols and whitespace from category"""
    if not cat_str:
        return None
    return cat_str.replace("☐", "").strip() or None

# -------------------------
# Email Parsing
# -------------------------
def parse_easypaisa_email(body):
    """
    Parse Easypaisa email body into structured transaction data
    """
    lines = [clean(l) for l in body.split("\n") if clean(l)]
    print(lines)
    data = {}

    # Transaction ID
    for line in lines:
        if "ID#" in line:
            data["transaction_id"] = line.replace("ID#", "").strip()
            break

    # Date & Time
    for idx, line in enumerate(lines):
        if line.startswith("Date:"):
            date_str = line.replace("Date:", "").strip()
            time_str = lines[idx + 1] if idx + 1 < len(lines) else None

            data["date"] = parse_date(date_str)

            if time_str and (":" in time_str) and ("AM" in time_str or "PM" in time_str):
                try:
                    data["time"] = datetime.strptime(time_str.replace(" ", ""), "%I:%M%p").time()
                except:
                    data["time"] = None
            break

    # Amount
    for idx, line in enumerate(lines):
        if line.lower().startswith("amount"):
            if idx + 1 < len(lines):
                data["amount"] = parse_amount(lines[idx + 1])
            break

    # Category / Purpose
    for idx, line in enumerate(lines):
        if "category" in line.lower() or "purpose" in line.lower():
            if idx + 1 < len(lines):
                data["category"] = clean_category(lines[idx + 1])
            break

    # Receiver (Sent to)
    for idx, line in enumerate(lines):
        if "sent to" in line.lower():
            data["receiver"] = lines[idx + 1]  # Name
            if idx + 2 < len(lines):
                data["receiver_detail"] = lines[idx + 2]  # Phone or Bank
            break

    # Sender (Sent by)
    for idx, line in enumerate(lines):
        if "sent by" in line.lower():
            sender_name = lines[idx + 1]
            if sender_name.upper() == "AZAN AMIN":
                sender_name = "Ezaan Amin"
            data["sender"] = sender_name
            if idx + 2 < len(lines):
                data["sender_number"] = lines[idx + 2]
            break

    # Optional notes: store name, transaction details, etc.
    # You can extend parsing here if needed

    return data

# -------------------------
# Fetch & Save
# -------------------------
def fetch_and_save_easypaisa_emails():
    """
    Fetch unread Easypaisa emails, parse, and save transactions.
    Handles sender/receiver, amount, category/purpose, notes, transaction_id.
    Prevents duplicates using transaction_id.
    """
    try:
        mail = imaplib.IMAP4_SSL(IMAP_HOST)
        mail.login(BANK_EMAIL_ACCOUNT, APP_PASSWORD)
        mail.select("inbox")

        status, data = mail.search(None, '(UNSEEN FROM "amin.ezaan@gmail.com")')
        if status != "OK" or not data[0]:
            mail.logout()
            return {"saved": [], "count": 0}

        transactions_saved = []

        for msg_id in reversed(data[0].split()):
            status, msg_data = mail.fetch(msg_id, "(RFC822)")
            msg = email.message_from_bytes(msg_data[0][1])

            subject = decode_mime_words(msg.get("Subject", "")).strip()

            # Extract plain text body
            body_text = ""
            if msg.is_multipart():
                for part in msg.walk():
                    if part.get_content_type() == "text/plain":
                        body_text += part.get_payload(decode=True).decode(errors="ignore")
            else:
                body_text = msg.get_payload(decode=True).decode(errors="ignore")

            # Only Easypaisa emails
            if "easypaisa transaction details" not in subject.lower() and \
               "easypaisa transaction details" not in body_text.lower():
                continue

            # Parse
            tx_data = parse_easypaisa_email(body_text)

            # Prevent duplicates
            tx_id = tx_data.get("transaction_id")
            if tx_id:
                existing = Transaction.query.filter_by(transaction_id=tx_id).first()
                if existing:
                    continue

            # Fallback date
            dt = tx_data.get("date") or datetime.utcnow()

            # Determine Type
            sender = tx_data.get("sender", "")
            receiver = tx_data.get("receiver", "")
            tx_type = "debit" # Default
            if "Ezaan Amin" in receiver or "AZAN AMIN" in receiver.upper():
                tx_type = "credit"
            elif "Ezaan Amin" in sender or "AZAN AMIN" in sender.upper():
                tx_type = "debit"

            # Save transaction
            new_tx = Transaction(
                source="wallet",
                date=dt,
                purpose=tx_data.get("category") or tx_data.get("purpose"),
                amount=float(tx_data.get("amount", 0)),
                sender=sender,
                receiver=receiver,
                transaction_id=tx_id,
                notes=tx_data.get("notes") or tx_data.get("receiver_detail"),
                type=tx_type
            )

            db.session.add(new_tx)
            transactions_saved.append(tx_data)

        db.session.commit()
        mail.logout()

        print(f"✅ Saved {len(transactions_saved)} Easypaisa transactions")
        
        # Serialize dates for JSON response
        for tx in transactions_saved:
            if "date" in tx and isinstance(tx["date"], (datetime, date)):
                tx["date"] = tx["date"].isoformat()
            if "time" in tx and isinstance(tx["time"], (time, datetime)):
                tx["time"] = tx["time"].strftime("%H:%M:%S")

        return {"saved": transactions_saved, "count": len(transactions_saved)}

    except Exception as e:
        db.session.rollback()
        print(f"❌ Easypaisa fetch/save error: {e}")
        return {"error": str(e)}


# COMBINE BANK + WALLET SUMMARY
# -------------------------
def calculate_combined_summary():
    bank_data = fetch_latest_bank_email()
    # wallet_data = fetch_latest_wallet_email() # Disabled as per user request

    opening = 0.0
    closing = 0.0
    
    # Process Bank Data
    if "error" not in bank_data and "balances" in bank_data:
        opening += safe_float(bank_data["balances"].get("opening_balance"))
        closing += safe_float(bank_data["balances"].get("closing_balance"))
    else:
        return {"error": bank_data.get("error", "Bank statement not available.")}

    # Only Bank Data used
    net_change = closing - opening
    
    result = {
        "total_opening_balance": opening,
        "total_closing_balance": closing,
        "total_expense": abs(net_change) if net_change < 0 else 0.0,
        "total_income": 0.0, 
        "total_savings": net_change if net_change > 0 else 0.0,
    }
        
    return result


# -------------------------
# FETCH SPECIFIC MONTH STATEMENT
# -------------------------
def fetch_previous_month_statement(reference_date=None):
    """
    Fetches the bank statement for the month PREVIOUS to reference_date.
    If reference_date is None, uses today (so fetches previous month from now).
    
    Args:
        reference_date (datetime): The 'current' date to look back from.
                                   To fetch Nov 2025, pass a date in Dec 2025 (e.g. Dec 10).
    """
    try:
        mail = imaplib.IMAP4_SSL(IMAP_HOST)
        print(f"📧 Connecting to IMAP as: {BANK_EMAIL_ACCOUNT}")
        mail.login(BANK_EMAIL_ACCOUNT, BANK_APP_PASSWORD)
        mail.select("inbox")

        # Calculate Date Range for Previous Month
        today = reference_date if reference_date else datetime.today()
        first = today.replace(day=1)
        last_month = first - timedelta(days=1)
        
        # SEARCH LOGIC UPDATE: Broad SINCE, then Python Filter
        # This fixes 404s caused by strict/unsupported 'BEFORE' IMAP queries.
        
        # Search from start of PREVIOUS month (Nov 1) to be safe
        broad_since = last_month.replace(day=1).strftime("%d-%b-%Y")
        
        # Exact Target Window: e.g. Nov 25 to Dec 25
        limit_start_date = last_month.replace(day=25)
        limit_end_date = today.replace(day=1) + timedelta(days=25)
        
        print(f"🔍 IMAP Broad Search: SINCE {broad_since}")
        status, data = mail.search(None, f'FROM "{BANK_SENDER}" SINCE "{broad_since}"')

        if status != "OK" or not data[0]:
            mail.logout()
            print(f"⚠️ No emails found since {broad_since}")
            return {"error": f"No bank emails found since {broad_since}"}

        email_ids = data[0].split()
        print(f"📨 Found {len(email_ids)} candidate emails. Filtering for [{limit_start_date.date()} - {limit_end_date.date()}]...")
        
        # Store all valid emails with metadata
        all_email_data = []
        merged_transactions = []
        month_name = last_month.strftime("%B %Y")
        
        for e_id in email_ids:
            try:
                # 1. HEADER FETCH & FILTER
                # ------------------------
                _, head_data = mail.fetch(e_id, '(BODY.PEEK[HEADER])')
                msg_head = email.message_from_bytes(head_data[0][1])
                
                # Check Date STRICTLY
                date_str = msg_head.get("Date")
                if not date_str: continue
                
                try:
                    email_dt = email.utils.parsedate_to_datetime(date_str)
                    if email_dt.tzinfo is not None:
                        email_dt = email_dt.replace(tzinfo=None)
                        
                    # Filter Logic
                    if not (limit_start_date <= email_dt <= limit_end_date):
                         continue
                except:
                    continue
                
                # Check Subject
                subj = decode_mime_words(msg_head.get("Subject", ""))
                if "statement" not in subj.lower():
                    continue

                print(f"✅ Found Valid Email! Date: {email_dt.date()} | Subject: {subj}")
                
                # 2. BODY FETCH & PROCESS
                # ------------------------
                status, msg_data = mail.fetch(e_id, "(RFC822)")
                if status != "OK": continue
                
                msg = email.message_from_bytes(msg_data[0][1])
                
                # Check Attachment
                extracted_text = None
                if msg.is_multipart():
                    for part in msg.walk():
                        filename = part.get_filename()
                        if filename and filename.lower().endswith(".pdf"):
                            path = os.path.join(ATTACHMENTS_DIR, f"stm_{e_id}.pdf")
                            with open(path, "wb") as f:
                                f.write(part.get_payload(decode=True))
                            
                            extracted_text = extract_text_from_pdf(path, BANK_PDF_PASSWORD)
                            if os.path.exists(path):
                                os.remove(path)
                            if extracted_text:
                                break 

                if extracted_text:
                    is_target = TARGET_ACCOUNT_NUMBER and TARGET_ACCOUNT_NUMBER in extracted_text
                    
                    if IGNORE_ACCOUNT_NUMBER and IGNORE_ACCOUNT_NUMBER in extracted_text:
                         if not is_target:
                            print(f"🚫 Ignoring Statement for Account ending in {IGNORE_ACCOUNT_NUMBER}")
                            continue

                    if TARGET_ACCOUNT_NUMBER and not is_target:
                        print(f"⏭️  Skipping email - Target Account {TARGET_ACCOUNT_NUMBER} not found.")
                        continue
                    
                    print(f"🎯 Target Account {TARGET_ACCOUNT_NUMBER} confirmed in email.")
                    
                    # ISOLATE ACCOUNT SECTION (Very Important for Multi-Account PDFs)
                    target_text = extracted_text
                    if TARGET_ACCOUNT_NUMBER:
                        clean_text = re.sub(r'\s+', ' ', extracted_text)
                        acct_pos = clean_text.find(TARGET_ACCOUNT_NUMBER)
                        if acct_pos != -1:
                            # Find the account section start in original text
                            original_acct_pos = extracted_text.find(TARGET_ACCOUNT_NUMBER)
                            target_text = extracted_text[original_acct_pos:]
                            
                            # Find end of section (next account or summary)
                            next_ref = re.search(r'Account No\s*:\s*\d+|SUMMARY OF ALL ACCOUNTS', target_text[len(TARGET_ACCOUNT_NUMBER):])
                            if next_ref:
                                target_text = target_text[:len(TARGET_ACCOUNT_NUMBER) + next_ref.start()]
                                print(f"✂️ Isolated section: {len(target_text)} chars")

                    balances = extract_balances_from_bank(target_text, target_account=TARGET_ACCOUNT_NUMBER)
                    transactions = extract_transactions_from_bank(target_text)
                    
                    opening_bal = safe_float(balances.get("opening_balance", 0))
                    closing_bal = safe_float(balances.get("closing_balance", 0))
                    
                    print(f"💰 Email {e_id} - Opening: {opening_bal}, Closing: {closing_bal}, Txs: {len(transactions)}")
                    
                    # Store email data
                    all_email_data.append({
                        'email_id': e_id,
                        'date': email_dt,
                        'opening_balance': opening_bal,
                        'closing_balance': closing_bal,
                        'all_closing_balances': balances.get("all_closing_balances", []),
                        'balance_table': balances.get("balance_table", []),
                        'transactions': transactions,
                        'subject': subj
                    })
                    
                    # Accumulate ALL transactions
                    merged_transactions.extend(transactions)
                    print(f"➕ Merged {len(transactions)} txs. Total: {len(merged_transactions)}")
            
            except Exception as inner:
                print(f"Error reading email {e_id}: {inner}")
                continue
        
        mail.logout()
        
        if len(all_email_data) == 0:
            return {"error": f"No valid bank statement PDFs found for {month_name}"}
        
        # SORT emails by date to ensure correct order
        all_email_data.sort(key=lambda x: x['date'])
        
        print(f"\n📊 BALANCE EXTRACTION SUMMARY for {month_name}:")
        print(f"   Total emails processed: {len(all_email_data)}")
        for idx, email_data in enumerate(all_email_data):
            print(f"   Email {idx+1} ({email_data['date'].date()}): Open={email_data['opening_balance']}, Close={email_data['closing_balance']}")
        
        # CRITICAL FIX: Extract balances correctly
        # Opening: First opening balance from EARLIEST email
        first_opening = all_email_data[0]['opening_balance']
        
        # Closing: Must come from MONTH-END statement (30th or 31st)
        # For the target month, find statement dated at month-end
        last_closing = all_email_data[-1]['closing_balance']  # Default fallback
        
        # Calculate the last day of the target month
        target_month = last_month.month
        target_year = last_month.year
        
        # Try to find statement dated at month-end (28-31)
        month_end_candidates = [
            email_data for email_data in all_email_data 
            if email_data['date'].month == target_month 
            and email_data['date'].year == target_year
            and email_data['date'].day >= 28  # 28, 29, 30, or 31
        ]
        
        if month_end_candidates:
            # Use the LATEST month-end statement for the target month
            month_end_statement = month_end_candidates[-1]
            last_closing = month_end_statement['closing_balance']
            print(f"\n🎯 Using MONTH-END statement from {month_end_statement['date'].date()} (day {month_end_statement['date'].day})")
        else:
            print(f"\n⚠️ No month-end statement found (days 28-31) for {month_name}, using latest email")
        
        print(f"\n✅ FINAL BALANCES:")
        print(f"   Opening (from earliest): {first_opening}")
        print(f"   Closing (from latest): {last_closing}")
        
        final_balances = {
            "opening_balance": first_opening,
            "closing_balance": last_closing
        }
            
        return {
            "balances": final_balances,
            "transactions": merged_transactions,
            "month_name": month_name,
            "raw_count": len(merged_transactions),
            "email_count": len(all_email_data),
            "all_email_data": [{
                "date": e["date"].isoformat(),
                "opening_balance": e["opening_balance"],
                "closing_balance": e["closing_balance"],
                "all_closing_balances": e["all_closing_balances"],
                "balance_table": e["balance_table"]
            } for e in all_email_data]
        }

    except Exception as e:
        return {"error": f"IMAP Error: {str(e)}"}