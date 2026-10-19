import requests
import datetime
import hashlib
import time

BASE_URL = "http://localhost:3000"
TIMEOUT = 30
PAYU_API_KEY = "4Vj8eK4rloUd272L48hsrarnUA"
PAYU_MERCHANT_ID = "508029"


def test_reservation_creation_with_date_conflict():
    reservation_id = None
    second_reservation_id = None

    # Prepare base date: start trying from tomorrow
    today = datetime.date.today()

    max_attempts = 30
    created = False
    referencia = None
    total_cop = None
    created_check_in = None
    created_check_out = None

    expected_conflict_error = {"error": "La habitación ya tiene una reserva confirmada en esas fechas"}

    for attempt in range(max_attempts):
        # Try progressively later dates if initial ones are blocked
        check_in = today + datetime.timedelta(days=1 + attempt)
        check_out = check_in + datetime.timedelta(days=1)

        payload = {
            "roomSlug": "estandar",
            "checkIn": check_in.isoformat(),
            "checkOut": check_out.isoformat(),
            "nombre": "Test Guest",
            "email": "guest@example.com",
            "celular": "3123456789",
            "huespedes": 2
        }

        resp = requests.post(
            f"{BASE_URL}/api/reservations",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=TIMEOUT,
        )

        if resp.status_code == 201:
            resp_json = resp.json()
            reservation_id = resp_json.get("id") or resp_json.get("cuid") or resp_json.get("reservationId") or resp_json.get("reservaId")
            referencia = resp_json.get("referencia")
            total_cop = resp_json.get("totalCop")
            created = True
            created_check_in = check_in
            created_check_out = check_out
            break
        elif resp.status_code == 409:
            # If conflict, ensure it's the expected conflict error and try next dates
            try:
                resp_json = resp.json()
            except ValueError:
                raise AssertionError(f"Expected JSON body for 409 response, got: {resp.text}")
            assert resp_json == expected_conflict_error, f"Got 409 with unexpected body: {resp_json}"
            # try next dates
            continue
        else:
            raise AssertionError(f"Expected 201 creating reservation or 409 to retry, got {resp.status_code}, body: {resp.text}")

    assert created, f"Could not create an initial reservation after {max_attempts} attempts; last response status: {resp.status_code}, body: {resp.text}"

    try:
        assert referencia, f"Reservation response missing 'referencia': {resp_json}"
        assert total_cop is not None, f"Reservation response missing 'totalCop': {resp_json}"

        # Ensure numeric total_cop
        try:
            total_cop_val = float(total_cop)
        except Exception:
            total_cop_val = float(int(total_cop))

        # 2) Call PayU webhook to set the reservation to CONFIRMADA (state_pol = 4)
        # Build value string and sign according to PRD rules
        value_str = f"{total_cop_val:.2f}"  # e.g., "180000.00"
        if value_str.endswith(".00"):
            new_value = value_str[:-1]  # "180000.0"
        else:
            new_value = value_str

        state_pol = "4"
        sign_source = f"{PAYU_API_KEY}~{PAYU_MERCHANT_ID}~{referencia}~{new_value}~COP~{state_pol}"
        sign = hashlib.md5(sign_source.encode("utf-8")).hexdigest().lower()

        form_data = {
            "merchant_id": PAYU_MERCHANT_ID,
            "reference_sale": referencia,
            "value": value_str,
            "currency": "COP",
            "state_pol": state_pol,
            "sign": sign,
            "transaction_id": "TX_TEST_12345"
        }

        resp_hook = requests.post(
            f"{BASE_URL}/api/webhooks/payu",
            data=form_data,
            timeout=TIMEOUT,
        )
        assert resp_hook.status_code == 200, f"Expected 200 from PayU webhook, got {resp_hook.status_code}, body: {resp_hook.text}"

        # Optionally wait briefly to allow the system to process the webhook
        time.sleep(0.5)

        # 3) Attempt to create an overlapping reservation for the same room
        overlapping_payload = {
            "roomSlug": "estandar",
            # Overlap: same checkIn/checkOut as the confirmed reservation
            "checkIn": created_check_in.isoformat(),
            "checkOut": created_check_out.isoformat(),
            "nombre": "Other Guest",
            "email": "other@example.com",
            "celular": "3120000000",
            "huespedes": 1
        }

        resp2 = requests.post(
            f"{BASE_URL}/api/reservations",
            json=overlapping_payload,
            headers={"Content-Type": "application/json"},
            timeout=TIMEOUT,
        )

        # Expect 409 conflict with specific error message
        assert resp2.status_code == 409, f"Expected 409 for overlapping confirmed reservation, got {resp2.status_code}, body: {resp2.text}"
        # Response should be JSON with the error message
        try:
            resp2_json = resp2.json()
        except ValueError:
            raise AssertionError(f"Expected JSON body for 409 response, got: {resp2.text}")

        assert resp2_json == expected_conflict_error, f"Expected error {expected_conflict_error}, got {resp2_json}"

    finally:
        # Cleanup: attempt to delete created reservation(s) if possible
        headers = {}
        if reservation_id:
            try:
                requests.delete(f"{BASE_URL}/api/reservations/{reservation_id}", headers=headers, timeout=TIMEOUT)
            except Exception:
                pass
        if second_reservation_id:
            try:
                requests.delete(f"{BASE_URL}/api/reservations/{second_reservation_id}", headers=headers, timeout=TIMEOUT)
            except Exception:
                pass


if __name__ == "__main__":
    test_reservation_creation_with_date_conflict()
    print("TC006 passed")