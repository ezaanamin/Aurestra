
from app import app, db, fetch_latest_bank_email, Transaction, AccountBalance
from datetime import datetime

with app.app_context():
    print("--- Starting Repopulation ---")
    
    # 1. Re-Fetch FIRST (Safety Check)
    print("Fetching fresh data from bank emails...")
    bank_data = fetch_latest_bank_email()
    
    if "error" in bank_data:
        print(f"❌ Error fetching data: {bank_data['error']}")
        print("Aborting repopulation to preserve existing data.")
    else:
        print("✅ Fetch successful. Proceeding to update database.")
        
        # 2. Clear Existing Transactions (Bank Only)
        print("Deleting existing bank transactions...")
        try:
            deleted = Transaction.query.filter_by(source='bank').delete()
            # Don't commit valid check yet? No, we need to commit to clear.
            # But we have the new data in variable `bank_data`, so it's safe.
            db.session.commit()
            print(f"Deleted {deleted} transactions.")
        except Exception as e:
            db.session.rollback()
            print(f"Error deleting transactions: {e}")

        # 3. Update Balance
        if "balances" in bank_data:
            closing_bal = bank_data["balances"].get("closing_balance", 0.0)
            bank_acc = AccountBalance.query.filter_by(source="bank").first()
            if not bank_acc:
                bank_acc = AccountBalance(source="bank", current_balance=0.0)
                db.session.add(bank_acc)
            
            bank_acc.current_balance = closing_bal
            bank_acc.last_updated = datetime.utcnow()
            print(f"Updated Bank Balance: {closing_bal}")

        if "transactions" in bank_data:
            count = 0
            for tx in bank_data["transactions"]:
                # Logic copied from manual_sync/app
                # Debug LOG
                print(f"  -> {tx['date']} | {tx['amount']} | {tx['type']} | Bal: {tx['running_balance']}")
                
                try:
                    tx_date = datetime.strptime(tx["date"], "%d/%m/%Y")
                except:
                    tx_date = datetime.utcnow()

                new_tx = Transaction(
                    source="bank",
                    date=tx_date,
                    amount=tx["amount"],
                    type=tx["type"],
                    purpose="Uncategorized",
                    sender="Bank Statement",
                    receiver="Me",
                    notes=tx["description"][:250],
                )
                db.session.add(new_tx)
                count += 1
            
            db.session.commit()
            print(f"Saved {count} new transactions.")
            
    print("--- Repopulation Complete ---")
