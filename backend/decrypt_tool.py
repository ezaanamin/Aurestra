import sys
import os
import argparse
import getpass
from cryptography.fernet import Fernet

def decrypt_file(file_path, key_input=None):
    # 1. Determine Key
    key = None
    
    if key_input:
        key = key_input.encode() if isinstance(key_input, str) else key_input
    else:
        # Try loading from file
        script_dir = os.path.dirname(os.path.abspath(__file__))
        key_path = os.path.join(script_dir, 'encryption_key.key')
        
        if os.path.exists(key_path):
             with open(key_path, 'rb') as kf:
                key = kf.read()
             print(f"🔑 Using key from file: {key_path}")
        else:
             print("⚠️ Key file not found.")
             # Prompt user
             try:
                 key_str = getpass.getpass("🔑 Please enter the decryption key (hidden input): ")
                 if not key_str:
                     print("❌ No key provided.")
                     return
                 key = key_str.strip().encode()
             except Exception as e:
                 print(f"❌ Error reading input: {e}")
                 return

    try:
        cipher = Fernet(key)
    except Exception as e:
         print(f"❌ Invalid Key format: {e}")
         return
    
    # 2. Decrypt
    try:
        if not os.path.exists(file_path):
            print(f"❌ File not found: {file_path}")
            return

        with open(file_path, 'rb') as f:
            encrypted_data = f.read()
            
        decrypted_data = cipher.decrypt(encrypted_data)
        
        # Save as .json (removing .enc if present, or just appending .json)
        if file_path.endswith(".enc"):
             output_path = file_path[:-4] + ".json"
        elif file_path.endswith(".json"):
             output_path = file_path.replace(".json", "_decrypted.json")
        else:
             output_path = file_path + ".decrypted.json"

        with open(output_path, 'wb') as df:
            df.write(decrypted_data)
            
        print(f"✅ Decrypted successfully! Saved to: {output_path}")
        print("Preview of content:")
        try:
             print(decrypted_data.decode('utf-8')[:500] + "...")
        except:
             print("(Binary content)")
        
    except Exception as e:
        print(f"❌ Decryption failed: {e}")
        print("Ensure you are using the correct key and the file is actually encrypted.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Decrypt Aurestra backup files.")
    parser.add_argument("file", help="Path to the encrypted file")
    parser.add_argument("--key", help="The decryption key (optional, will prompt or check file if missing)", default=None)
    
    args = parser.parse_args()
    
    decrypt_file(args.file, args.key)
