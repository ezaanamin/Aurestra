
from app import app, db, fetch_latest_bank_email, Transaction

with app.app_context():
    print("--- Attempting to Fetch Bank Data ---")
    data = fetch_latest_bank_email()
    
    if "error" in data:
        print(f"Error fetching data: {data['error']}")
    else:
        print("Fetch successful!")
        if "transactions" in data:
            print(f"Found {len(data['transactions'])} transactions.")
            # We need to simulate the saving logic that usually happens in the API route
            # In app.py /api/accounts logic does this.
            
            # Let's just see if we found them first.
            for tx in data['transactions'][:3]:
                print(f" - {tx['date']} : {tx['amount']} : {tx['type']}")
        else:
            print("No transactions found in the data.")
            
        if "balances" in data:
             print(f"Balances: {data['balances']}")
             
    # Double check DB count again
    count = Transaction.query.count()
    print(f"Current DB Transaction Count: {count}")
