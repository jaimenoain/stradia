from playwright.sync_api import sync_playwright, expect
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        # Capture console logs
        page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))

        try:
            print("Navigating to login page...")
            page.goto("http://localhost:3000/login")

            # Wait for login form
            print("Waiting for login form...")
            page.wait_for_selector('input[type="email"]')

            # Login
            print("Filling login form...")
            page.fill('input[type="email"]', 'superadmin@stradia.io')
            page.fill('input[type="password"]', 'password')

            print("Submitting form...")
            page.click('button[type="submit"]')

            # Check for error alert
            try:
                error_alert = page.wait_for_selector('div[role="alert"]', timeout=5000)
                if error_alert:
                    print(f"Error alert found!")
                    print(f"Alert text: {error_alert.inner_text()}")
                    page.screenshot(path="verification/login_error.png")
            except:
                print("No error alert found within timeout.")

            # Wait for redirection to dashboard
            print("Waiting for redirection to overview...")
            page.wait_for_url("**/overview", timeout=10000)

            # Wait for sidebar
            print("Waiting for sidebar...")
            page.wait_for_selector('aside')

            # Check for Super Admin link
            print("Checking for Super Admin link...")
            super_admin_link = page.get_by_role("link", name="Super Admin")
            expect(super_admin_link).to_be_visible()

            print("Taking screenshot...")
            page.screenshot(path="verification/verification_super_admin.png")
            print("Verification successful!")

        except Exception as e:
            print(f"Verification failed: {e}")
            page.screenshot(path="verification/verification_failed.png")
        finally:
            browser.close()

if __name__ == "__main__":
    run()
