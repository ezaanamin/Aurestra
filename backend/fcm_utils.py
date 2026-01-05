# fcm_utils.py
import firebase_admin
from firebase_admin import credentials, messaging
import os

if not firebase_admin._apps:
    cred = credentials.Certificate(os.getenv("FIREBASE_CRED_PATH"))
    firebase_admin.initialize_app(cred)

def send_push_to_all(title, body, tokens=None):
    if tokens is None:
        try:
            from model import DeviceToken
            # We assume this is called within an app context or we create one
            # If called from a route, context is already there.
            tokens = [t.token for t in DeviceToken.query.all()]
        except Exception as e:
            print(f"⚠️ Could not fetch tokens from DB: {e}")
            tokens = []

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
        except firebase_admin.exceptions.FirebaseError as e:
            print(f"❌ Push failed for token {token}: {e}")
            # If token is invalid or not found, remove it from DB
            if 'registration-token-not-registered' in str(e).lower() or 'invalid-argument' in str(e).lower():
                try:
                    from model import db, DeviceToken
                    DeviceToken.query.filter_by(token=token).delete()
                    db.session.commit()
                    print(f"🗑️ Removed invalid token from DB: {token}")
                except Exception as db_err:
                    print(f"⚠️ Failed to remove token from DB: {db_err}")
        except Exception as e:
            print("❌ Push failed:", token, e)
