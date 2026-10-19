import requests
import datetime
import json
import sys

BASE_URL = "http://localhost:3000"
TIMEOUT = 30  # seconds

def test_reservation_creation_with_unknown_roomslug():
    """
    TC005: reservation_creation_with_unknown_roomslug
    Verify that POST /api/reservations with an unknown roomSlug returns HTTP 404
    with error message {"error":"Habitación no encontrada"}.
    """
    url = f"{BASE_URL}/api/reservations"
    # Use dates relative to today to avoid past-date validation issues
    today = datetime.date.today()
    check_in = today + datetime.timedelta(days=1)
    check_out = today + datetime.timedelta(days=2)

    payload = {
        "roomSlug": "unknown-room-slug-xyz",
        "checkIn": check_in.isoformat(),
        "checkOut": check_out.isoformat(),
        "nombre": "Test User",
        "email": "testuser@example.com",
        "celular": "3001234567",
        "huespedes": 2
    }

    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json"
    }

    try:
        resp = requests.post(url, headers=headers, data=json.dumps(payload), timeout=TIMEOUT)
    except requests.exceptions.RequestException as e:
        raise AssertionError(f"Request to {url} failed: {e}")

    # Expect 404 for unknown roomSlug
    if resp.status_code != 404:
        raise AssertionError(f"Expected status 404 but got {resp.status_code}. Response body: {resp.text}")

    # Response should be JSON with the specific error message
    try:
        body = resp.json()
    except ValueError:
        raise AssertionError(f"Expected JSON response but got: {resp.text}")

    expected = {"error": "Habitación no encontrada"}
    assert body == expected, f"Expected JSON {expected} but got {body}"

if __name__ == "__main__":
    try:
        test_reservation_creation_with_unknown_roomslug()
        print("TC005 passed")
    except AssertionError as e:
        print("TC005 failed:", e)
        sys.exit(1)
    except Exception as e:
        print("TC005 encountered an unexpected error:", e)
        sys.exit(2)