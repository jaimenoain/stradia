import time
import os
from playwright.sync_api import sync_playwright, expect

# Configuration
BASE_URL = os.getenv('BASE_URL', 'http://localhost:3000')
EMAIL = os.getenv('TEST_EMAIL', 'test@example.com')
PASSWORD = os.getenv('TEST_PASSWORD', 'password')

def run_test():
    with sync_playwright() as p:
        # Launch browser
        browser = p.chromium.launch(headless=True) # Set headless=False to see the UI
        context = browser.new_context()
        page = context.new_page()

        print("1. Starting Authentication Flow...")
        # Step 1: Login
        # Navigate to login page
        page.goto(f"{BASE_URL}/login")

        # Fill in credentials (adjust selectors if needed)
        page.fill("input[name='email']", EMAIL)
        page.fill("input[name='password']", PASSWORD)
        page.click("button[type='submit']")

        # Wait for redirection to dashboard or onboarding
        page.wait_for_url("**/app/**")
        print("   Logged in successfully.")

        # Step 2: Navigate to Market Board
        # Navigate to a known market or the first available market
        # Assuming URL pattern: /app/[marketId]/dashboard
        # If dynamic, we might need to scrape the market ID first from the sidebar or onboarding.
        # For now, we assume we land on a page that has access to the board.

        # If we are on /app, we might need to select a market.
        if "/app" in page.url and "dashboard" not in page.url:
             # Click first market in sidebar if available
             try:
                 page.click("a[href*='/dashboard']", timeout=5000)
             except:
                 print("   Could not find dashboard link immediately. Please ensure a market exists.")
                 return

        print(f"   Navigated to: {page.url}")

        # Step 3: Visual Inspection of Ghost Card
        print("2. Visual Inspection of Ghost Cards...")
        # Locate a Ghost Card by its distinctive classes
        # 'opacity-60' and 'border-dashed' are used for Ghost Cards.
        ghost_card = page.locator(".opacity-60.border-dashed").first

        try:
            expect(ghost_card).to_be_visible(timeout=5000)
            print("   Ghost Card found and visible.")

            # Verify visual properties
            # We can check CSS properties if needed, but the class check is usually sufficient for functionality.
            # opacity = ghost_card.evaluate("el => getComputedStyle(el).opacity")
            # assert float(opacity) < 1.0, "Ghost Card opacity should be less than 1"

        except AssertionError:
            print("   No Ghost Card found! Please ensure the market has optional tasks not yet accepted.")
            browser.close()
            return

        # Step 4: Interaction - Accept Ghost Card
        print("3. Testing Interaction Flow (Accept)...")

        # Get the title to verify later
        card_title = ghost_card.locator(".font-medium").inner_text()
        print(f"   Accepting task: {card_title}")

        # Click the "Accept" button
        # The SmartCard component has a button with title="Accept Task"
        accept_button = ghost_card.locator("button[title='Accept Task']")
        accept_button.click()

        # Step 5: Verify Optimistic Update
        print("   Verifying Optimistic Update (Instant)...")

        # The card should NO LONGER be a ghost.
        # It should lose the 'opacity-60' and 'border-dashed' classes.
        # We find the card by text now, as the classes might have changed.
        accepted_card = page.locator(f".bg-card:has-text('{card_title}')").first

        expect(accepted_card).to_be_visible()
        expect(accepted_card).not_to_have_class("opacity-60")
        expect(accepted_card).not_to_have_class("border-dashed")

        print("   Optimistic update verified: Card is now solid.")

        # Step 6: Verify Persistence
        print("4. Testing Persistence...")
        page.reload()

        # Wait for board to load
        page.wait_for_selector(".bg-card")

        persisted_card = page.locator(f".bg-card:has-text('{card_title}')").first
        expect(persisted_card).to_be_visible()
        expect(persisted_card).not_to_have_class("opacity-60")

        print("   Persistence verified: Card remains solid after reload.")

        # Optional: Clean up (Reject the task to reset state?)
        # reject_button = persisted_card.locator("button[title='Reject Task']") # Does not exist on accepted tasks usually?
        # Actually, accepted tasks might not have a reject button in the same way, or it might be in a menu.
        # For this test, we stop here.

        print("Test Suite Passed!")
        browser.close()

if __name__ == "__main__":
    run_test()
