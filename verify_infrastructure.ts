import fs from 'fs';
import path from 'path';

// Define expected values
const REQUIRED_ENV_EXAMPLE_CONTENT = `NEXT_PUBLIC_SUPABASE_URL="https://nmstasjbkzbaomgdohsu.supabase.co"`;

// Paths to check
const ENV_EXAMPLE_PATH = path.join(process.cwd(), '.env.example');
// Check for layout in app/ (standard for this repo based on file listing) or src/app/
const LAYOUT_PATH_APP = path.join(process.cwd(), 'app', 'layout.tsx');
const LAYOUT_PATH_SRC = path.join(process.cwd(), 'src', 'app', 'layout.tsx');
const LAYOUT_PATH = fs.existsSync(LAYOUT_PATH_APP) ? LAYOUT_PATH_APP : LAYOUT_PATH_SRC;

const PROVIDERS_PATHS = [
    path.join(process.cwd(), 'app', 'providers.tsx'),
    path.join(process.cwd(), 'components', 'providers.tsx'),
    path.join(process.cwd(), 'src', 'app', 'providers.tsx'),
    path.join(process.cwd(), 'src', 'components', 'providers.tsx')
];

let hasErrors = false;

console.log('Verifying Infrastructure...');

// 1. Check .env.example
if (!fs.existsSync(ENV_EXAMPLE_PATH)) {
    console.error(`❌ .env.example file not found at ${ENV_EXAMPLE_PATH}`);
    hasErrors = true;
} else {
    const envContent = fs.readFileSync(ENV_EXAMPLE_PATH, 'utf-8');
    if (!envContent.includes(REQUIRED_ENV_EXAMPLE_CONTENT)) {
        console.error(`❌ .env.example does not contain the required string: ${REQUIRED_ENV_EXAMPLE_CONTENT}`);
        hasErrors = true;
    } else {
        console.log('✅ .env.example verified.');
    }
}

// 2. Check for Providers component
let providerPathFound = null;
for (const p of PROVIDERS_PATHS) {
    if (fs.existsSync(p)) {
        providerPathFound = p;
        break;
    }
}

if (!providerPathFound) {
    console.error(`❌ No providers file found. Checked: ${PROVIDERS_PATHS.join(', ')}`);
    hasErrors = true;
} else {
    const providerContent = fs.readFileSync(providerPathFound, 'utf-8');
    if (!providerContent.includes('"use client"') && !providerContent.includes("'use client'")) {
        console.error(`❌ Providers file at ${providerPathFound} missing "use client" directive.`);
        hasErrors = true;
    } else {
        console.log(`✅ Providers file verified at ${providerPathFound}.`);
    }
}

// 3. Check app/layout.tsx
if (!fs.existsSync(LAYOUT_PATH)) {
    console.error(`❌ layout.tsx not found. Checked ${LAYOUT_PATH_APP} and ${LAYOUT_PATH_SRC}`);
    hasErrors = true;
} else {
    const layoutContent = fs.readFileSync(LAYOUT_PATH, 'utf-8');
    // Check if it imports Providers (flexible check)
    // We expect something like: import { Providers } from ... or import Providers from ...
    // And usage <Providers>...</Providers>

    const importsProviders = /import.*Providers.*/.test(layoutContent);
    const usesProviders = /<Providers>/.test(layoutContent);

    if (!importsProviders) {
        console.error(`❌ ${path.relative(process.cwd(), LAYOUT_PATH)} does not appear to import Providers.`);
        hasErrors = true;
    }

    if (!usesProviders) {
        console.error(`❌ ${path.relative(process.cwd(), LAYOUT_PATH)} does not appear to use <Providers> component.`);
        hasErrors = true;
    }

    if (importsProviders && usesProviders) {
        console.log(`✅ ${path.relative(process.cwd(), LAYOUT_PATH)} imports and uses Providers.`);
    }
}

if (hasErrors) {
    console.error('\n❌ Verification FAILED.');
    process.exit(1);
} else {
    console.log('\n✅ Verification PASSED.');
    process.exit(0);
}
