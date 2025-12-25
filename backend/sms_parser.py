"""
Bank Alhabib SMS Parser
=======================
Parses Bank Alhabib SMS messages and extracts transaction details
"""

import re
from datetime import datetime
from model import Transaction
from database import db
import logging

logger = logging.getLogger(__name__)


class BankAlhabibSMSParser:
    """Parser specifically for Bank Alhabib SMS messages"""
    
    # Account number patterns
    ACCOUNT_PATTERNS = [
        r'A/C\s+\(?(PK\*\*BAHL\*{4}\d+)\)?',  # PK**BAHL****6801
        r'A/C\s+(\d{4}-\d{4}-\*{6}-\d{2}-\d)',  # 0460-0981-******-01-4
        r'Account\s+\((\d{4}-\d{4}-\*{6}-\d{2}-\d)\)',
    ]
    
    # Transaction patterns
    CREDIT_PATTERN = re.compile(
        r'credited with Rs\.\s*([0-9,]+\.?\d*)\s+via\s+(\w+)\s+from\s+([^,]+)(?:,\s*([^,]+))?\s+on\s+(\d{2}/\d{2}/\d{4})\s+at\s+(\d{2}:\d{2}:\d{2})',
        re.IGNORECASE
    )
    
    DEBIT_PATTERN = re.compile(
        r'debited by PKR\s*([0-9,]+\.?\d*)\s+(?:excluding FED\s+)?(?:for\s+(.+?)(?:\.|For|$))',
        re.IGNORECASE
    )
    
    # Service charge pattern
    SERVICE_CHARGE_PATTERN = re.compile(
        r'debited by PKR\s*([0-9,]+\.?\d*)\s+excluding FED\.?\s*For\s+(.+?)(?:\.|For)',
        re.IGNORECASE
    )
    
    # Card charge pattern
    CARD_CHARGE_PATTERN = re.compile(
        r'debited by PKR\s*([0-9,]+\.?\d*)\s+excluding FED for\s+(.+?),\s+your card no\. ending with\s+\*\*(\d+)',
        re.IGNORECASE
    )
    
    @staticmethod
    def parse_amount(amount_str):
        """Parse amount string to float"""
        try:
            return float(amount_str.replace(',', '').strip())
        except:
            return 0.0
    
    @staticmethod
    def parse_datetime(date_str, time_str):
        """Parse date and time strings to datetime object"""
        try:
            # Format: 10/12/2025 at 20:18:35
            datetime_str = f"{date_str} {time_str}"
            return datetime.strptime(datetime_str, "%d/%m/%Y %H:%M:%S")
        except:
            logger.error(f"Error parsing datetime: {date_str} {time_str}")
            return datetime.utcnow()
    
    @staticmethod
    def extract_account_number(message):
        """Extract account number from message"""
        for pattern in BankAlhabibSMSParser.ACCOUNT_PATTERNS:
            match = re.search(pattern, message, re.IGNORECASE)
            if match:
                return match.group(1)
        return None
    
    @classmethod
    def parse_credit_transaction(cls, message):
        """
        Parse credit (incoming) transaction
        
        Examples:
        - "credited with Rs. 5600.00 via Raast from Ezaan Amin SADAPKKA..."
        - "credited with Rs. 39000.00 via IBFT from INERTIA, 147236-147236"
        """
        match = cls.CREDIT_PATTERN.search(message)
        if not match:
            return None
        
        amount = cls.parse_amount(match.group(1))
        payment_method = match.group(2)  # Raast, IBFT, etc.
        sender_name = match.group(3).strip()
        reference = match.group(4).strip() if match.group(4) else None
        date_str = match.group(5)
        time_str = match.group(6)
        
        transaction_date = cls.parse_datetime(date_str, time_str)
        account_number = cls.extract_account_number(message)
        
        # Extract purpose from sender name and reference
        purpose = f"{payment_method} Transfer"
        if reference:
            purpose += f" - {reference}"
        
        return {
            'type': 'credit',
            'amount': amount,
            'sender': sender_name,
            'purpose': purpose,
            'date': transaction_date,
            'notes': f"Payment method: {payment_method}, Account: {account_number}",
            'source': 'sms',
        }
    
    @classmethod
    def parse_debit_transaction(cls, message):
        """
        Parse debit (outgoing) transaction
        
        Examples:
        - "debited by PKR 225.00 excluding FED.For SMS Alert Service Charges"
        - "debited by PKR 129.31 excluding FED for Debit Card Charges, your card no. ending with **6883"
        """
        
        # Try card charge pattern first (more specific)
        card_match = cls.CARD_CHARGE_PATTERN.search(message)
        if card_match:
            amount = cls.parse_amount(card_match.group(1))
            purpose = card_match.group(2).strip()
            card_last_digits = card_match.group(3)
            
            account_number = cls.extract_account_number(message)
            
            return {
                'type': 'debit',
                'amount': amount,
                'receiver': 'Bank AL Habib',
                'purpose': purpose,
                'date': datetime.utcnow(),  # SMS doesn't include date for charges
                'notes': f"Card ending: {card_last_digits}, Account: {account_number}",
                'source': 'sms',
            }
        
        # Try service charge pattern
        service_match = cls.SERVICE_CHARGE_PATTERN.search(message)
        if service_match:
            amount = cls.parse_amount(service_match.group(1))
            purpose = service_match.group(2).strip()
            
            account_number = cls.extract_account_number(message)
            
            return {
                'type': 'debit',
                'amount': amount,
                'receiver': 'Bank AL Habib',
                'purpose': purpose,
                'date': datetime.utcnow(),
                'notes': f"Service Charge, Account: {account_number}",
                'source': 'sms',
            }
        
        # Try general debit pattern
        debit_match = cls.DEBIT_PATTERN.search(message)
        if debit_match:
            amount = cls.parse_amount(debit_match.group(1))
            purpose = debit_match.group(2).strip() if debit_match.group(2) else "Bank Charges"
            
            account_number = cls.extract_account_number(message)
            
            return {
                'type': 'debit',
                'amount': amount,
                'receiver': 'Bank AL Habib',
                'purpose': purpose,
                'date': datetime.utcnow(),
                'notes': f"Account: {account_number}",
                'source': 'sms',
            }
        
        return None
    
    @classmethod
    def is_transaction_sms(cls, message):
        """Check if SMS is a transaction (not OTP, info, etc.)"""
        # Skip OTPs, account opening messages, info messages
        skip_keywords = [
            'OTP', 'OTAC', 'One Time',
            'cheque book', 'ready',
            'subscribe', 'E-Statement',
            'account has been opened',
            'For assistance',
        ]
        
        for keyword in skip_keywords:
            if keyword.lower() in message.lower():
                return False
        
        # Check if it's a transaction message
        return 'credited' in message.lower() or 'debited' in message.lower()
    
    @classmethod
    def parse_sms(cls, message, sender='BAHL'):
        """
        Main parsing method
        
        Returns:
            dict: Transaction data or None if not a transaction SMS
        """
        try:
            # Clean message
            message = message.strip()
            
            # Check if it's a transaction SMS
            if not cls.is_transaction_sms(message):
                logger.info("SMS is not a transaction message, skipping")
                return None
            
            # Try to parse as credit transaction
            transaction_data = cls.parse_credit_transaction(message)
            if transaction_data:
                logger.info(f"Parsed CREDIT transaction: Rs. {transaction_data['amount']}")
                return transaction_data
            
            # Try to parse as debit transaction
            transaction_data = cls.parse_debit_transaction(message)
            if transaction_data:
                logger.info(f"Parsed DEBIT transaction: Rs. {transaction_data['amount']}")
                return transaction_data
            
            logger.warning(f"Could not parse transaction from SMS: {message[:100]}...")
            return None
            
        except Exception as e:
            logger.error(f"Error parsing SMS: {e}")
            return None


def process_bank_sms(message, sender='BAHL'):
    """
    Process a bank SMS and save as transaction
    
    Args:
        message (str): SMS message text
        sender (str): SMS sender (default: 'BAHL')
    
    Returns:
        Transaction: Created transaction or None
    """
    try:
        # Parse SMS
        transaction_data = BankAlhabibSMSParser.parse_sms(message, sender)
        
        if not transaction_data:
            return None
        
        # Create unique ID from message hash to prevent duplicates
        import hashlib
        message_hash = hashlib.md5(message.encode()).hexdigest()[:16]
        transaction_data['transaction_id'] = f"sms_{message_hash}"
        
        # Check if transaction already exists
        existing = Transaction.query.filter_by(
            transaction_id=transaction_data['transaction_id']
        ).first()
        
        if existing:
            logger.info(f"SMS transaction already exists: {message_hash}")
            return existing
        
        # Create new transaction
        transaction = Transaction(**transaction_data)
        db.session.add(transaction)
        db.session.commit()
        
        logger.info(f"SMS transaction created: {transaction.id} - {transaction.type} Rs. {transaction.amount}")
        return transaction
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error processing SMS transaction: {e}")
        return None


