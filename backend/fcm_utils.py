# fcm_utils.py
import firebase_admin
from firebase_admin import credentials, messaging
import os

if not firebase_admin._apps:
    cred = credentials.Certificate(os.getenv("FIREBASE_CRED_PATH"))
    firebase_admin.initialize_app(cred)

def send_push_to_all(title, body, tokens):
    if not tokens:
        print("⚠️ No device tokens registered. No push sent.")
        return
    for token in tokens:
        try:
            messaging.send(messaging.Message(
                notification=messaging.Notification(title=title, body=body),
                token=token
            ))
            print("✅ Push sent:", token)
        except Exception as e:
            print("❌ Push failed:", token, e)
