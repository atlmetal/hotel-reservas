import asyncio
import re
from playwright import async_api
from playwright.async_api import expect

async def run_test():
    pw = None
    browser = None
    context = None

    try:
        # Start a Playwright session in asynchronous mode
        pw = await async_api.async_playwright().start()

        # Launch a Chromium browser in headless mode with custom arguments
        browser = await pw.chromium.launch(
            headless=True,
            args=[
                "--window-size=1280,720",
                "--disable-dev-shm-usage",
                "--ipc=host",
                "--single-process"
            ],
        )

        # Create a new browser context (like an incognito window)
        context = await browser.new_context()
        # Wider default timeout to match the agent's DOM-stability budget;
        # auto-waiting Playwright APIs (expect, locator.wait_for) inherit this.
        context.set_default_timeout(15000)

        # Open a new page in the browser context
        page = await context.new_page()

        # Interact with the page elements to simulate user flow
        # -> navigate
        await page.goto("http://localhost:3000")
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=5000)
        except Exception:
            pass
        
        # -> Open the Superior reservation page to inspect its booking form.
        await page.goto("http://localhost:3000/reservar/superior")
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=5000)
        except Exception:
            pass
        
        # -> Enter valid stay dates and name, invalid contact details and an out-of-range guest count, then submit the booking form.
        # date field
        elem = page.get_by_test_id("campo-checkIn")
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("2026-10-20")
        
        # -> Enter valid stay dates and name, invalid contact details and an out-of-range guest count, then submit the booking form.
        # date field
        elem = page.get_by_test_id("campo-checkOut")
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("2026-10-21")
        
        # -> Enter valid stay dates and name, invalid contact details and an out-of-range guest count, then submit the booking form.
        # text field
        elem = page.get_by_test_id("campo-nombre")
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("Jordan Rivera")
        
        # -> Enter valid stay dates and name, invalid contact details and an out-of-range guest count, then submit the booking form.
        # email field
        elem = page.get_by_test_id("campo-email")
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("invalid-email")
        
        # -> Enter valid stay dates and name, invalid contact details and an out-of-range guest count, then submit the booking form.
        # tel field
        elem = page.get_by_test_id("campo-celular")
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("abc")
        
        # -> Enter 4 guests, submit with “Continuar al pago,” and verify whether field-level validation appears and payment is blocked.
        # number field
        elem = page.get_by_test_id("campo-huespedes")
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("4")
        
        # -> Enter 4 guests, submit with “Continuar al pago,” and verify whether field-level validation appears and payment is blocked.
        # Continuar al pago button
        elem = page.get_by_test_id("continuar-pago")
        await elem.click(timeout=10000)
        
        # --> Assertions to verify final state
        
        # --> The booking remained on the Superior reservation form instead of proceeding to payment.
        # Assert-outcome: not verified — the export-time check could not be evaluated
        # Assert: The booking remains on the Superior reservation form.
        await expect(page).to_have_url(re.compile("/reservar/superior"), timeout=15000), "The booking remains on the Superior reservation form."
        await asyncio.sleep(5)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
    