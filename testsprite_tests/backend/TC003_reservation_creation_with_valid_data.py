import requests
import datetime
import re
import sys
import traceback

BASE_URL = "http://localhost:3000"
TIMEOUT = 30

def test_reservation_creation_with_valid_data():
    # Prepare dates: checkIn = tomorrow, checkOut = day after tomorrow
    today = datetime.date.today()
    check_in_date = today + datetime.timedelta(days=1)
    check_out_date = today + datetime.timedelta(days=2)
    check_in = check_in_date.strftime("%Y-%m-%d")
    check_out = check_out_date.strftime("%Y-%m-%d")
    noches_expected = (check_out_date - check_in_date).days

    room_slug = "estandar"  # seeded rooms: estandar, superior, suite-aurora
    nightly_rates = {
        "estandar": 180000,
        "superior": 250000,
        "suite-aurora": 420000
    }
    tarifa_noche = nightly_rates[room_slug]
    total_cop_expected = noches_expected * tarifa_noche

    payload = {
        "roomSlug": room_slug,
        "checkIn": check_in,
        "checkOut": check_out,
        "nombre": "Juan Perez",
        "email": "juan.perez@example.com",
        "celular": "3001234567",
        "huespedes": 2
    }

    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json"
    }

    reservation_id = None

    try:
        # Create reservation
        url = f"{BASE_URL}/api/reservations"
        resp = requests.post(url, json=payload, headers=headers, timeout=TIMEOUT)
        # Validate status code
        assert resp.status_code == 201, f"Expected 201 Created, got {resp.status_code}: {resp.text}"

        try:
            created = resp.json()
        except ValueError:
            raise AssertionError(f"Response is not valid JSON: {resp.text}")

        # Extract reservation id (cuid or id)
        reservation_id = created.get("id") or created.get("cuid") or created.get("_id")
        assert reservation_id, f"Created reservation missing id field. Response JSON: {created}"

        # Validate estado
        estado = created.get("estado") or created.get("status")
        assert estado == "PENDIENTE_PAGO", f"Expected estado 'PENDIENTE_PAGO', got {estado}"

        # Validate noches
        noches = created.get("noches")
        assert isinstance(noches, int), f"Expected noches to be int, got {type(noches)}"
        assert noches == noches_expected, f"Expected noches {noches_expected}, got {noches}"

        # Validate totalCop
        totalCop = created.get("totalCop")
        assert isinstance(totalCop, int) or isinstance(totalCop, float), f"totalCop should be numeric, got {type(totalCop)}"
        assert int(totalCop) == int(total_cop_expected), f"Expected totalCop {total_cop_expected}, got {totalCop}"

        # Validate referencia pattern AUR-YYYYMMDD-XXXXXX
        referencia = created.get("referencia") or created.get("reference") or created.get("reference_sale")
        assert referencia, f"Expected referencia in response, none found. Response: {created}"
        if isinstance(referencia, str):
            assert re.match(r"^AUR-\d{8}-[A-Z0-9]{6}$", referencia), f"Referencia '{referencia}' does not match expected pattern AUR-YYYYMMDD-XXXXXX"
        else:
            raise AssertionError(f"Referencia is not a string: {referencia}")

        # GET the reservation by id and validate stored data including room details
        get_url = f"{BASE_URL}/api/reservations/{reservation_id}"
        get_resp = requests.get(get_url, headers={"Accept": "application/json"}, timeout=TIMEOUT)
        assert get_resp.status_code == 200, f"Expected 200 OK from GET reservation, got {get_resp.status_code}: {get_resp.text}"

        try:
            fetched = get_resp.json()
        except ValueError:
            raise AssertionError(f"GET /api/reservations/{reservation_id} did not return valid JSON: {get_resp.text}")

        # Ensure the fetched reservation matches key fields
        fetched_id = fetched.get("id") or fetched.get("cuid") or fetched.get("_id")
        assert fetched_id == reservation_id, f"Fetched reservation id {fetched_id} does not match created id {reservation_id}"

        # Check room details are included and correct
        room = fetched.get("room") or fetched.get("habitacion") or fetched.get("roomDetails")
        assert room, f"Expected room details in fetched reservation, none found. Fetched: {fetched}"

        # Validate room slug and nightly rate if available
        room_slug_fetched = room.get("slug") or room.get("roomSlug")
        if room_slug_fetched:
            assert room_slug_fetched == room_slug, f"Expected room slug '{room_slug}', got '{room_slug_fetched}'"
        tarifa_fetched = room.get("tarifaNocheCop") or room.get("tarifa_noche_cop") or room.get("tarifa")
        if tarifa_fetched is not None:
            # allow numeric strings as well
            try:
                tarifa_val = int(tarifa_fetched)
            except Exception:
                tarifa_val = None
            assert tarifa_val == tarifa_noche, f"Expected tarifaNocheCop {tarifa_noche}, got {tarifa_fetched}"

        print("TC003 passed: reservation created and retrieved successfully with expected fields.")

    except AssertionError:
        traceback.print_exc()
        raise
    except Exception:
        traceback.print_exc()
        raise
    finally:
        # Attempt to delete the created reservation if possible to clean up.
        if reservation_id:
            try:
                del_url = f"{BASE_URL}/api/reservations/{reservation_id}"
                del_resp = requests.delete(del_url, timeout=TIMEOUT)
                # Accept 200, 204, 404 (already gone) or 405 (method not allowed) as non-fatal
                if del_resp.status_code not in (200, 204, 404, 405):
                    print(f"Warning: DELETE returned unexpected status {del_resp.status_code}: {del_resp.text}", file=sys.stderr)
            except Exception as e:
                print(f"Warning: Exception when attempting to delete reservation {reservation_id}: {e}", file=sys.stderr)


if __name__ == "__main__":
    test_reservation_creation_with_valid_data()