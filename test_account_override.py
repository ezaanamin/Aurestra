
from backend.balances import extract_transactions_from_bank

# Verification Mock for Fetcher Logic
# Simulate the logic I just added to fetchers.py

def mock_fetch_and_process(text, scraped_closing_balance):
    print(f"--- Mock Fetching ---")
    print(f"Scraped Closing Balance: {scraped_closing_balance}")
    
    balances = {"closing_balance": scraped_closing_balance}
    transactions = extract_transactions_from_bank(text)
    
    found_bal = float(balances.get("closing_balance", "0"))
    
    # LOGIC FROM fetchers.py
    if transactions:
        calculated_closing = transactions[-1]["running_balance"]
        print(f"🔄 Correcting Closing Balance: {found_bal} -> {calculated_closing}")
        balances["closing_balance"] = str(calculated_closing)
        found_bal = calculated_closing

    return balances["closing_balance"]

# Test Data (User's Case)
# Scraped Balance might be wrong (e.g. 19000 or 42739 from previous confusion, 
# or just the text '2128.00' if it scraped correctly).
# Let's assume it mocked a wrong scrape to verify the override.
wrong_scraped_balance = "50000.00"

text = """
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

final_bal = mock_fetch_and_process(text, wrong_scraped_balance)

print(f"\nFinal Account Balance: {final_bal}")

if float(final_bal) == 2128.0:
    print("SUCCESS: Account balance updated correctly!")
else:
    print("FAILURE: Account balance did not update.")
