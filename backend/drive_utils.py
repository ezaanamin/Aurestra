import os
import io
import json
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload, MediaIoBaseDownload
from datetime import datetime
from cryptography.fernet import Fernet
import base64
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

SCOPES = ['https://www.googleapis.com/auth/drive.file']
GMAIL_SCOPES = ['https://www.googleapis.com/auth/gmail.send']
GMAIL_MODIFY_SCOPES = [
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.modify'
]

KEY_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'encryption_key.key')

def load_or_generate_key():
    """Loads the encryption key from Env, file, or generates a new one."""
    # 1. Environment Variable (Best for Render/Production)
    env_key = os.getenv("ENCRYPTION_KEY")
    if env_key:
        return env_key.encode()

    # 2. File System (Local Dev)
    if os.path.exists(KEY_FILE):
        with open(KEY_FILE, 'rb') as key_file:
            key = key_file.read()
            return key
            
    # 3. Generate New (Fallback - Warning: Ephemeral on Render)
    key = Fernet.generate_key()
    try:
        with open(KEY_FILE, 'wb') as key_file:
            key_file.write(key)
        # print(f"🔑 New encryption key generated: {key.decode()}")
    except Exception:
        pass # Might be read-only filesystem
        
    return key

# Initialize Cipher Suite
try:
    CIPHER_SUITE = Fernet(load_or_generate_key())
except Exception as e:
    print(f"❌ Failed to initialize encryption: {e}")
    CIPHER_SUITE = None

def get_drive_service(user):
    """
    Returns an authenticated Drive API service for the given User model instance.
    Refreshes the token if necessary.
    """
    if not user.google_refresh_token:
        # print(f"⚠️ User {user.email} has no refresh token.")
        return None

    try:
        # Build Credentials object
        creds = Credentials(
            token=None, # We don't have a current access token, only refresh
            refresh_token=user.google_refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=os.getenv('GOOGLE_WEB_CLIENT_ID'),
            client_secret=os.getenv('GOOGLE_CLIENT_SECRET'),
            scopes=SCOPES
        )

        # Refresh the access token
        creds.refresh(Request())
        
        # Build Service
        service = build('drive', 'v3', credentials=creds)
        return service

    except Exception as e:
        print(f"❌ Failed to build Drive service: {e}")
        return None

def find_folder(service, folder_name, parent_id=None):
    """Searches for a folder with the given name inside parent_id (or root)."""
    query = f"mimeType='application/vnd.google-apps.folder' and name='{folder_name}' and trashed=false"
    
    if parent_id:
        query += f" and '{parent_id}' in parents"
        
    try:
        results = service.files().list(q=query, spaces='drive', fields='files(id, name)').execute()
        files = results.get('files', [])
        
        if files:
            return files[0]['id'] # Return ID of first match
        return None
    except Exception as e:
        print(f"❌ Find folder error: {e}")
        return None

def create_folder(service, folder_name, parent_id=None):
    """Creates a new folder."""
    file_metadata = {
        'name': folder_name,
        'mimeType': 'application/vnd.google-apps.folder'
    }
    
    if parent_id:
        file_metadata['parents'] = [parent_id]
        
    try:
        file = service.files().create(body=file_metadata, fields='id').execute()
        # print(f"✅ Created folder '{folder_name}' (ID: {file.get('id')})")
        return file.get('id')
    except Exception as e:
        print(f"❌ Create folder error: {e}")
        return None

def ensure_folder_path(service, path_parts):
    """
    Ensures a nested folder structure exists.
    path_parts: list e.g. ["Aurestra Finance", "2026-01"]
    Returns the ID of the final folder.
    """
    parent_id = None
    
    for folder_name in path_parts:
        folder_id = find_folder(service, folder_name, parent_id)
        
        if not folder_id:
            folder_id = create_folder(service, folder_name, parent_id)
            
        if not folder_id:
            return None # Failed to find/create
            
        parent_id = folder_id
        
    return parent_id

def upload_json(service, folder_id, filename, data):
    """Uploads a dictionary as an ENCRYPTED JSON file to the specified folder."""
    try:
        # Convert dict to JSON string
        json_str = json.dumps(data)
        
        # Encrypt
        if CIPHER_SUITE:
            encrypted_data = CIPHER_SUITE.encrypt(json_str.encode('utf-8'))
            # print(f"🔒 Encrypted backup size: {len(encrypted_data)} bytes")
        else:
            print("⚠️ Encryption not active, uploading plaintext (NOT RECOMMENDED)")
            encrypted_data = json_str.encode('utf-8')

        fh = io.BytesIO(encrypted_data)
        
        media = MediaIoBaseUpload(fh, mimetype='application/octet-stream', resumable=True)
        
        # Check if file exists to update or create
        existing_file_query = f"name='{filename}' and '{folder_id}' in parents and trashed=false"
        results = service.files().list(q=existing_file_query, fields='files(id)').execute()
        files = results.get('files', [])

        file_metadata = {'name': filename}

        if files:
            # Update
            file_id = files[0]['id']
            # Remove parents from metadata for update
            service.files().update(
                fileId=file_id, 
                media_body=media
            ).execute()
            # print(f"✅ Updated file '{filename}' in Drive (Encrypted).")
        else:
            # Create
            file_metadata['parents'] = [folder_id]
            service.files().create(
                body=file_metadata, 
                media_body=media, 
                fields='id'
            ).execute()
            # print(f"✅ Uploaded new file '{filename}' to Drive (Encrypted).")

        return True

    except Exception as e:
        print(f"❌ Upload JSON error: {e}")
        return False

def find_file(service, folder_id, filename):
    """Finds a file ID by name in a specific folder."""
    query = f"name='{filename}' and '{folder_id}' in parents and trashed=false"
    try:
        results = service.files().list(q=query, fields='files(id)').execute()
        files = results.get('files', [])
        if files:
            return files[0]['id']
        return None
    except Exception as e:
        print(f"❌ Find file error: {e}")
        return None

def download_json(service, file_id):
    """Downloads a file from Drive and decrypts it."""
    try:
        request = service.files().get_media(fileId=file_id)
        fh = io.BytesIO()
        downloader = MediaIoBaseDownload(fh, request)
        
        done = False
        while done is False:
            status, done = downloader.next_chunk()
            
        # Parse JSON
        fh.seek(0)
        content_bytes = fh.read()
        
        try:
            # Try to decrypt
            if CIPHER_SUITE:
                decrypted_bytes = CIPHER_SUITE.decrypt(content_bytes)
                content_str = decrypted_bytes.decode('utf-8')
                # print("🔓 Successfully decrypted file.")
            else:
                 content_str = content_bytes.decode('utf-8')
        except Exception as e:
            print(f"⚠️ Decryption failed (File might be old/plaintext or bad key): {e}")
            # Fallback for old plaintext files
            content_str = content_bytes.decode('utf-8')

        return json.loads(content_str)
        
    except Exception as e:
        print(f"❌ Download JSON error: {e}")
        return None

def upload_file_from_path(service, folder_id, filename, filepath, mimetype='application/octet-stream'):
    """Uploads a local file to Drive."""
    try:
        media = MediaIoBaseUpload(io.FileIO(filepath, 'rb'), mimetype=mimetype, resumable=True)
        
        # Check if file exists to update
        existing = find_file(service, folder_id, filename)
        
        file_metadata = {'name': filename}
        
        if existing:
            # Update
            service.files().update(
                fileId=existing, 
                media_body=media
            ).execute()
            print(f"✅ Updated existing backup '{filename}' in Drive.")
        else:
            # Create
            file_metadata['parents'] = [folder_id]
            service.files().create(
                body=file_metadata, 
                media_body=media, 
                fields='id'
            ).execute()
            print(f"✅ Uploaded new backup '{filename}' to Drive.")
            
        return True
    except Exception as e:
        print(f"❌ Upload File error: {e}")
        return False

def get_gmail_service(user, scopes=None):
    """
    Returns an authenticated Gmail API service for the given User.
    """
    if not user.google_refresh_token:
        # print(f"⚠️ User {user.email} has no refresh token.")
        return None

    if scopes is None:
        scopes = GMAIL_MODIFY_SCOPES

    try:
        creds = Credentials(
            token=None,
            refresh_token=user.google_refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=os.getenv('GOOGLE_WEB_CLIENT_ID'),
            client_secret=os.getenv('GOOGLE_CLIENT_SECRET'),
            scopes=scopes
        )

        creds.refresh(Request())
        service = build('gmail', 'v1', credentials=creds)
        return service

    except Exception as e:
        print(f"❌ Failed to build Gmail service: {e}")
        return None

def create_message(sender, to, subject, message_text, message_html=None):
    """Create a message for an email."""
    message = MIMEMultipart('alternative')
    message['to'] = to
    message['from'] = sender
    message['subject'] = subject

    part1 = MIMEText(message_text, 'plain')
    message.attach(part1)

    if message_html:
        part2 = MIMEText(message_html, 'html')
        message.attach(part2)

    return {'raw': base64.urlsafe_b64encode(message.as_bytes()).decode()}

def send_gmail_message(service, user_id, message):
    """Send an email message."""
    try:
        message = (service.users().messages().send(userId=user_id, body=message)
                   .execute())
        # print('Message Id: %s' % message['id'])
        return message
    except Exception as error:
        print(f'❌ An error occurred sending email: {error}')
        return None

def list_gmail_messages(service, query=''):
    """List all Messages of the user's mailbox matching the query."""
    try:
        response = service.users().messages().list(userId='me', q=query).execute()
        messages = []
        if 'messages' in response:
            messages.extend(response['messages'])

        while 'nextPageToken' in response:
            page_token = response['nextPageToken']
            response = service.users().messages().list(userId='me', q=query, pageToken=page_token).execute()
            messages.extend(response['messages'])

        return messages
    except Exception as error:
        print(f'❌ An error occurred listing emails: {error}')
        return []

def delete_gmail_messages(service, message_ids):
    """Batch delete messages by IDs."""
    if not message_ids:
        return True
    try:
        # Gmail API batchDelete has a limit of 1000 messages
        for i in range(0, len(message_ids), 1000):
            batch = message_ids[i:i+1000]
            service.users().messages().batchDelete(
                userId='me',
                body={'ids': batch}
            ).execute()
        return True
    except Exception as error:
        print(f'❌ An error occurred deleting emails: {error}')
        return False

def list_drive_files_in_folder(service, folder_id):
    """Lists all files in a specific Drive folder."""
    query = f"'{folder_id}' in parents and trashed=false"
    try:
        results = service.files().list(q=query, fields='files(id, name)').execute()
        return results.get('files', [])
    except Exception as e:
        print(f"❌ List Drive files error: {e}")
        return []

def delete_drive_file(service, file_id):
    """Deletes a file from Drive."""
    try:
        service.files().delete(fileId=file_id).execute()
        return True
    except Exception as e:
        print(f"❌ Delete Drive file error: {e}")
        return False

def get_gmail_message(service, message_id):
    """Retrieves a specific message by ID."""
    try:
        return service.users().messages().get(userId='me', id=message_id).execute()
    except Exception as e:
        print(f"❌ Get Gmail message error: {e}")
        return None

def get_gmail_attachment(service, message_id, attachment_id):
    """Retrieves an attachment by ID."""
    try:
        attachment = service.users().messages().attachments().get(
            userId='me', messageId=message_id, id=attachment_id
        ).execute()
        import base64
        return base64.urlsafe_b64decode(attachment['data'])
    except Exception as e:
        print(f"❌ Get Gmail attachment error: {e}")
        return None
