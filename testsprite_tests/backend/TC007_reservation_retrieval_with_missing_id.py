import requests
import uuid
import sys

BASE_ENDPOINT = "http://localhost:3000"

def test_reservation_retrieval_with_missing_id():
    """
    TC007: Verify that GET /api/reservations/{id} with a non-existent reservation id
    returns HTTP 404 with JSON body {"error":"Reserva no encontrada"}.
    """
    missing_id = "c" + uuid.uuid4().hex[:24]  # generate a CUID-like random id very unlikely to exist
    url = f"{BASE_ENDPOINT}/api/reservations/{missing_id}"
    headers = {"Accept": "application/json"}

    try:
        resp = requests.get(url, headers=headers, timeout=30)
    except requests.RequestException as e:
        print(f"Request to {url} failed: {e}", file=sys.stderr)
        raise

    # Validate status code
    assert resp.status_code == 404, f"Expected status 404 for missing reservation id, got {resp.status_code}. Response text: {resp.text}"

    # Validate JSON body
    try:
        body = resp.json()
    except ValueError:
        raise AssertionError(f"Response is not valid JSON. Status: {resp.status_code}. Body: {resp.text}")

    expected = {"error": "Reserva no encontrada"}
    assert body == expected, f"Expected JSON {expected}, got {body}"

    print("TC007 passed: missing reservation id returns 404 with expected error message.")

if __name__ == "__main__":
    test_reservation_retrieval_with_missing_id()