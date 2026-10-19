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
        
        # -> Abrir el listado de reservas mediante el enlace «Reservas».
        # Reservas link
        elem = page.get_by_role("link", name="Reservas")
        await elem.click(timeout=10000)
        
        # -> Abrir la reserva AUR-20261019-2BE7U6 con el enlace «Ver» y comprobar la información que presenta.
        # Ver link
        elem = page.get_by_role("row", name="AUR-20261019-2BE7U6 Superior").get_by_role("link")
        await elem.click(timeout=10000)
        
        # --> Assertions to verify final state
        
        # --> The reservation result page is displayed.
        # Assert-outcome: not verified — the export-time check could not be evaluated
        # Assert: The reservation result page should be displayed.
        await expect(page).to_have_url(re.compile("/resultado"), timeout=15000), "The reservation result page should be displayed."
        
        # --> The selected reservation’s result details section is displayed.
        await page.get_by_role("term").filter(has_text="Estado").nth(0).scroll_into_view_if_needed()
        # Assert-outcome: not verified — the export-time check could not be evaluated
        # Assert: The reservation details section should be visible.
        await expect(page.get_by_role("term").filter(has_text="Estado").nth(0)).to_be_visible(timeout=15000), "The reservation details section should be visible."
        await asyncio.sleep(5)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
    