import os
import shutil
from datetime import datetime
from database import app, db
from model import User
from drive_utils import (
    get_gmail_service, 
    list_gmail_messages, 
    delete_gmail_messages,
    get_drive_service,
    ensure_folder_path,
    list_drive_files_in_folder,
    delete_drive_file,
    GMAIL_MODIFY_SCOPES
)

def perform_daily_cleanup():
    """
    1. Deletes all Gmail messages matching 'Aurestra' or 'austrea'.
    2. Deletes all files in the 'Aurestra Backups' Google Drive folder.
    3. Deletes local backup files in 'temp_backups' and 'backups' directories.
    """
    print(f"🧹 [{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Starting Daily Cleanup...")

    with app.app_context():
        # Find any user with Google credentials (usually there's only one admin)
        admin_user = User.query.filter(User.google_refresh_token.isnot(None)).first()
        
        if not admin_user:
            print("⚠️ [Cleanup] No user with Google credentials found. Skipping Gmail/Drive cleanup.")
        else:
            print(f"👤 [Cleanup] Using admin user: {admin_user.email}")
            
            # --- 1. Gmail Cleanup ---
            try:
                # Use GMAIL_MODIFY_SCOPES to allow deletion
                gmail_service = get_gmail_service(admin_user, scopes=GMAIL_MODIFY_SCOPES)
                if gmail_service:
                    # Search for 'Aurestra' (and 'austrea' as per user typo)
                    # We search all folders ('all') by not specifying labelIds
                    queries = ["Aurestra", "austrea"]
                    for query in queries:
                        messages = list_gmail_messages(gmail_service, query=query)
                        if messages:
                            print(f"📧 [Cleanup] Found {len(messages)} Gmail messages for query '{query}'. Deleting...")
                            msg_ids = [m['id'] for m in messages]
                            if delete_gmail_messages(gmail_service, msg_ids):
                                print(f"✅ [Cleanup] Deleted {len(messages)} messages for '{query}'.")
                            else:
                                print(f"❌ [Cleanup] Failed to delete messages for '{query}'.")
                        else:
                            print(f"ℹ️ [Cleanup] No Gmail messages found for query '{query}'.")
            except Exception as e:
                print(f"❌ [Cleanup] Gmail error: {e}")

            # --- 2. Google Drive Backup Cleanup ---
            try:
                drive_service = get_drive_service(admin_user)
                if drive_service:
                    folder_id = ensure_folder_path(drive_service, ["Aurestra Backups"])
                    if folder_id:
                        files = list_drive_files_in_folder(drive_service, folder_id)
                        if files:
                            print(f"☁️ [Cleanup] Found {len(files)} backups in Drive. Deleting all...")
                            for f in files:
                                if delete_drive_file(drive_service, f['id']):
                                    print(f"🗑️ [Cleanup] Deleted Drive file: {f['name']}")
                                else:
                                    print(f"❌ [Cleanup] Failed to delete Drive file: {f['name']}")
                            print("✅ [Cleanup] Drive backup cleanup complete.")
                        else:
                            print("ℹ️ [Cleanup] No backups found in Drive folder.")
            except Exception as e:
                print(f"❌ [Cleanup] Drive error: {e}")

    # --- 3. Local Backup Cleanup ---
    base_path = os.path.dirname(os.path.abspath(__file__))
    local_dirs = [
        os.path.join(base_path, 'temp_backups'),
        os.path.join(base_path, 'backups'),
        os.path.join(base_path, 'attachments')
    ]

    for ld in local_dirs:
        if os.path.exists(ld):
            try:
                # Instead of deleting the folder, delete contents
                contents = os.listdir(ld)
                if contents:
                    print(f"📂 [Cleanup] Clearing local directory: {ld}")
                    for item in contents:
                        item_path = os.path.join(ld, item)
                        if os.path.isfile(item_path):
                            os.remove(item_path)
                        elif os.path.isdir(item_path):
                            shutil.rmtree(item_path)
                    print(f"✅ [Cleanup] Local directory {ld} cleared.")
                else:
                    print(f"ℹ️ [Cleanup] Local directory {ld} is already empty.")
            except Exception as e:
                print(f"❌ [Cleanup] Failed to clear {ld}: {e}")

    print(f"🏁 [{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Daily Cleanup Finished.")

if __name__ == "__main__":
    perform_daily_cleanup()
