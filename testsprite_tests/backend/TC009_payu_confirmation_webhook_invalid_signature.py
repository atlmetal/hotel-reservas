import requests
import datetime
from datetime import timedelta

BASE_URL = "http://localhost:3000"
TIMEOUT = 30

def test_payu_confirmation_webhook_invalid_signature():
    # Helper to safely extract fields with common names
    def get_field(obj, candidates):
        for k in candidates:
            if k in obj:
                return obj[k]
        return None

    # Create a valid reservation to be targeted by the webhook
    # Use dates far in the future to avoid conflicts with existing CONFIRMADA reservations
    check_in = (datetime.datetime.utcnow() + timedelta(days=90)).date().isoformat()
    check_out = (datetime.datetime.utcnow() + timedelta(days=91)).date().isoformat()
    reservation_payload = {
        "roomSlug": "estandar",
        "checkIn": check_in,
        "checkOut": check_out,
        "nombre": "Test User",
        "email": "test@example.com",
        "celular": "3001234567",
        "huespedes": 1
    }

    reservation_id = None
    try:
        try:
            resp = requests.post(f"{BASE_URL}/api/reservations", json=reservation_payload, timeout=TIMEOUT)
        except requests.exceptions.RequestException as e:
            raise AssertionError(f"Failed to create reservation: {e}")

        assert resp.status_code == 201, f"Expected 201 on reservation creation, got {resp.status_code}: {resp.text}"
        reservation = resp.json()
        # Extract id and referencia
        reservation_id = get_field(reservation, ["id", "cuid", "reservationId", "reservation_id"])
        referencia = get_field(reservation, ["referencia", "reference", "reference_sale", "referenceSale"])
        assert reservation_id, f"Reservation response missing id: {reservation}"
        assert referencia, f"Reservation response missing referencia: {reservation}"

        # Fetch reservation to check initial state and transaction absence
        try:
            get_resp = requests.get(f"{BASE_URL}/api/reservations/{reservation_id}", timeout=TIMEOUT)
        except requests.exceptions.RequestException as e:
            raise AssertionError(f"Failed to GET reservation: {e}")

        assert get_resp.status_code == 200, f"Expected 200 when retrieving reservation, got {get_resp.status_code}: {get_resp.text}"
        reservation_get = get_resp.json()
        estado_before = get_field(reservation_get, ["estado", "status", "state"])
        transaction_before = get_field(reservation_get, ["transaction_id", "transactionId", "transaction", "transactionId"])
        # Expect initial state to be PENDIENTE_PAGO per PRD
        assert estado_before == "PENDIENTE_PAGO", f"Expected initial estado 'PENDIENTE_PAGO', got '{estado_before}'"
        assert not transaction_before, f"Expected no transaction before webhook, got '{transaction_before}'"

        # Prepare webhook payload with invalid merchant_id / signature
        webhook_data = {
            "merchant_id": "000000",  # invalid merchant
            "reference_sale": referencia,
            "value": "180000.00",
            "currency": "COP",
            "state_pol": "4",
            "sign": "invalidsign",
            "transaction_id": "tx-invalid-123"
        }

        headers = {
            "Content-Type": "application/x-www-form-urlencoded"
        }

        try:
            wh_resp = requests.post(f"{BASE_URL}/api/webhooks/payu", data=webhook_data, headers=headers, timeout=TIMEOUT)
        except requests.exceptions.RequestException as e:
            raise AssertionError(f"Failed to POST webhook: {e}")

        # Validate webhook response is 403 with exact text 'Firma inválida'
        assert wh_resp.status_code == 403, f"Expected 403 for invalid signature, got {wh_resp.status_code}: {wh_resp.text}"
        assert wh_resp.text.strip() == "Firma inválida", f"Expected response text 'Firma inválida', got '{wh_resp.text.strip()}'"

        # Re-fetch reservation to ensure it was not changed
        try:
            get_resp2 = requests.get(f"{BASE_URL}/api/reservations/{reservation_id}", timeout=TIMEOUT)
        except requests.exceptions.RequestException as e:
            raise AssertionError(f"Failed to GET reservation after webhook: {e}")

        assert get_resp2.status_code == 200, f"Expected 200 when retrieving reservation after webhook, got {get_resp2.status_code}: {get_resp2.text}"
        reservation_after = get_resp2.json()
        estado_after = get_field(reservation_after, ["estado", "status", "state"])
        transaction_after = get_field(reservation_after, ["transaction_id", "transactionId", "transaction", "transactionId"])

        assert estado_after == estado_before, f"Reservation estado changed after invalid webhook: before='{estado_before}' after='{estado_after}'"
        assert transaction_after == transaction_before or not transaction_after, f"Reservation transaction changed after invalid webhook: before='{transaction_before}' after='{transaction_after}'"

        print("TC009 passed: invalid signature webhook returned 403 and did not modify reservation.")

    finally:
        # Attempt to delete the created reservation if possible; ignore errors
        if reservation_id:
            try:
                requests.delete(f"{BASE_URL}/api/reservations/{reservation_id}", timeout=TIMEOUT)
            except requests.exceptions.RequestException:
                pass

if __name__ == "__main__":
    test_payu_confirmation_webhook_invalid_signature()