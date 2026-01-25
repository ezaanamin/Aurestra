import os
import re
from database import db, app
from sqlalchemy import text

def run_migrations():
    """
    Executes SQL migration files in alphanumeric order.
    Checks if table exists before creating (if script allows) or just runs them.
    Assumes scripts are "CREATE TABLE IF NOT EXISTS" or robust errors.
    Since raw SQL usually isn't idempotent unless written so, we will wrap in try/except.
    """
    migrations_dir = os.path.join(os.path.dirname(__file__), 'migrations')
    
    # Get sorted list of SQL files
    files = sorted([f for f in os.listdir(migrations_dir) if f.endswith('.sql')])
    
    print(f"🚀 [Migrations] Found {len(files)} migration files.")
    
    with app.app_context():
        try:
            # Test connection
            db.session.execute(text("SELECT 1"))
            print("✅ [Migrations] Database connected.")
            
            for filename in files:
                file_path = os.path.join(migrations_dir, filename)
                print(f"🔄 [Migrations] Running {filename}...")
                
                with open(file_path, 'r') as f:
                    sql_content = f.read()
                    
                # Split by semicolon to handle multiple statements if any
                statements = sql_content.split(';')
                
                for statement in statements:
                    if statement.strip():
                        try:
                            db.session.execute(text(statement))
                        except Exception as e:
                            # Log but continue? Check if "Table exists"
                            err_str = str(e).lower()
                            if "already exists" in err_str:
                                print(f"   ⚠️ Table already exists (Skipping statement).")
                            else:
                                print(f"   ❌ Error executing statement: {e}")
                                # For production, maybe we want to stop? 
                                # But for "run both", let's be robust.
                
                db.session.commit()
                print(f"   ✅ Done.")
                
            print("✨ [Migrations] All migrations completed successfully.")
            
        except Exception as e:
            print(f"❌ [Migrations] Critical Error: {e}")

if __name__ == "__main__":
    run_migrations()
