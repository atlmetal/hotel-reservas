import requests
import uuid
import hashlib
from decimal import Decimal
from datetime import date, timedelta
import sys

BASE_URL = "http://localhost:3000"
TIMEOUT = 30
PAYU_API_KEY = "4Vj8eK4rloUd272L48hsrarnUA"
PAYU_MERCHANT_ID = "508029"


def test_payu_confirmation_webhook_valid_request():
    # Try creating a reservation on several different future date offsets to avoid conflicts
    reservation_id = None
    created = None
    last_resp = None

    for attempt in range(1, 31):
        check_in = (date.today() + timedelta(days=attempt + 1)).isoformat()
        check_out = (date.today() + timedelta(days=attempt + 2)).isoformat()
        reservation_payload = {
            "roomSlug": "estandar",
            "checkIn": check_in,
            "checkOut": check_out,
            "nombre": "Test Usuario",
            "email": "testuser@example.com",
            "celular": "3001234567",
            "huespedes": 1
        }

        try:
            resp = requests.post(
                f"{BASE_URL}/api/reservations",
                json=reservation_payload,
                timeout=TIMEOUT
            )
        except requests.RequestException as e:
            raise AssertionError(f"Failed to create reservation: {e}")

        last_resp = resp
        if resp.status_code == 201:
            created = resp.json()
            break
        elif resp.status_code == 409:
            # Try another date offset to avoid overlapping confirmed reservations
            continue
        else:
            raise AssertionError(f"Expected 201 creating reservation, got {resp.status_code}, body: {resp.text}")

    assert created is not None, f"Could not create reservation after multiple attempts, last response: {last_resp.status_code} {last_resp.text}"

    # Extract id
    reservation_id = created.get("id") or created.get("cuid") or created.get("reservationId")
    assert reservation_id, f"Created reservation response missing id: {created}"
    referencia = created.get("referencia")
    assert referencia, f"Created reservation response missing referencia: {created}"
    totalCop_val = created.get("totalCop")
    assert totalCop_val is not None, f"Created reservation response missing totalCop: {created}"

    # Ensure value formatted with two decimals for the webhook 'value' field
    totalCop_dec = Decimal(str(totalCop_val))
    value_field = f"{totalCop_dec:.2f}"

    # Helper to compute PayU sign
    def compute_sign(merchant_id, reference_sale, new_value, currency, state_pol):
        sign_source = f"{PAYU_API_KEY}~{merchant_id}~{reference_sale}~{new_value}~{currency}~{state_pol}"
        m = hashlib.md5()
        m.update(sign_source.encode("utf-8"))
        return m.hexdigest().lower()

    # Helper to derive new_value per PRD: one decimal if second decimal is zero
    def compute_new_value_from_value(value_str):
        # value_str is like "180000.00" or "150.25"
        if value_str.endswith(".00"):
            return value_str[:-1]  # "180000.0"
        return value_str

    # Test state_pol = 4 -> CONFIRMADA
    state_pol = "4"
    transaction_id_1 = str(uuid.uuid4())
    new_value = compute_new_value_from_value(value_field)
    sign_1 = compute_sign(PAYU_MERCHANT_ID, referencia, new_value, "COP", state_pol)
    form1 = {
        "merchant_id": PAYU_MERCHANT_ID,
        "reference_sale": referencia,
        "value": value_field,
        "currency": "COP",
        "state_pol": state_pol,
        "sign": sign_1,
        "transaction_id": transaction_id_1
    }

    try:
        resp_webhook_1 = requests.post(
            f"{BASE_URL}/api/webhooks/payu",
            data=form1,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            timeout=TIMEOUT
        )
    except requests.RequestException as e:
        raise AssertionError(f"Failed to call PayU webhook (state 4): {e}")

    assert resp_webhook_1.status_code == 200, f"Expected 200 from webhook for state 4, got {resp_webhook_1.status_code}, body: {resp_webhook_1.text}"

    # Fetch reservation and validate transaction id and status
    try:
        resp_get_1 = requests.get(f"{BASE_URL}/api/reservations/{reservation_id}", timeout=TIMEOUT)
    except requests.RequestException as e:
        raise AssertionError(f"Failed to GET reservation after webhook (state 4): {e}")

    assert resp_get_1.status_code == 200, f"Expected 200 getting reservation after webhook (state 4), got {resp_get_1.status_code}, body: {resp_get_1.text}"
    res_after_1 = resp_get_1.json()

    # Validate payuTransactionId and status (estado)
    assert res_after_1.get("payuTransactionId") == transaction_id_1, f"payuTransactionId not updated (state 4): {res_after_1}"
    estado_after_1 = res_after_1.get("estado") or res_after_1.get("status")
    assert estado_after_1 == "CONFIRMADA", f"Expected estado CONFIRMADA after state_pol=4, got {estado_after_1}"

    # Test state_pol = 5 -> PAGO_RECHAZADO (send another webhook updating transaction and status)
    state_pol = "5"
    transaction_id_2 = str(uuid.uuid4())
    new_value2 = compute_new_value_from_value(value_field)
    sign_2 = compute_sign(PAYU_MERCHANT_ID, referencia, new_value2, "COP", state_pol)
    form2 = {
        "merchant_id": PAYU_MERCHANT_ID,
        "reference_sale": referencia,
        "value": value_field,
        "currency": "COP",
        "state_pol": state_pol,
        "sign": sign_2,
        "transaction_id": transaction_id_2
    }

    try:
        resp_webhook_2 = requests.post(
            f"{BASE_URL}/api/webhooks/payu",
            data=form2,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            timeout=TIMEOUT
        )
    except requests.RequestException as e:
        raise AssertionError(f"Failed to call PayU webhook (state 5): {e}")

    assert resp_webhook_2.status_code == 200, f"Expected 200 from webhook for state 5, got {resp_webhook_2.status_code}, body: {resp_webhook_2.text}"

    # Fetch reservation and validate transaction id and status changed to PAGO_RECHAZADO
    try:
        resp_get_2 = requests.get(f"{BASE_URL}/api/reservations/{reservation_id}", timeout=TIMEOUT)
    except requests.RequestException as e:
        raise AssertionError(f"Failed to GET reservation after webhook (state 5): {e}")

    assert resp_get_2.status_code == 200, f"Expected 200 getting reservation after webhook (state 5), got {resp_get_2.status_code}, body: {resp_get_2.text}"
    res_after_2 = resp_get_2.json()

    assert res_after_2.get("payuTransactionId") == transaction_id_2, f"payuTransactionId not updated (state 5): {res_after_2}"
    estado_after_2 = res_after_2.get("estado") or res_after_2.get("status")
    assert estado_after_2 == "PAGO_RECHAZADO", f"Expected estado PAGO_RECHAZADO after state_pol=5, got {estado_after_2}"

    print("TC008 passed: webhook valid requests updated transaction_id and estado correctly for states 4 and 5.")

    # Cleanup: Attempt to delete the created reservation to clean up, if the API supports it.
    if reservation_id:
        try:
            requests.delete(f"{BASE_URL}/api/reservations/{reservation_id}", timeout=TIMEOUT)
        except requests.RequestException:
            # Ignore cleanup errors
            pass


if __name__ == "__main__":
    try:
        test_payu_confirmation_webhook_valid_request()
    except AssertionError as e:
        print(f"Test failed: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"Unexpected error: {e}")
        sys.exit(2)
    else:
        sys.exit(0)