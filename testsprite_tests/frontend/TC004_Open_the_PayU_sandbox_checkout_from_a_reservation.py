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
        
        # -> Start a reservation using one of the visible room options to enter the reservation flow.
        # Reservar link
        elem = page.get_by_role("listitem").filter(has_text="EstándarHabitación cómoda con").get_by_role("link")
        await elem.click(timeout=10000)
        
        # -> Complete the visible reservation form with valid test details and select “Continuar al pago.”
        # date field
        elem = page.get_by_test_id("campo-checkIn")
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("2026-11-01")
        
        # -> Complete the visible reservation form with valid test details and select “Continuar al pago.”
        # date field
        elem = page.get_by_test_id("campo-checkOut")
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("2026-11-03")
        
        # -> Complete the visible reservation form with valid test details and select “Continuar al pago.”
        # text field
        elem = page.get_by_test_id("campo-nombre")
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("QA Test Guest")
        
        # -> Complete the visible reservation form with valid test details and select “Continuar al pago.”
        # email field
        elem = page.get_by_test_id("campo-email")
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("qa.guest@example.com")
        
        # -> Complete the visible reservation form with valid test details and select “Continuar al pago.”
        # tel field
        elem = page.get_by_test_id("campo-celular")
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("3001234567")
        
        # -> Submit the completed reservation using “Continuar al pago” to open the payment page.
        # Continuar al pago button
        elem = page.get_by_test_id("continuar-pago")
        await elem.click(timeout=10000)
        
        # -> Click “Pagar con PayU” to start checkout and verify the resulting PayU sandbox page.
        # Pagar con PayU button
        elem = page.get_by_test_id("pagar-payu")
        await elem.click(timeout=10000)
        
        # --> Assertions to verify final state
        
        # --> The PayU sandbox checkout page is displayed.
        # Assert-outcome: not verified — the export-time check could not be evaluated
        # Assert: The URL shows the PayU sandbox checkout.
        await expect(page).to_have_url(re.compile("sandbox\\.checkout\\.payulatam\\.com"), timeout=15000), "The URL shows the PayU sandbox checkout."
        await asyncio.sleep(5)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
    