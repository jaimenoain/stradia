const routes = [
  { path: '/', expectedTitle: 'Home' },
  { path: '/login', expectedTitle: 'Login' },
  { path: '/overview', expectedTitle: 'Overview' },
  { path: '/strategies', expectedTitle: 'Strategies' },
  { path: '/settings', expectedTitle: 'Settings' },
  { path: '/markets/123/board', expectedTitle: 'Market Board' },
];

const BASE_URL = 'http://localhost:3000';

async function checkRoute(route) {
  const url = `${BASE_URL}${route.path}`;
  try {
    const res = await fetch(url);
    if (res.status !== 200) {
      console.log(`FAIL: ${route.path} - Expected status 200, got ${res.status}`);
      return false;
    }

    const text = await res.text();
    // Simple regex to match h1 content, handling potential attributes
    const match = text.match(/<h1[^>]*>(.*?)<\/h1>/s);
    if (!match) {
      console.log(`FAIL: ${route.path} - No <h1> tag found`);
      return false;
    }

    const actualTitle = match[1].trim();
    if (actualTitle !== route.expectedTitle) {
      console.log(`FAIL: ${route.path} - Expected <h1>${route.expectedTitle}</h1>, got <h1>${actualTitle}</h1>`);
      return false;
    }

    console.log(`PASS: ${route.path}`);
    return true;
  } catch (error) {
    console.log(`FAIL: ${route.path} - Error: ${error.message}`);
    return false;
  }
}

async function run() {
  console.log('Verifying routes...');
  let allPassed = true;
  for (const route of routes) {
    const passed = await checkRoute(route);
    if (!passed) allPassed = false;
  }

  if (allPassed) {
    console.log('All routes verified successfully.');
    process.exit(0);
  } else {
    console.log('Some routes failed verification.');
    process.exit(1);
  }
}

run();
