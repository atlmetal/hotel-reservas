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
        
        # -> Start a reservation by selecting the Estándar room’s “Reservar” option.
        # Reservar link
        elem = page.get_by_role("listitem").filter(has_text="EstándarHabitación cómoda con").get_by_role("link")
        await elem.click(timeout=10000)
        
        # -> Enter valid reservation dates and guest contact details, then continue to payment.
        # date field
        elem = page.get_by_test_id("campo-checkIn")
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("2026-11-01")
        
        # -> Enter valid reservation dates and guest contact details, then continue to payment.
        # date field
        elem = page.get_by_test_id("campo-checkOut")
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("2026-11-03")
        
        # -> Enter valid reservation dates and guest contact details, then continue to payment.
        # text field
        elem = page.get_by_test_id("campo-nombre")
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("Test Guest")
        
        # -> Enter valid reservation dates and guest contact details, then continue to payment.
        # email field
        elem = page.get_by_test_id("campo-email")
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("guest@example.com")
        
        # -> Enter valid reservation dates and guest contact details, then continue to payment.
        # tel field
        elem = page.get_by_test_id("campo-celular")
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("3001234567")
        
        # -> Submit the completed reservation details using “Continuar al pago” and inspect the payment page.
        # Continuar al pago button
        elem = page.get_by_test_id("continuar-pago")
        await elem.click(timeout=10000)
        
        # -> Start the sandbox payment by selecting “Pagar con PayU” and inspect the payment form.
        # Pagar con PayU button
        elem = page.get_by_test_id("pagar-payu")
        await elem.click(timeout=10000)
        
        # -> Select Visa as the sandbox payment method and inspect the card-entry form.
        # button
        elem = page.locator("#type-CREDIT_CARD").get_by_role("list").locator("#pm-VISA")
        await elem.click(timeout=10000)
        
        # -> Enter the approved Visa number and cardholder details, and inspect the expiry and identity-document options.
        # 4000 1234 5678 9010 tel field
        elem = page.get_by_role("textbox", name="1234 5678 9010")
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("4111111111111111")
        
        # -> Enter the approved Visa number and cardholder details, and inspect the expiry and identity-document options.
        # 000 tel field
        elem = page.get_by_role("textbox", name="000", exact=True)
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("777")
        
        # -> Enter the approved Visa number and cardholder details, and inspect the expiry and identity-document options.
        # fullName text field
        elem = page.locator("#cc_fullName")
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("APPROVED")
        
        # -> Enter the approved Visa number and cardholder details, and inspect the expiry and identity-document options.
        # dniNumber tel field
        elem = page.locator("#cc_dniNumber")
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("1234567890")
        
        # -> Enter the approved Visa number and cardholder details, and inspect the expiry and identity-document options.
        # Ej: 3112222222 tel field
        elem = page.get_by_role("textbox", name="Teléfono Celular *")
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("3001234567")
        
        # -> Choose an expiry month below 6 and a future year for the Visa card.
        # [internal] get_dropdown_options: index=
        
        # -> Set the Visa expiry month to 1 and inspect the available expiry years.
        # -Mes- 1 2 3 4 5 6 7 8 9 10 11 12 dropdown
        elem = page.locator("xpath=/html/body/div[6]/div[3]/div/div[2]/div[2]/div/div[2]/div/div[2]/div/div[4]/div/div/form/div/div[3]/expiration-date/div/div/div/select").nth(0)
        await elem.wait_for(state="visible", timeout=10000)
        await elem.select_option("")
        
        # -> Set the Visa expiry month to 1 and inspect the available expiry years.
        # [internal] get_dropdown_options: index=
        
        # -> Set the card expiry year to 27 and accept PayU's terms and conditions.
        # -Año- 26 27 28 29 30 31 32 33 34 35 36 37 38 39... dropdown
        elem = page.locator("xpath=/html/body/div[6]/div[3]/div/div[2]/div[2]/div/div[2]/div/div[2]/div/div[4]/div/div/form/div/div[3]/expiration-date/div/div/div[3]/select").nth(0)
        await elem.wait_for(state="visible", timeout=10000)
        await elem.select_option("")
        
        # -> Set the card expiry year to 27 and accept PayU's terms and conditions.
        # tandc checkbox
        elem = page.get_by_role("checkbox", name="Acepto los términos y")
        await elem.click(timeout=10000)
        
        # -> Submit the sandbox payment using the visible “Pagar” button, then verify the hotel result page displays a confirmed reservation.
        # Pagar button
        elem = page.get_by_role("button", name="Pagar")
        await elem.click(timeout=10000)
        
        # -> Return to the hotel site using “Regresar al sitio de la tienda” and verify the result page shows a confirmed reservation.
        # Regresar al sitio de la tienda link
        elem = page.get_by_role("link", name="Regresar al sitio de la tienda")
        await elem.click(timeout=10000)
        
        # --> Assertions to verify final state
        
        # --> The reservation result page is displayed.
        # Assert-outcome: not verified — the export-time check could not be evaluated
        # Assert: The reservation result page is displayed.
        await expect(page).to_have_url(re.compile("/resultado"), timeout=15000), "The reservation result page is displayed."
        
        # --> The reservation is marked as confirmed.
        # Assert-outcome: not verified — the export-time check could not be evaluated
        # Assert: The reservation has the confirmed transaction state.
        await expect(page).to_have_url(re.compile("transactionState=4"), timeout=15000), "The reservation has the confirmed transaction state."
        await asyncio.sleep(5)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
    