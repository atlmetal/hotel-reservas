import requests
import uuid
import hashlib
import sys

BASE_URL = "http://localhost:3000"
TIMEOUT = 30

def test_payu_confirmation_webhook_unknown_reference_sale():
    """
    TC010: payu_confirmation_webhook_unknown_reference_sale
    Verify that POST /api/webhooks/payu with a reference_sale that does not match any reservation
    returns HTTP 404 with text 'Reserva no encontrada'.
    """
    merchant_id = "508029"
    # Use a reference unlikely to exist
    reference_sale = f"NONEXISTENT-{uuid.uuid4().hex.upper()}"
    value = "180000.00"
    # Per PRD, new_value should drop one decimal when second decimal is zero
    new_value = value
    if value.endswith(".00"):
        new_value = value[:-1]  # "180000.00" -> "180000.0"
    currency = "COP"
    state_pol = "4"
    transaction_id = f"tx-{uuid.uuid4().hex}"

    # Compute valid sign to avoid a 403 due to signature mismatch; this keeps the test focused on 404 case
    api_key = "4Vj8eK4rloUd272L48hsrarnUA"
    sign_payload = f"{api_key}~{merchant_id}~{reference_sale}~{new_value}~{currency}~{state_pol}"
    sign = hashlib.md5(sign_payload.encode("utf-8")).hexdigest().lower()

    url = f"{BASE_URL}/api/webhooks/payu"
    headers = {
        "Accept": "text/plain, */*"
    }
    data = {
        "merchant_id": merchant_id,
        "reference_sale": reference_sale,
        "value": value,
        "currency": currency,
        "state_pol": state_pol,
        "sign": sign,
        "transaction_id": transaction_id
    }

    try:
        resp = requests.post(url, data=data, headers=headers, timeout=TIMEOUT)
    except requests.exceptions.RequestException as e:
        raise AssertionError(f"HTTP request to {url} failed: {e}")

    # Assert status code is 404
    assert resp.status_code == 404, f"Expected status 404, got {resp.status_code}. Response body: {resp.text!r}"

    # Accept either plain text "Reserva no encontrada" or JSON {"error":"Reserva no encontrada"}
    body_text = resp.text.strip()
    if body_text:
        assert body_text == "Reserva no encontrada", f"Expected response text 'Reserva no encontrada', got {body_text!r}"
    else:
        # Try parsing JSON as fallback
        try:
            body_json = resp.json()
        except ValueError:
            raise AssertionError("Response empty and not valid JSON; expected 'Reserva no encontrada' or JSON error.")
        assert isinstance(body_json, dict), f"Expected JSON object, got: {body_json!r}"
        # Accept either top-level error message or other forms containing the message
        error_val = body_json.get("error") or body_json.get("message") or ""
        assert error_val == "Reserva no encontrada", f"Expected JSON error 'Reserva no encontrada', got {body_json!r}"

if __name__ == "__main__":
    try:
        test_payu_confirmation_webhook_unknown_reference_sale()
    except AssertionError as e:
        print(f"TEST FAILED: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"UNEXPECTED ERROR: {e}")
        sys.exit(2)
    else:
        print("TEST PASSED")