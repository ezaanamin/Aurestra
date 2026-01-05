from app import app
from fetchers import fetch_latest_bank_email
from balances import extract_balances_from_bank, extract_transactions_from_bank
import json

with app.app_context():
    print("\n🔎 --- STARTING DEBUG SCAN ---")
    
    # 1. Fetch Data
    print("... Connecting to Email to fetch latest statement ...")
    data = fetch_latest_bank_email()
    
    if "error" in data:
        print(f"❌ Error: {data['error']}")
    else:
        # 2. Print Summary
        print("\n✅ FETCH SUCCESSFUL!")
        print(f"Subject: {data.get('subject', 'N/A')}")
        
        # 3. Print Balances
        if "balances" in data:
            print("\n💰 EXTRACTED BALANCES:")
            print(f"   Opening: {data['balances'].get('opening_balance')}")
            print(f"   Closing: {data['balances'].get('closing_balance')}")
            
        # 4. Print Transactions
        if "transactions" in data:
            txs = data["transactions"]
            print(f"\n📝 FOUND {len(txs)} TRANSACTIONS:")
            print("-" * 80)
            print(f"{'DATE':<12} | {'TYPE':<8} | {'AMOUNT':<12} | {'DESCRIPTION'}")
            print("-" * 80)
            
            for tx in txs:
                # Format amount
                amt_str = f"{tx['amount']:,.2f}"
                print(f"{tx['date']:<12} | {tx['type']:<8} | {amt_str:<12} | {tx['description'][:40]}...")
            print("-" * 80)
            
        # 5. Raw Text Sample (Optional, asking user if they want to see it?)
        # We can print the first few lines of text debug if needed.
        # But usually the parsed output is what they care about.
        
    print("\n🏁 --- DEBUG COMPLETE ---")
