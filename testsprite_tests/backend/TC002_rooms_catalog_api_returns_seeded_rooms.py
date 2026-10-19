import requests
import sys

BASE_URL = "http://localhost:3000"
TIMEOUT = 30

def test_rooms_catalog_api_returns_seeded_rooms():
    url = f"{BASE_URL}/api/rooms"
    try:
        resp = requests.get(url, timeout=TIMEOUT)
    except requests.exceptions.RequestException as e:
        raise AssertionError(f"HTTP request to {url} failed: {e}")

    assert resp.status_code == 200, f"Expected status 200, got {resp.status_code}. Body: {resp.text}"

    try:
        data = resp.json()
    except ValueError:
        raise AssertionError(f"Response is not valid JSON. Body: {resp.text}")

    assert isinstance(data, list), f"Expected JSON array, got {type(data)}"

    assert len(data) == 3, f"Expected 3 seeded rooms, got {len(data)}. Rooms: {data}"

    required_keys = {"id", "slug", "nombre", "descripcion", "capacidad", "tarifaNocheCop"}
    expected_rooms = {
        "estandar": {"capacidad": 2, "tarifa": 180000},
        "superior": {"capacidad": 3, "tarifa": 250000},
        "suite-aurora": {"capacidad": 4, "tarifa": 420000},
    }

    found_slugs = set()
    for room in data:
        assert isinstance(room, dict), f"Each room must be an object, got {type(room)}: {room}"
        missing = required_keys - set(room.keys())
        assert not missing, f"Room missing required keys {missing}: {room}"

        # Validate id: accept positive int or non-empty string
        rid = room.get("id")
        assert (isinstance(rid, int) and rid > 0) or (isinstance(rid, str) and rid.strip() != ""), f"Room id must be a positive integer or non-empty string: {room}"

        # Validate slug
        slug = room.get("slug")
        assert isinstance(slug, str) and slug.strip() != "", f"Room slug must be non-empty string: {room}"
        found_slugs.add(slug)

        # Validate nombre and descripcion are strings
        assert isinstance(room.get("nombre"), str), f"nombre must be a string: {room}"
        assert isinstance(room.get("descripcion"), str), f"descripcion must be a string: {room}"

        # Validate capacidad is an integer >=1
        capacidad = room.get("capacidad")
        assert isinstance(capacidad, int) and capacidad >= 1, f"capacidad must be integer >=1: {room}"

        # Validate tarifaNocheCop is numeric (int/float or numeric string)
        tarifa_val = room.get("tarifaNocheCop")
        # normalize tarifa to int for comparison
        try:
            if isinstance(tarifa_val, str):
                tarifa_num = int(float(tarifa_val))
            elif isinstance(tarifa_val, (int, float)):
                tarifa_num = int(tarifa_val)
            else:
                raise TypeError()
        except Exception:
            raise AssertionError(f"tarifaNocheCop must be numeric or numeric string: {room}")

        # If slug is one of expected, validate capacidad and tarifa match PRD
        if slug in expected_rooms:
            exp = expected_rooms[slug]
            assert capacidad == exp["capacidad"], f"For slug {slug} expected capacidad {exp['capacidad']}, got {capacidad}"
            assert tarifa_num == exp["tarifa"], f"For slug {slug} expected tarifaNocheCop {exp['tarifa']}, got {tarifa_num}"

    # Ensure all expected slugs are present
    missing_slugs = set(expected_rooms.keys()) - found_slugs
    assert not missing_slugs, f"Missing expected room slugs: {missing_slugs}. Found: {found_slugs}"

if __name__ == "__main__":
    try:
        test_rooms_catalog_api_returns_seeded_rooms()
        print("TC002 passed")
    except AssertionError as e:
        print(f"TC002 failed: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"TC002 encountered an unexpected error: {e}")
        sys.exit(2)
