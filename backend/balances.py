import re

def extract_balances_from_bank(text):
    clean_text = " ".join(text.split())
    opening = re.search(r"Opening Balance\s+([0-9,]+\.\d+)", clean_text)
    closing = re.search(r"Closing Balance\s+([0-9,]+\.\d+)", clean_text)
    return {
        "opening_balance": opening.group(1) if opening else "N/A",
        "closing_balance": closing.group(1) if closing else "N/A",
    }

def extract_balances_from_wallet(text):
    clean_text = " ".join(text.split())
    opening = re.search(r"(?:Opening Balance|Balance B/F)\s+([0-9,]+\.\d+)", clean_text, re.IGNORECASE)
    closing = re.search(r"Closing Balance(?:\s+B/F)?[^\d]*([0-9,]+\.\d+)", clean_text, re.IGNORECASE)
    return {
        "opening_balance": opening.group(1) if opening else "N/A",
        "closing_balance": closing.group(1) if closing else "N/A",
    }
