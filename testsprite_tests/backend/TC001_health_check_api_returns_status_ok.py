import requests
import sys

BASE_URL = "http://localhost:3000"
TIMEOUT = 30

def test_health_check_api_returns_status_ok():
    url = f"{BASE_URL}/api/health"
    headers = {
        "Accept": "application/json"
    }

    try:
        resp = requests.get(url, headers=headers, timeout=TIMEOUT)
    except requests.exceptions.RequestException as e:
        raise AssertionError(f"Request to {url} failed: {e}")

    # Status code check
    assert resp.status_code == 200, f"Expected status code 200, got {resp.status_code}. Response text: {resp.text}"

    # Content-Type check (if provided)
    content_type = resp.headers.get("Content-Type", "")
    assert "application/json" in content_type or content_type == "", f"Expected 'application/json' in Content-Type header, got '{content_type}'"

    # JSON body check
    try:
        body = resp.json()
    except ValueError:
        raise AssertionError(f"Response from {url} is not valid JSON. Raw response: {resp.text}")

    assert isinstance(body, dict), f"Expected JSON object, got {type(body)}: {body}"
    assert body.get("status") == "ok", f"Expected JSON body {{'status':'ok'}}, got {body}"

    print("TC001 passed: health_check_api_returns_status_ok")

if __name__ == "__main__":
    try:
        test_health_check_api_returns_status_ok()
    except AssertionError as e:
        print(f"TC001 failed: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"TC001 encountered an unexpected error: {e}", file=sys.stderr)
        sys.exit(2)
    sys.exit(0)