import os
import email
import imaplib
from datetime import datetime, timedelta
from email.header import decode_header
import fitz  # PyMuPDF
from utils import decode_mime_words, extract_text_from_pdf
from balances import extract_balances_from_bank, extract_balances_from_wallet
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
    Returns the correct date string for email search.
    - If today is the 1st, return the last day of the previous month
    - Otherwise, return yesterday.
    Format: 31-May-2025
    """
    today = datetime.today()
    prev_day = today.replace(day=1) - timedelta(days=1) if today.day == 1 else today - timedelta(days=1)
    return prev_day.strftime("%d-%b-%Y")

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

def extract_text_from_pdf(file_path):
    """
    Extracts all text from a PDF.
    - Tries normal text extraction (PyMuPDF)
    - Falls back to OCR if the page has no text (image-based PDFs)
    """
    full_text = ""
    try:
        with fitz.open(file_path) as doc:
            for page_number, page in enumerate(doc, start=1):
                text = page.get_text("text").strip()

                # If page is image-based (no text), run OCR
                if not text:
                    pix = page.get_pixmap(dpi=300)
                    img = Image.open(io.BytesIO(pix.tobytes("png")))
                    ocr_text = pytesseract.image_to_string(img)
                    text = ocr_text.strip()

                full_text += f"\n\n--- Page {page_number} ---\n{text}"

    except Exception as e:
        print(f"[ERROR] Failed to extract text from PDF: {e}")

    return full_text.strip()

# -------------------------
# FETCH LATEST BANK EMAIL
# -------------------------
def fetch_latest_bank_email():
    try:
        mail = imaplib.IMAP4_SSL(IMAP_HOST)
        mail.login(BANK_EMAIL_ACCOUNT, BANK_APP_PASSWORD)
        mail.select("inbox")

        search_date = get_search_date()
        status, data = mail.search(None, f'FROM "{BANK_SENDER}" SINCE "{search_date}"')

        if status != "OK" or not data[0]:
            mail.logout()
            return {"error": "Bank statement not available."}

        latest_id = data[0].split()[-1]
        status, msg_data = mail.fetch(latest_id, "(RFC822)")
        msg = email.message_from_bytes(msg_data[0][1])

        subject = decode_mime_words(msg.get("Subject", ""))
        result = {"from": BANK_SENDER, "subject": subject, "balances": {}}

        # Extract PDF
        if msg.is_multipart():
            for part in msg.walk():
                filename = part.get_filename()
                if filename and filename.lower().endswith(".pdf"):
                    path = os.path.join(ATTACHMENTS_DIR, "bank_statement.pdf")
                    with open(path, "wb") as f:
                        f.write(part.get_payload(decode=True))
                    text = extract_text_from_pdf(path)
                    os.remove(path)
                    if text:
                        result["balances"] = extract_balances_from_bank(text)
                        break

        mail.logout()

        if not result["balances"]:
            return {"error": "Bank statement PDF found but unable to extract balances."}

        return result

    except Exception as e:
        return {"error": f"Bank email fetch error: {str(e)}"}

# -------------------------
# FETCH LATEST WALLET EMAIL
# -------------------------
def fetch_latest_wallet_email():
    try:
        mail = imaplib.IMAP4_SSL(IMAP_HOST)
        mail.login(WALLET_EMAIL_ACCOUNT, WALLET_APP_PASSWORD)
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
def clean(text):
    if not text:
        return None
    return text.replace("\xa0", " ").strip()

def decode_mime_words(s):
    """Decode MIME-encoded email headers."""
    decoded = decode_header(s)
    return ''.join(
        str(t[0], t[1] or 'utf-8') if isinstance(t[0], bytes) else t[0]
        for t in decoded
    )

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
        mail.login(WALLET_EMAIL_ACCOUNT, WALLET_APP_PASSWORD)
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

            # Save transaction
            new_tx = Transaction(
                source="wallet",
                date=dt,
                purpose=tx_data.get("category") or tx_data.get("purpose"),
                amount=float(tx_data.get("amount", 0)),
                sender=tx_data.get("sender"),
                receiver=tx_data.get("receiver"),
                transaction_id=tx_id,
                notes=tx_data.get("notes") or tx_data.get("receiver_detail")
            )

            db.session.add(new_tx)
            transactions_saved.append(tx_data)

        db.session.commit()
        mail.logout()

        print(f"✅ Saved {len(transactions_saved)} Easypaisa transactions")
        return {"saved": transactions_saved, "count": len(transactions_saved)}

    except Exception as e:
        db.session.rollback()
        print(f"❌ Easypaisa fetch/save error: {e}")
        return {"error": str(e)}


# COMBINE BANK + WALLET SUMMARY
# -------------------------
def calculate_combined_summary():
    bank_data = fetch_latest_bank_email()
    wallet_data = fetch_latest_wallet_email()

    if "error" in bank_data or "error" in wallet_data:
        missing = []
        if "error" in bank_data: missing.append("Bank")
        if "error" in wallet_data: missing.append("Wallet")
        return {"error": f"{', '.join(missing)} statement not available. Unable to calculate summary."}

    opening = safe_float(bank_data["balances"].get("opening_balance")) + safe_float(wallet_data["balances"].get("opening_balance"))
    closing = safe_float(bank_data["balances"].get("closing_balance")) + safe_float(wallet_data["balances"].get("closing_balance"))
    net_change = closing - opening

    return {
        "total_opening_balance": opening,
        "total_closing_balance": closing,
        "total_expense": abs(net_change) if net_change < 0 else 0.0,
        "total_savings": net_change if net_change > 0 else 0.0,
    }
