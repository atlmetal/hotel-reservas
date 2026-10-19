import requests
import datetime
import sys

BASE_URL = "http://localhost:3000"
RESERVATIONS_PATH = "/api/reservations"
TIMEOUT = 30
HEADERS = {"Content-Type": "application/json"}


def _assert_error_field_present(errors_dict, expected_substrings):
    if not isinstance(errors_dict, dict):
        raise AssertionError(f"errors is not a dict: {errors_dict}")
    keys_lower = [k.lower() for k in errors_dict.keys()]
    for sub in expected_substrings:
        for k in keys_lower:
            if sub in k:
                return
    raise AssertionError(f"No error field found containing any of {expected_substrings}. Actual keys: {list(errors_dict.keys())}")


def test_reservation_creation_with_invalid_fields():
    url = BASE_URL + RESERVATIONS_PATH

    # Common valid fields to reuse
    valid_nombre = "Test User"
    valid_celular = "3123456789"  # starts with 3 and 10 digits

    # 1) Past check-in date
    payload_past_checkin = {
        "roomSlug": "estandar",
        "checkIn": "2000-01-01",
        "checkOut": "2000-01-05",
        "nombre": valid_nombre,
        "email": "test@example.com",
        "celular": valid_celular,
        "huespedes": 1
    }
    try:
        resp = requests.post(url, json=payload_past_checkin, headers=HEADERS, timeout=TIMEOUT)
    except Exception as e:
        raise AssertionError(f"Request failed for past check-in test: {e}")
    assert resp.status_code == 400, f"Expected 400 for past check-in, got {resp.status_code}. Body: {resp.text}"
    try:
        body = resp.json()
    except ValueError:
        raise AssertionError(f"Response not JSON for past check-in test: {resp.text}")
    assert "errors" in body, f"'errors' key missing in response for past check-in test: {body}"
    _assert_error_field_present(body["errors"], ["check", "checkin"])

    # 2) Invalid email
    today = datetime.date.today()
    checkin = today.strftime("%Y-%m-%d")
    checkout = (today + datetime.timedelta(days=2)).strftime("%Y-%m-%d")
    payload_invalid_email = {
        "roomSlug": "estandar",
        "checkIn": checkin,
        "checkOut": checkout,
        "nombre": valid_nombre,
        "email": "not-an-email",
        "celular": valid_celular,
        "huespedes": 1
    }
    try:
        resp = requests.post(url, json=payload_invalid_email, headers=HEADERS, timeout=TIMEOUT)
    except Exception as e:
        raise AssertionError(f"Request failed for invalid email test: {e}")
    assert resp.status_code == 400, f"Expected 400 for invalid email, got {resp.status_code}. Body: {resp.text}"
    try:
        body = resp.json()
    except ValueError:
        raise AssertionError(f"Response not JSON for invalid email test: {resp.text}")
    assert "errors" in body, f"'errors' key missing in response for invalid email test: {body}"
    _assert_error_field_present(body["errors"], ["email", "correo"])

    # 3) Huespedes exceeding room capacity (estandar capacity is 2)
    payload_exceed_capacity = {
        "roomSlug": "estandar",
        "checkIn": checkin,
        "checkOut": checkout,
        "nombre": valid_nombre,
        "email": "test@example.com",
        "celular": valid_celular,
        "huespedes": 5
    }
    try:
        resp = requests.post(url, json=payload_exceed_capacity, headers=HEADERS, timeout=TIMEOUT)
    except Exception as e:
        raise AssertionError(f"Request failed for huespedes exceeding capacity test: {e}")
    assert resp.status_code == 400, f"Expected 400 for huespedes exceeding capacity, got {resp.status_code}. Body: {resp.text}"
    try:
        body = resp.json()
    except ValueError:
        raise AssertionError(f"Response not JSON for huespedes exceeding capacity test: {resp.text}")
    assert "errors" in body, f"'errors' key missing in response for huespedes exceeding capacity test: {body}"
    _assert_error_field_present(body["errors"], ["huesp", "huesped", "huespedes", "guest", "personas"])

    print("TC004 passed: reservation_creation_with_invalid_fields")


if __name__ == "__main__":
    try:
        test_reservation_creation_with_invalid_fields()
    except AssertionError as e:
        print("TC004 failed:", e)
        sys.exit(1)
    except Exception as ex:
        print("TC004 unexpected error:", ex)
        sys.exit(2)
    sys.exit(0)