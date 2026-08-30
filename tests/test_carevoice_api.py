import os
import io
import requests
import time
from PIL import Image, ImageDraw

def run_integration_tests():
    base_url = "http://127.0.0.1:8000"
    
    print("==================================================")
    # 1. Register User
    print("Testing registration: /api/auth/register...")
    reg_url = f"{base_url}/api/auth/register"
    reg_payload = {
        "username": "testuser_carevoice",
        "email": "test@carevoice.ai",
        "password": "secure_password_99"
    }
    # Clear existing if any
    resp = requests.post(reg_url, json=reg_payload)
    if resp.status_code == 400:
        # Username already exists, try logging in
        print("Registration returned 400 (user exists). Logging in...")
    else:
        assert resp.status_code == 200
        data = resp.json()
        assert "token" in data
        print("Registration successful!")

    # 2. Login User
    print("\nTesting login: /api/auth/login...")
    login_url = f"{base_url}/api/auth/login"
    login_payload = {
        "username": "testuser_carevoice",
        "password": "secure_password_99"
    }
    resp = requests.post(login_url, json=login_payload)
    assert resp.status_code == 200
    data = resp.json()
    token = data["token"]
    assert token is not None
    print("Login successful! Token acquired.")
    
    headers = {"Authorization": f"Bearer {token}"}

    # 3. Get User profile
    print("\nTesting profile retrieval: /api/users/me...")
    profile_url = f"{base_url}/api/users/me"
    resp = requests.get(profile_url, headers=headers)
    assert resp.status_code == 200
    p_data = resp.json()
    assert p_data["username"] == "testuser_carevoice"
    print(f"Profile verified. Username: {p_data['username']}")

    # 4. Create Medicine
    print("\nTesting database CRUD: POST /api/medicines...")
    med_url = f"{base_url}/api/medicines"
    med_payload = {
        "name": "Symptom Suppressor",
        "dosage": "1 capsule daily",
        "schedule_time": "09:00 AM"
    }
    resp = requests.post(med_url, json=med_payload, headers=headers)
    assert resp.status_code == 200
    med_data = resp.json()
    med_id = med_data["id"]
    print(f"Medicine registered successfully! ID: {med_id}")

    # 5. List Medicines
    print("Testing GET /api/medicines...")
    resp = requests.get(med_url, headers=headers)
    assert resp.status_code == 200
    med_list = resp.json()
    assert len(med_list) >= 1
    assert any(m["name"] == "Symptom Suppressor" for m in med_list)
    print(f"Medicines list contains the registered medicine: {[m['name'] for m in med_list]}")

    # 6. Create Reminder
    print("\nTesting POST /api/reminders...")
    rem_url = f"{base_url}/api/reminders"
    rem_payload = {
        "medicine_id": med_id,
        "reminder_time": "09:00 AM",
        "status": "Pending"
    }
    resp = requests.post(rem_url, json=rem_payload, headers=headers)
    assert resp.status_code == 200
    rem_data = resp.json()
    print(f"Reminder registered successfully! ID: {rem_data['id']}")

    # 7. List Reminders
    print("Testing GET /api/reminders...")
    resp = requests.get(rem_url, headers=headers)
    assert resp.status_code == 200
    rem_list = resp.json()
    assert len(rem_list) >= 1
    print(f"Reminders list retrieved successfully: {[r['name'] for r in rem_list]}")

    # 8. Chatbot AI Symptom Analysis
    print("\nTesting chatbot symptom analyzer: /api/assistant/chat...")
    chat_url = f"{base_url}/api/assistant/chat"
    chat_payload = {
        "text": "I have red acne and pimples on my skin."
    }
    resp = requests.post(chat_url, json=chat_payload, headers=headers)
    assert resp.status_code == 200
    chat_data = resp.json()
    assert chat_data["intent"] == "symptom_inquiry"
    print(f"Chatbot intent correctly identified: {chat_data['intent']}")
    print(f"Chatbot response: {chat_data['response']}")

    # 9. Voice Speech Synthesis
    print("\nTesting speech synthesizer: /api/assistant/speak...")
    speak_url = f"{base_url}/api/assistant/speak"
    speak_payload = {
        "text": chat_data["response"]
    }
    resp = requests.post(speak_url, json=speak_payload)
    assert resp.status_code == 200
    speak_data = resp.json()
    assert "audio_base64" in speak_data
    print("TTS conversion returned base64 audio successfully!")

    # 10. Voice Audio Transcription
    print("\nTesting voice transcription: /api/voice/transcribe...")
    transcribe_url = f"{base_url}/api/voice/transcribe"
    dummy_wav = io.BytesIO(b"RIFF....WAVEfmt...")
    resp = requests.post(
        transcribe_url,
        files={"file": ("speech.wav", dummy_wav, "audio/wav")},
        headers=headers
    )
    assert resp.status_code == 200
    trans_data = resp.json()
    assert "transcript" in trans_data
    print(f"Mock Audio speech successfully transcribed: '{trans_data['transcript']}'")

    # 11. Location Nearby Clinics
    print("\nTesting Location API: GET /api/location/nearby...")
    loc_url = f"{base_url}/api/location/nearby?lat=12.9716&lon=77.5946"
    resp = requests.get(loc_url, headers=headers)
    assert resp.status_code == 200
    loc_data = resp.json()
    assert len(loc_data) >= 1
    print(f"Nearby locations found: {len(loc_data)}")

    # 12. Trigger Emergency SOS
    print("\nTesting Emergency Alert trigger: POST /api/emergency...")
    em_url = f"{base_url}/api/emergency"
    em_payload = {
        "lat": 12.9716,
        "lon": 77.5946
    }
    resp = requests.post(em_url, json=em_payload, headers=headers)
    assert resp.status_code == 200
    em_data = resp.json()
    assert em_data["status"] == "success"
    print(f"Emergency dispatch response message: {em_data['message']}")

    # 13. Health Check
    print("\nTesting backend API health check: /api/health...")
    health_resp = requests.get(f"{base_url}/api/health")
    assert health_resp.status_code == 200
    print("Health check completed successfully!")
    print("==================================================")
    print("   ALL CAREVOICE BACKEND SERVICES VERIFIED!       ")
    print("==================================================")

if __name__ == "__main__":
    run_integration_tests()
