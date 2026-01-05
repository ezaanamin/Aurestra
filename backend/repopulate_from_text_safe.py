
import sys
import os

# Ad hoc path adjustment
sys.path.append(os.getcwd())

from backend.app import app, db, Transaction, AccountBalance
from backend.balances import extract_transactions_from_bank
from datetime import datetime

# Text from User's Image
TEXT_DATA = """
BROUGHT FORWARD 19,964.00
29/12/2025 FED SALESTAX DR, MNTH:122025, 16.0% 36.00 19,928.00
FED RECV, SMS CHARGES, ADCCHG89

29/12/2025 7494609257 RAAST P2P FT, - Digital, 20251229125300, 1,500.00 18,428.00
FT, 143624638503386555

29/12/2025 9865528747 RAAST P2P FT, - Digital, 20251228175100, 15,000.00 3,428.00
FT, 443626426400697192

29/12/2025 IBFT - IB. BAH00-460-0. DEC29-11:22:00, 500.00 2,928.00
090238-090238

29/12/2025 2107183174 RAAST P2P FT, - Digital, 20251229133137, 800.00 2,128.00
FT, 143634870300054990
"""

with app.app_context():
    print("--- Repopulating from Static Text ---")
    
    # 1. Clear Bank Transactions
    print("Clearing old data...")
    Transaction.query.filter_by(source='bank').delete()
    db.session.commit()
    
    # 2. Extract
    print("Extracting transactions...")
    transactions = extract_transactions_from_bank(TEXT_DATA)
    
    # 3. Save
    count = 0
    final_balance = 0.0
    
    for tx_data in transactions:
        try:
            tx_date = datetime.strptime(tx_data["date"], "%d/%m/%Y")
        except:
            tx_date = datetime.utcnow()
            
        new_tx = Transaction(
            source="bank",
            date=tx_date,
            amount=tx_data["amount"],
            type=tx_data["type"],
            purpose="Uncategorized",
            sender="Bank Statement",
            receiver="Me",
            notes=tx_data["description"][:250]
        )
        db.session.add(new_tx)
        final_balance = tx_data["running_balance"] # Keep last
        count += 1
        
    db.session.commit()
    print(f"Saved {count} transactions.")

    # 4. Update Account Balance
    print(f"Updating Account Balance to: {final_balance}")
    bank_acc = AccountBalance.query.filter_by(source="bank").first()
    if not bank_acc:
        bank_acc = AccountBalance(source="bank", current_balance=0.0)
        db.session.add(bank_acc)
    
    bank_acc.current_balance = final_balance
    bank_acc.last_updated = datetime.utcnow()
    db.session.commit()
    
    print("--- Done ---")
