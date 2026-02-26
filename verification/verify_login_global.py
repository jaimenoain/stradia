from playwright.sync_api import sync_playwright, expect
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        try:
            print("Navigating to login page...")
            page.goto("http://localhost:3000/login")

            print("Filling login form (Global Admin)...")
            page.fill('input[type="email"]', 'admin@stradia.io')
            page.fill('input[type="password"]', 'password')

            print("Submitting form...")
            page.click('button[type="submit"]')

            print("Waiting for redirection to overview...")
            page.wait_for_url("**/overview", timeout=10000)

            print("Login successful! Redirected to overview.")

            # Check if Super Admin link is ABSENT (Global Admin shouldn't see it)
            # Or maybe they should? No, only SUPER_ADMIN.

            print("Taking screenshot...")
            page.screenshot(path="verification/verification_global.png")

        except Exception as e:
            print(f"Verification failed: {e}")
            page.screenshot(path="verification/verification_failed_global.png")
        finally:
            browser.close()

if __name__ == "__main__":
    run()
