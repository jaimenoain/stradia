import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const port = 3004;
  const url = `http://localhost:${port}/login`;

  console.log(`Navigating to ${url} ...`);
  try {
    await page.goto(url);
    // Wait for the page to load
    await page.waitForLoadState('load');

    // Take screenshot
    await page.screenshot({ path: 'verification/login_page.png' });
    console.log('Screenshot saved to verification/login_page.png');

    // Check for "Sign in" text
    const title = await page.textContent('h1, h2, h3, .card-title, [data-slot="card-title"]');
    console.log('Page title:', title);

    // Check for Dev Mode buttons
    const devButton = await page.$('text=Global Admin');
    if (devButton) {
      console.log('Dev Mode buttons: VISIBLE');
    } else {
      console.log('Dev Mode buttons: HIDDEN');
    }

  } catch (err) {
    console.error('Error during verification:', err);
  } finally {
    await browser.close();
  }
})();
