import os
from dotenv import load_dotenv

load_dotenv()

# === BANK CONFIG ===
BANK_EMAIL_ACCOUNT = os.getenv("BANK_EMAIL_ACCOUNT")
BANK_APP_PASSWORD = os.getenv("APP_PASSWORD")
BANK_PDF_PASSWORD = os.getenv("BANK_PDF_PASSWORD")
IMAP_HOST = os.getenv("IMAP_HOST", "imap.gmail.com")
BANK_SENDER = os.getenv("BANK_SENDER", "estatement@bankalhabib.com")

# === WALLET CONFIG ===
WALLET_EMAIL_ACCOUNT = os.getenv("Wallet_EMAIL_ACCOUNT")
WALLET_APP_PASSWORD = os.getenv("wallet_APP_PASSWORD")
WALLET_SUBJECT_KEYWORD = os.getenv("wallet_SUBJECT_KEYWORD", "easypaisa e-statement")
TEMP_FILE = os.getenv("TEMP_FILE", "temp_statement.pdf")

ATTACHMENTS_DIR = "attachments"
