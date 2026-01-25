import os
import shutil
import subprocess
import datetime
import hashlib
import base64
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives import padding, hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.backends import default_backend
from flask import current_app

class BackupManager:
    def __init__(self, app=None):
        self.app = app
        if app:
            self.init_app(app)

    def init_app(self, app):
        """Initialize configurations."""
        self.db_uri = app.config.get('SQLALCHEMY_DATABASE_URI', '')
        # Configuration for backup paths (set defaults or read from env)
        self.external_drive_path = os.getenv('BACKUP_EXTERNAL_PATH')
        self.gdrive_local_path = os.getenv('BACKUP_GDRIVE_PATH')
        self.backup_password = os.getenv('BACKUP_PASSWORD', 'default_secure_password')
        self.backup_filename_prefix = "aurestra_full_backup"

    def _derive_key(self, password, salt):
        """Derive a 32-byte (256-bit) key from the password using PBKDF2."""
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
            backend=default_backend()
        )
        return kdf.derive(password.encode())

    def encrypt_file(self, input_path, output_path):
        """
        Encrypts a file with AES-256 (CBC mode).
        Prepends a 16-byte random salt to the file for key derivation.
        """
        salt = os.urandom(16)
        iv = os.urandom(16)
        key = self._derive_key(self.backup_password, salt)

        cipher = Cipher(algorithms.AES(key), modes.CBC(iv), backend=default_backend())
        encryptor = cipher.encryptor()

        with open(input_path, 'rb') as f_in, open(output_path, 'wb') as f_out:
            # Write Salt and IV first (needed for decryption)
            f_out.write(salt)
            f_out.write(iv)
            
            # Read, Pad, Encrypt
            chunk_size = 64 * 1024
            while True:
                chunk = f_in.read(chunk_size)
                if len(chunk) == 0:
                    break
                
                # If this is the last chunk, pad it
                if len(chunk) % 16 != 0:
                    padder = padding.PKCS7(128).padder()
                    padded_chunk = padder.update(chunk) + padder.finalize()
                    f_out.write(encryptor.update(padded_chunk))
                else:
                    # We can't know if this is the last chunk easily in a stream loop 
                    # for exact padding without reading ahead.
                    # Simpler approach: Read entire file for safety if small, or use proper streaming pad logic.
                    # For databases < 1GB, reading entire file is acceptable for this MVP.
                    # Let's switch to full read to ensure correct PKCS7 padding at the end.
                    pass
            
            # Re-do with full read for simplicity/safety
            f_in.seek(0)
            data = f_in.read()
            padder = padding.PKCS7(128).padder()
            padded_data = padder.update(data) + padder.finalize()
            encrypted_data = encryptor.update(padded_data) + encryptor.finalize()
            f_out.write(encrypted_data)

    def perform_backup(self):
        """
        Main entry point to perform the backup.
        Generates a STRUCTURED ZIP containing migrations and seeders.
        1. create temp structure.
        2. dump individual tables (Split Schema & Data).
        3. Zip folder.
        4. Encrypt Zip.
        5. Upload.
        6. Cleanup.
        """
        print("⏳ [Backup] Starting Structured Daily Backup Process...")
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        base_temp_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'temp_backups')
        
        # Structure: temp_backups/backup_2023.../
        backup_folder_name = f"{self.backup_filename_prefix}_{timestamp}"
        backup_dir = os.path.join(base_temp_dir, backup_folder_name)
        
        migrations_dir = os.path.join(backup_dir, 'migrations')
        seeders_dir = os.path.join(backup_dir, 'seeders')
        
        os.makedirs(migrations_dir, exist_ok=True)
        os.makedirs(seeders_dir, exist_ok=True)
        
        # Paths for final artifacts
        zip_path = os.path.join(base_temp_dir, f"{backup_folder_name}.zip")
        encrypted_path = zip_path + ".enc"
        
        # 1. Structure & Dump
        success = self._create_structured_dump(migrations_dir, seeders_dir)
        if not success:
            print("❌ [Backup] Structured dump failed. Aborting.")
            # Verify cleanup
            shutil.rmtree(backup_dir, ignore_errors=True)
            return False

        # 2. Zip the directory
        try:
            shutil.make_archive(os.path.join(base_temp_dir, backup_folder_name), 'zip', base_temp_dir, backup_folder_name)
            # make_archive appends .zip automatically, so zip_path is correct
            print(f"📦 [Backup] Zipped to {zip_path}")
        except Exception as e:
            print(f"❌ [Backup] Zipping failed: {e}")
            return False
            
        # 3. Encrypt
        try:
            self.encrypt_file(zip_path, encrypted_path)
            print(f"🔒 [Backup] Encrypted to {encrypted_path}")
        except Exception as e:
            print(f"❌ [Backup] Encryption failed: {e}")
            return False

        # 4. Distribute
        destinations = []
        if self.external_drive_path:
            destinations.append(self.external_drive_path)
        if self.gdrive_local_path:
            destinations.append(self.gdrive_local_path)
            
        # --- Cloud Google Drive Upload ---
        try:
            from model import User
            from drive_utils import get_drive_service, ensure_folder_path, upload_file_from_path
            
            admin_user = User.query.filter(User.google_refresh_token.isnot(None)).first()
            
            if admin_user:
                print(f"☁️ [Backup] Found Drive-linked user: {admin_user.email}")
                service = get_drive_service(admin_user)
                if service:
                    folder_id = ensure_folder_path(service, ["Aurestra Backups"])
                    if folder_id:
                        filename = os.path.basename(encrypted_path)
                        # We upload the encrypted ZIP
                        if upload_file_from_path(service, folder_id, filename, encrypted_path):
                            print(f"✅ [Backup] Successfully uploaded to Google Drive Cloud!")
                        else:
                            print("❌ [Backup] Cloud upload failed.")
                    else:
                        print("❌ [Backup] Could not create Drive folder.")
                else:
                    print("⚠️ [Backup] Drive service failed to init.")
            else:
                print("⚠️ [Backup] No user with Google Drive access found. Skipping Cloud Backup.")
                
        except Exception as e:
            print(f"❌ [Backup] Drive integration error: {e}")

        # Local Fallback
        if not destinations:
            local_backup = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backups')
            destinations.append(local_backup)
            print(f"⚠️ [Backup] Saving to local fallback: {local_backup}")

        for dest in destinations:
            try:
                os.makedirs(dest, exist_ok=True)
                final_path = os.path.join(dest, os.path.basename(encrypted_path))
                shutil.copy2(encrypted_path, final_path)
                print(f"✅ [Backup] Saved to: {final_path}")
            except Exception as e:
                print(f"❌ [Backup] Failed to save to {dest}: {e}")

        # 5. Cleanup
        try:
            shutil.rmtree(backup_dir) # Remove unzipped folder
            os.remove(zip_path)       # Remove zip
            os.remove(encrypted_path) # Remove encrypted file
            print("🧹 [Backup] Cleanup complete.")
        except Exception as e:
            print(f"⚠️ [Backup] Cleanup warning: {e}")
            
        return True

    def _create_structured_dump(self, migrations_dir, seeders_dir):
        """
        Dumps tables individually into schema and data files.
        """
        from sqlalchemy import inspect
        from database import db # Ensure we have access to db session/engine
        
        uri = self.db_uri
        
        if uri.startswith('sqlite'):
            # SQLite fallback: Just copy the file to migrations as 'full_db.sqlite'
            # Structured dump for SQLite is harder without external tools
            db_path = uri.replace('sqlite:///', '')
            if not os.path.isabs(db_path):
                db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), db_path)
            shutil.copy2(db_path, os.path.join(migrations_dir, 'full_database.sqlite'))
            print("💾 [Backup] SQLite database copied (Structured dump not supported for SQLite).")
            return True
            
        elif uri.startswith('mysql'):
            try:
                from sqlalchemy.engine.url import make_url
                u = make_url(uri)
                
                # Get table names
                inspector = inspect(db.engine)
                tables = inspector.get_table_names()
                
                print(f"📊 [Backup] Found {len(tables)} tables to dump.")
                
                for table in tables:
                    # 1. Dump Schema (Migration)
                    mig_file = os.path.join(migrations_dir, f"{table}.sql")
                    cmd_mig = [
                        'mysqldump',
                        f'-h{u.host}',
                        f'-P{u.port}',
                        f'-u{u.username}',
                        f'-p{u.password}',
                        '--no-data', # Schema only
                        '--skip-comments',
                        u.database,
                        table
                    ]
                    with open(mig_file, 'w') as f:
                        subprocess.check_call(cmd_mig, stdout=f)
                        
                    # 2. Dump Data (Seeder)
                    # Use --skip-extended-insert to have one INSERT per line (Readable)
                    # Use --complete-insert to include column names
                    seed_file = os.path.join(seeders_dir, f"{table}.sql")
                    cmd_seed = [
                        'mysqldump',
                        f'-h{u.host}',
                        f'-P{u.port}',
                        f'-u{u.username}',
                        f'-p{u.password}',
                        '--no-create-info', # Data only
                        '--skip-extended-insert', # Readable (One row per line)
                        '--complete-insert',
                        '--skip-comments',
                        u.database,
                        table
                    ]
                    with open(seed_file, 'w') as f:
                        subprocess.check_call(cmd_seed, stdout=f)
                        
                print("💾 [Backup] MySQL Structured Dump success.")
                return True
                
            except Exception as e:
                print(f"❌ [Backup] MySQL Dump failed: {e}")
                return False
        
        return False
