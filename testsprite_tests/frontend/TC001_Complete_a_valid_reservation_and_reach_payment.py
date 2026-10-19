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
        
        # -> Open the reservation form for the Standard room.
        # Reservar link
        elem = page.get_by_role("listitem").filter(has_text="EstándarHabitación cómoda con").get_by_role("link")
        await elem.click(timeout=10000)
        
        # -> Enter a valid one-night date range and guest contact details in the Standard reservation form.
        # date field
        elem = page.get_by_test_id("campo-checkIn")
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("2026-10-20")
        
        # -> Enter a valid one-night date range and guest contact details in the Standard reservation form.
        # date field
        elem = page.get_by_test_id("campo-checkOut")
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("2026-10-21")
        
        # -> Enter a valid one-night date range and guest contact details in the Standard reservation form.
        # text field
        elem = page.get_by_test_id("campo-nombre")
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("Alex Rivera")
        
        # -> Enter a valid one-night date range and guest contact details in the Standard reservation form.
        # email field
        elem = page.get_by_test_id("campo-email")
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("alex.rivera@example.com")
        
        # -> Enter a valid one-night date range and guest contact details in the Standard reservation form.
        # tel field
        elem = page.get_by_test_id("campo-celular")
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("3001234567")
        
        # -> Submit the Standard reservation using “Continuar al pago” and confirm that the payment page and reservation summary appear.
        # Continuar al pago button
        elem = page.get_by_test_id("continuar-pago")
        await elem.click(timeout=10000)
        
        # --> Assertions to verify final state
        
        # --> The payment page is displayed.
        # Assert-outcome: not verified — the export-time check could not be evaluated
        # Assert: The payment page is displayed.
        await expect(page).to_have_url(re.compile("/pago"), timeout=15000), "The payment page is displayed."
        
        # --> The reservation summary is displayed, including the room and stay details.
        await page.get_by_text("Noches").nth(0).scroll_into_view_if_needed()
        # Assert-outcome: not verified — the export-time check could not be evaluated
        # Assert: The reservation summary is displayed.
        await expect(page.get_by_text("Noches").nth(0)).to_be_visible(timeout=15000), "The reservation summary is displayed."
        await asyncio.sleep(5)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
    