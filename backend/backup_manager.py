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
        1. Dump DB to temp SQL file.
        2. Encrypt temp file.
        3. Copy to destinations.
        4. Cleanup.
        """
        print("⏳ [Backup] Starting Daily Backup Process...")
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        temp_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'temp_backups')
        os.makedirs(temp_dir, exist_ok=True)
        
        raw_dump_path = os.path.join(temp_dir, f"{self.backup_filename_prefix}_{timestamp}.sql")
        encrypted_dump_path = raw_dump_path + ".enc"
        
        # 1. Dump Database
        success = self._dump_database(raw_dump_path)
        if not success:
            print("❌ [Backup] Database dump failed. Aborting.")
            return False

        # 2. Encrypt
        try:
            self.encrypt_file(raw_dump_path, encrypted_dump_path)
            print(f"🔒 [Backup] Encrypted to {encrypted_dump_path}")
        except Exception as e:
            print(f"❌ [Backup] Encryption failed: {e}")
            return False

        # 3. Distribute (Save to locations)
        destinations = []
        if self.external_drive_path:
            destinations.append(self.external_drive_path)
        if self.gdrive_local_path:
            destinations.append(self.gdrive_local_path)
            
        # If no paths configured, save to local 'backups' folder as fallback
        if not destinations:
            local_backup = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backups')
            destinations.append(local_backup)
            print(f"⚠️ [Backup] No external paths set. Saving to local: {local_backup}")

        for dest in destinations:
            try:
                os.makedirs(dest, exist_ok=True)
                final_path = os.path.join(dest, os.path.basename(encrypted_dump_path))
                shutil.copy2(encrypted_dump_path, final_path)
                print(f"✅ [Backup] Saved to: {final_path}")
            except Exception as e:
                print(f"❌ [Backup] Failed to save to {dest}: {e}")

        # 4. Cleanup
        try:
            os.remove(raw_dump_path)
            os.remove(encrypted_dump_path)
            print("🧹 [Backup] Cleanup complete.")
        except Exception as e:
            print(f"⚠️ [Backup] Cleanup warning: {e}")
            
        return True

    def _dump_database(self, output_path):
        """Determine DB type and run appropriate dump command."""
        uri = self.db_uri
        
        try:
            if uri.startswith('sqlite'):
                # For SQLite, we just copy the file
                db_path = uri.replace('sqlite:///', '')
                if not os.path.isabs(db_path):
                    db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), db_path)
                shutil.copy2(db_path, output_path)
                print("💾 [Backup] SQLite database copied successfully.")
                return True
                
            elif uri.startswith('postgres'):
                # Parse credentials from URI
                # postgresql://user:pass@host:port/db
                from sqlalchemy.engine.url import make_url
                u = make_url(uri)
                
                env = os.environ.copy()
                env['PGPASSWORD'] = u.password
                
                cmd = [
                    'pg_dump',
                    '-h', u.host,
                    '-p', str(u.port),
                    '-U', u.username,
                    '-F', 'p', # Plain text SQL
                    '-f', output_path,
                    u.database
                ]
                subprocess.check_call(cmd, env=env)
                print("💾 [Backup] PostgreSQL dumped successfully.")
                return True
                
            elif uri.startswith('mysql'):
                from sqlalchemy.engine.url import make_url
                u = make_url(uri)
                
                # mysqldump -u user -p password -h host db > file
                cmd = [
                    'mysqldump',
                    f'-h{u.host}',
                    f'-P{u.port}',
                    f'-u{u.username}',
                    f'-p{u.password}',
                    u.database
                ]
                
                with open(output_path, 'w') as f:
                    subprocess.check_call(cmd, stdout=f)
                print("💾 [Backup] MySQL dumped successfully.")
                return True
                
        except Exception as e:
            print(f"❌ [Backup] Dump execution failed: {e}")
            return False
            
        print("❌ [Backup] Unsupported database type.")
        return False
