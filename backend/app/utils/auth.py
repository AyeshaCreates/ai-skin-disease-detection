import os
import hmac
import base64
import json
import hashlib
from datetime import datetime, timedelta

SECRET_KEY = os.getenv("JWT_SECRET", "carevoice_secret_998877")
SALT = "carevoice_super_salt_123"

def hash_password(password: str) -> str:
    return hashlib.sha256((password + SALT).encode('utf-8')).hexdigest()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return hash_password(plain_password) == hashed_password

def create_access_token(user_id: int, expires_delta_hours: int = 24) -> str:
    expiry = datetime.utcnow() + timedelta(hours=expires_delta_hours)
    payload = {
        "user_id": user_id,
        "exp": expiry.timestamp()
    }
    payload_json = json.dumps(payload)
    payload_b64 = base64.urlsafe_b64encode(payload_json.encode('utf-8')).decode('utf-8')
    sig = hmac.new(SECRET_KEY.encode('utf-8'), payload_b64.encode('utf-8'), hashlib.sha256).hexdigest()
    return f"{payload_b64}.{sig}"

def verify_access_token(token: str) -> int:
    try:
        parts = token.split(".")
        if len(parts) != 2:
            return None
        payload_b64, sig = parts
        expected_sig = hmac.new(SECRET_KEY.encode('utf-8'), payload_b64.encode('utf-8'), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(sig, expected_sig):
            return None
        payload_bytes = base64.urlsafe_b64decode(payload_b64.encode('utf-8'))
        payload = json.loads(payload_bytes.decode('utf-8'))
        if datetime.utcnow().timestamp() > payload.get("exp", 0):
            return None # Expired
        return int(payload.get("user_id"))
    except Exception:
        return None
