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

# -------------------------
# FETCH EASYPaisa TRANSACTION EMAIL (PDF only)
# -------------------------
def decode_mime_words(s):
    """Decode MIME-encoded email headers."""
    decoded = decode_header(s)
    return ''.join(
        str(t[0], t[1] or 'utf-8') if isinstance(t[0], bytes) else t[0]
        for t in decoded
    )

def parse_easypaisa_body(body_text):
    """
    Parse Easypaisa transaction email body into structured data.
    Returns a dictionary.
    """
    # Remove excessive whitespace and normalize
    lines = [line.strip() for line in body_text.splitlines() if line.strip()]
    data = {}

    try:
        # Date
        for line in lines:
            if re.match(r"\d{2}-[A-Za-z]{3}-\d{4}", line):
                data['date'] = line
                break

        # Time
        time_pattern = re.compile(r"\d{1,2}:\d{2}\s?(AM|PM|am|pm)")
        for line in lines:
            if time_pattern.match(line):
                data['time'] = line
                break

        # Transaction ID
        for line in lines:
            if line.startswith("ID#"):
                data['transaction_id'] = line.replace("ID#", "")
                break

        # Funding Source
        for idx, line in enumerate(lines):
            if line.lower() == "funding source":
                data['funding_source'] = lines[idx + 1]
                break

        # Sent to / Receiver info
        for idx, line in enumerate(lines):
            if line.lower() == "sent to":
                data['receiver_name'] = lines[idx + 1]
                data['receiver_number'] = lines[idx + 2]
                break

        # Account Details / Sender info
        for idx, line in enumerate(lines):
            if line.lower() == "account details":
                data['receiver_full_name'] = lines[idx + 1]
            if line.lower() == "sent by":
                data['sender_name'] = lines[idx + 1]
                data['sender_number'] = lines[idx + 2]
                break

        # Amounts
        for idx, line in enumerate(lines):
            if line.lower() == "amount":
                data['amount'] = float(lines[idx + 1])
            if line.lower() == "fee / charge":
                data['fee'] = float(lines[idx + 1])
            if line.lower() == "total amount":
                data['total_amount'] = float(lines[idx + 1].replace("Rs.", "").strip())
                break

        # Category
        for idx, line in enumerate(lines):
            if line.lower().startswith("category of transaction"):
                if idx + 1 < len(lines):
                    category_line = lines[idx + 1].replace("☐", "").strip()
                    data['category'] = category_line
                break

    except Exception as e:
        print(f"❌ Error parsing body: {e}")

    return data

# -------------------------
# FETCH & SAVE TRANSACTIONS
def fetch_and_save_easypaisa_emails():
    """
    Fetch unread Easypaisa emails, parse them, and save to Transaction model.
    Stores the receiver's full name in the `sender` column.
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
            body_text = ""

            if msg.is_multipart():
                for part in msg.walk():
                    if part.get_content_type() == "text/plain":
                        body_text += part.get_payload(decode=True).decode(errors="ignore")
            else:
                body_text = msg.get_payload(decode=True).decode(errors="ignore")

            if "easypaisa transaction details" not in subject.lower() and \
               "easypaisa transaction details" not in body_text.lower():
                continue

            transaction_data = parse_easypaisa_body(body_text)
            transaction_data['from_email'] = msg.get("From")
            transaction_data['subject'] = subject
            transaction_data['body_text'] = body_text

            dt = datetime.utcnow()
            try:
                if 'date' in transaction_data and 'time' in transaction_data:
                    dt = datetime.strptime(
                        f"{transaction_data['date']} {transaction_data['time']}",
                        "%d-%b-%Y %I:%M %p"
                    )
            except:
                pass

            transaction = Transaction(
                source="wallet",
                date=dt,
                purpose=transaction_data.get("category"),
                amount=float(transaction_data.get("amount", 0.0)),
                sender=transaction_data.get("receiver_name")
            )

            with db.session.begin():
                db.session.add(transaction)

            transactions_saved.append(transaction_data)

        mail.logout()
        print(f"✅ Saved {len(transactions_saved)} Easypaisa transactions.")    
        return {"saved": transactions_saved, "count": len(transactions_saved)}

    except Exception as e:
        print(f"❌ Easypaisa fetch/save error: {e}")
        return {"error": f"Easypaisa fetch/save error: {str(e)}"}

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
