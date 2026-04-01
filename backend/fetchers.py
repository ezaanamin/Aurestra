import os
import email
import imaplib
import re
from datetime import datetime, timedelta
from email.header import decode_header
import fitz  # PyMuPDF
from utils import decode_mime_words, extract_text_from_pdf
from balances import extract_balances_from_bank, extract_transactions_from_bank
from config import *
from PIL import Image
from model import Transaction
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
    Look back to the 1st of the previous month.
    """
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

# -------------------------
# FETCH LATEST BANK EMAIL
# -------------------------
def fetch_latest_bank_email():
    """
    Scans recent emails for bank statements and calculates current flow.
    """
    try:
        from dotenv import load_dotenv
        load_dotenv(override=True)
        from config import BANK_EMAIL_ACCOUNT, BANK_APP_PASSWORD, BANK_PDF_PASSWORD, TARGET_ACCOUNT_NUMBER, IGNORE_ACCOUNT_NUMBER, BANK_SENDER
        
        mail = imaplib.IMAP4_SSL(IMAP_HOST)
        imap_user = str(BANK_EMAIL_ACCOUNT).strip()
        pwd = str(BANK_APP_PASSWORD).replace(" ", "").strip()
        
        if "ezean" in imap_user:
            imap_user = "ezaan.amin@gmail.com"
            
        print(f"📧 [Fetch Latest] Connecting as: {imap_user}")
        mail.login(imap_user, pwd)
        mail.select("inbox")

        search_date = get_search_date()
        status, data = mail.search(None, f'FROM "{BANK_SENDER}" SINCE "{search_date}"')

        if status != "OK" or not data[0]:
            mail.logout()
            return {"error": "No recent bank statements found."}

        email_ids = data[0].split()
        all_transactions = []
        all_email_data = [] 
        processed_count = 0

        for e_id in email_ids:
            try:
                status, msg_data = mail.fetch(e_id, "(RFC822)")
                if status != "OK": continue
                
                msg = email.message_from_bytes(msg_data[0][1])
                # Parse Date
                date_str = msg.get("Date")
                statement_date = datetime.utcnow()
                try:
                    statement_date = email.utils.parsedate_to_datetime(date_str)
                    if statement_date.tzinfo is not None:
                        statement_date = statement_date.replace(tzinfo=None)
                except: pass

                # Extract PDF
                extracted_text = None
                if msg.is_multipart():
                    for part in msg.walk():
                        filename = part.get_filename()
                        if filename and filename.lower().endswith(".pdf"):
                            path = os.path.join(ATTACHMENTS_DIR, f"stm_{e_id.decode()}.pdf")
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
                         if not is_target: continue

                    if TARGET_ACCOUNT_NUMBER and not is_target: continue

                    # ISOLATE ACCOUNT SECTION
                    target_text = extracted_text
                    if TARGET_ACCOUNT_NUMBER:
                        clean_text = re.sub(r'\s+', ' ', extracted_text)
                        acct_pos = clean_text.find(TARGET_ACCOUNT_NUMBER)
                        if acct_pos != -1:
                            original_acct_pos = extracted_text.find(TARGET_ACCOUNT_NUMBER)
                            target_text = extracted_text[original_acct_pos:]
                            next_ref = re.search(r'Account No\s*:\s*\d+|SUMMARY OF ALL ACCOUNTS', target_text[len(TARGET_ACCOUNT_NUMBER):])
                            if next_ref:
                                target_text = target_text[:len(TARGET_ACCOUNT_NUMBER) + next_ref.start()]

                    balances = extract_balances_from_bank(target_text, target_account=TARGET_ACCOUNT_NUMBER)
                    transactions = extract_transactions_from_bank(target_text)
                    
                    opening_bal = safe_float(balances.get("opening_balance", 0))
                    closing_bal = safe_float(balances.get("closing_balance", 0))
                    
                    all_email_data.append({
                        'email_id': e_id.decode(),
                        'date': statement_date,
                        'opening_balance': opening_bal,
                        'closing_balance': closing_bal,
                        'transactions': transactions
                    })
                    all_transactions.extend(transactions)
                    processed_count += 1
                        
            except Exception as inner_e:
                print(f"⚠️ Error processing email {e_id}: {inner_e}")
                continue

        mail.logout()

        if processed_count == 0:
             return {"error": "No bank statements found."}

        all_email_data.sort(key=lambda x: x['date'])
        first_opening = all_email_data[0]['opening_balance']
        last_closing = all_email_data[-1]['closing_balance']
        
        # Try to find statement dated at month-end (28-31)
        month_end_candidates = [d for d in all_email_data if d['date'].day >= 28]
        if month_end_candidates:
            last_closing = month_end_candidates[-1]['closing_balance']

        return {
            "balances": {"opening_balance": first_opening, "closing_balance": last_closing},
            "transactions": all_transactions,
            "count": len(all_transactions),
            "emails_processed": processed_count
        }

    except Exception as e:
        return {"error": f"Bank email fetch error: {str(e)}"}

# -------------------------
# COMBINE SUMMARY
# -------------------------
def calculate_combined_summary():
    """Calculates flows using only bank data (Wallet disabled)"""
    bank_data = fetch_latest_bank_email()

    opening = 0.0
    closing = 0.0
    
    if "error" not in bank_data and "balances" in bank_data:
        opening = safe_float(bank_data["balances"].get("opening_balance"))
        closing = safe_float(bank_data["balances"].get("closing_balance"))
    else:
        return {"error": bank_data.get("error", "Bank statement not available.")}

    net_change = closing - opening
    return {
        "total_opening_balance": opening,
        "total_closing_balance": closing,
        "total_expense": abs(net_change) if net_change < 0 else 0.0,
        "total_income": 0.0, 
        "total_savings": net_change if net_change > 0 else 0.0,
    }

# -------------------------
# FETCH SPECIFIC MONTH STATEMENT (With Detailed Logging)
# -------------------------
def fetch_previous_month_statement(reference_date=None):
    """
    Fetches the bank statement for the month PREVIOUS to reference_date with heavy logging.
    """
    try:
        from dotenv import load_dotenv
        load_dotenv(override=True)
        
        from config import BANK_EMAIL_ACCOUNT, BANK_APP_PASSWORD, BANK_PDF_PASSWORD, TARGET_ACCOUNT_NUMBER, IGNORE_ACCOUNT_NUMBER, BANK_SENDER
        
        print(f"📋 [Fetch] Detailed Config Check:")
        print(f"   Account: {BANK_EMAIL_ACCOUNT}")
        print(f"   Target Acct: {TARGET_ACCOUNT_NUMBER}")
        print(f"   PDF Pass: {'Set' if BANK_PDF_PASSWORD else 'Missing'}")
        
        mail = imaplib.IMAP4_SSL(IMAP_HOST)
        imap_user = str(BANK_EMAIL_ACCOUNT).strip()
        pwd = str(BANK_APP_PASSWORD).replace(" ", "").strip()
        
        if "ezean" in imap_user:
            print(f"⚠️  [Fetch] TYPO DETECTED: Correcting to [ezaan.amin@gmail.com]")
            imap_user = "ezaan.amin@gmail.com"
            
        print(f"📧 [Fetch] Connecting to IMAP as: {imap_user}")
        mail.login(imap_user, pwd)
        print(f"✅ [Fetch] Login Successful")
        mail.select("inbox")

        today = reference_date if reference_date else datetime.today()
        first = today.replace(day=1)
        last_month = first - timedelta(days=1)
        
        broad_since = (today - timedelta(days=60)).strftime("%d-%b-%Y")
        limit_start_date = last_month.replace(day=20) 
        limit_end_date = today + timedelta(days=5) 
        
        print(f"🔍 [Fetch] Search: FROM \"{BANK_SENDER}\" SINCE {broad_since}")
        status, data = mail.search(None, f'FROM "{BANK_SENDER}" SINCE "{broad_since}"')

        if status != "OK" or not data[0]:
            mail.logout()
            print(f"⚠️ [Fetch] No emails found since {broad_since}")
            return {"error": f"No bank emails found since {broad_since}"}

        email_ids = data[0].split()
        print(f"📨 [Fetch] Found {len(email_ids)} candidate emails.")
        
        all_email_data = []
        merged_transactions = []
        month_name = last_month.strftime("%B %Y")
        
        for idx, e_id in enumerate(email_ids):
            try:
                print(f"📧 [Fetch] [{idx+1}/{len(email_ids)}] Email ID: {e_id.decode()}")
                _, head_data = mail.fetch(e_id, '(BODY.PEEK[HEADER])')
                msg_head = email.message_from_bytes(head_data[0][1])
                
                date_str = msg_head.get("Date")
                if not date_str: continue
                
                try:
                    email_dt = email.utils.parsedate_to_datetime(date_str)
                    if email_dt.tzinfo is not None:
                        email_dt = email_dt.replace(tzinfo=None)
                    if not (limit_start_date <= email_dt <= limit_end_date):
                         continue
                except: continue
                
                subj = decode_mime_words(msg_head.get("Subject", ""))
                sender_full = decode_mime_words(msg_head.get("From", ""))
                print(f"   📩 Subj: {subj}")
                
                if "statement" not in subj.lower(): continue
                
                status, msg_data = mail.fetch(e_id, "(RFC822)")
                if status != "OK": continue
                
                msg = email.message_from_bytes(msg_data[0][1])
                extracted_text = None
                if msg.is_multipart():
                    for part in msg.walk():
                        filename = part.get_filename()
                        if filename and filename.lower().endswith(".pdf"):
                            print(f"   📄 Processing PDF: {filename}")
                            path = os.path.join(ATTACHMENTS_DIR, f"stm_{e_id.decode()}.pdf")
                            with open(path, "wb") as f:
                                f.write(part.get_payload(decode=True))
                            
                            extracted_text = extract_text_from_pdf(path, BANK_PDF_PASSWORD)
                            if os.path.exists(path): os.remove(path)
                            if extracted_text: break 

                if extracted_text:
                    if IGNORE_ACCOUNT_NUMBER and IGNORE_ACCOUNT_NUMBER in extracted_text and not (TARGET_ACCOUNT_NUMBER and TARGET_ACCOUNT_NUMBER in extracted_text):
                        continue

                    if TARGET_ACCOUNT_NUMBER and TARGET_ACCOUNT_NUMBER not in extracted_text:
                        continue
                    
                    print(f"   🎯 TARGET MATCHED")
                    target_text = extracted_text
                    if TARGET_ACCOUNT_NUMBER:
                        clean_text = re.sub(r'\s+', ' ', extracted_text)
                        original_acct_pos = extracted_text.find(TARGET_ACCOUNT_NUMBER)
                        if original_acct_pos != -1:
                            target_text = extracted_text[original_acct_pos:]
                            next_ref = re.search(r'Account No\s*:\s*\d+|SUMMARY OF ALL ACCOUNTS', target_text[len(TARGET_ACCOUNT_NUMBER):])
                            if next_ref:
                                target_text = target_text[:len(TARGET_ACCOUNT_NUMBER) + next_ref.start()]

                    balances = extract_balances_from_bank(target_text, target_account=TARGET_ACCOUNT_NUMBER)
                    transactions = extract_transactions_from_bank(target_text)
                    
                    opening_bal = safe_float(balances.get("opening_balance", 0))
                    closing_bal = safe_float(balances.get("closing_balance", 0))
                    
                    all_email_data.append({
                        'email_id': e_id.decode(),
                        'date': email_dt,
                        'opening_balance': opening_bal,
                        'closing_balance': closing_bal,
                        'all_closing_balances': balances.get("all_closing_balances", []),
                        'balance_table': balances.get("balance_table", []),
                        'transactions': transactions
                    })
                    merged_transactions.extend(transactions)
            
            except Exception as e:
                print(f"   ❌ ERROR: {e}")
                continue
        
        mail.logout()
        
        if len(all_email_data) == 0:
            print(f"⚠️ [Fetch] No valid statements found.")
            return {"error": "No valid bank statement PDFs found."}
        
        all_email_data.sort(key=lambda x: x['date'])
        
        first_opening = all_email_data[0]['opening_balance']
        last_closing = all_email_data[-1]['closing_balance']
        
        # Refine closing balance for month-end
        target_month, target_year = last_month.month, last_month.year
        month_end_candidates = [e for e in all_email_data if e['date'].month == target_month and e['date'].year == target_year and e['date'].day >= 28]
        if month_end_candidates:
            last_closing = month_end_candidates[-1]['closing_balance']
        
        print(f"🏁 [Fetch] Completed. Txs: {len(merged_transactions)}")
            
        return {
            "balances": {"opening_balance": first_opening, "closing_balance": last_closing},
            "transactions": merged_transactions,
            "month_name": month_name,
            "all_email_data": [{
                "date": e["date"].isoformat(),
                "opening_balance": e["opening_balance"],
                "closing_balance": e["closing_balance"],
                "all_closing_balances": e["all_closing_balances"]
            } for e in all_email_data]
        }

    except Exception as e:
        print(f"🔴 [Fetch] CRITICAL ERROR: {e}")
        return {"error": f"IMAP Error: {str(e)}"}