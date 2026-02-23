import { exit } from 'process';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set in the environment.');
  console.error('Make sure you have a .env file or these variables are exported.');
  exit(1);
}

const TABLES = ['Tenant', 'User', 'Market', 'UserMarket'];

async function verifyTable(tableName: string): Promise<boolean> {
  // Use exact casing for table names as per instructions
  const url = `${SUPABASE_URL}/rest/v1/${tableName}?select=*`;
  const headers = {
    'apikey': SUPABASE_ANON_KEY!,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json'
  };

  try {
    const response = await fetch(url, { headers });

    // If 401 Unauthorized or 403 Forbidden, RLS is doing its job (at least denying access).
    if (response.status === 401 || response.status === 403) {
      console.log(`✅ ${tableName}: Access denied (${response.status}) - RLS blocked access.`);
      return true;
    }

    if (!response.ok) {
        // If 404, the table might not exist or the URL is wrong.
        console.error(`❌ ${tableName}: Unexpected error ${response.status} ${response.statusText}`);
        return false;
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      console.error(`❌ ${tableName}: Response is not an array.`, data);
      return false;
    }

    if (data.length > 0) {
      console.error(`❌ ${tableName}: Data returned! RLS FAILED. Found ${data.length} records.`);
      return false;
    }

    console.log(`✅ ${tableName}: Empty array returned (Default Deny active).`);
    return true;

  } catch (error) {
    console.error(`❌ ${tableName}: Network error`, error);
    return false;
  }
}

async function main() {
  console.log('Verifying RLS Default Deny...');
  console.log(`Target: ${SUPABASE_URL}`);

  let allPassed = true;
  for (const table of TABLES) {
    const passed = await verifyTable(table);
    if (!passed) allPassed = false;
  }

  if (allPassed) {
    console.log('\n✅ All tables verified successfully: Default Deny is active.');
    exit(0);
  } else {
    console.error('\n❌ Verification failed.');
    exit(1);
  }
}

main();
