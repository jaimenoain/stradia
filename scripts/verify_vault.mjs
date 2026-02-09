import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load .env.local manually
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8');
  envConfig.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=');
      process.env[key.trim()] = value.trim().replace(/^"|"$/g, '');
    }
  });
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.error('Error: Missing environment variables.');
  process.exit(1);
}

// Clients
const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const authClient = createClient(SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function main() {
  console.log('--- Starting Vault Security Verification ---');

  // 1. Setup User and Market
  const email = `vault-test-${Date.now()}@example.com`;
  const password = 'password123';

  // Create user with admin client
  const { data: { user }, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createError) throw createError;
  console.log(`Created test user: ${user.id}`);

  // Sign in as user to get session
  const { data: { session }, error: signInError } = await authClient.auth.signInWithPassword({
    email,
    password,
  });
  if (signInError) throw signInError;
  console.log('Signed in as test user.');

  // Initialize authenticated client
  const userClient = createClient(SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${session.access_token}` } },
  });

  // Create Organization
  const { data: org, error: orgError } = await userClient.from('organizations').insert({
    name: 'Vault Test Org',
    owner_id: user.id,
  }).select().single();

  if (orgError) {
      console.error('Org creation failed:', orgError);
      throw orgError;
  }
  console.log(`Created organization: ${org.id}`);

  // Link profile
  await adminClient.from('profiles').update({ org_id: org.id }).eq('user_id', user.id);

  // Create Market
  const { data: market, error: marketError } = await userClient.from('markets').insert({
    org_id: org.id,
    name: 'Vault Test Market',
  }).select().single();
  if (marketError) throw marketError;
  console.log(`Created market: ${market.id}`);

  // 2. Encryption at Rest
  const secretValue = 'my_secret_key_123';
  const provider = 'GTM';

  console.log('\n--- Step 2: Encryption at Rest ---');
  // Insert secret as user
  const { error: insertError } = await userClient.from('vault_secrets').insert({
    market_id: market.id,
    provider,
    encrypted_token: secretValue, // Trigger encrypts this
  });
  if (insertError) throw insertError;
  console.log('Secret inserted by user.');

  // Read as admin (service role) to check encryption
  const { data: secretRow, error: readError } = await adminClient
    .from('vault_secrets')
    .select('encrypted_token')
    .eq('market_id', market.id)
    .eq('provider', provider)
    .single();

  if (readError) throw readError;

  if (secretRow.encrypted_token === secretValue) {
    throw new Error('FAIL: Token is stored as plain text!');
  }
  console.log(`PASS: Token is encrypted. Stored value: ${secretRow.encrypted_token.substring(0, 10)}...`);

  // 3. Least Privilege (Blind Write)
  console.log('\n--- Step 3: Least Privilege (Blind Write) ---');
  // Try to select as user
  const { data: userReadData, error: userReadError } = await userClient
    .from('vault_secrets')
    .select('*')
    .eq('market_id', market.id);

  if (userReadError) {
      console.log('Note: unexpected error during select:', userReadError);
  } else if (userReadData && userReadData.length > 0) {
      throw new Error(`FAIL: User was able to read ${userReadData.length} rows from vault_secrets!`);
  } else {
      console.log('PASS: User cannot read vault_secrets (0 rows returned).');
  }

  // 4. Function Security
  console.log('\n--- Step 4: Function Security ---');
  // Try to call retrieve_decrypted_secret as user
  const { data: userData, error: userFuncError } = await userClient.rpc('retrieve_decrypted_secret', {
    p_market_id: market.id,
    p_provider: provider,
  });

  if (!userFuncError) {
    console.error('User data received:', userData);
    throw new Error('FAIL: User was able to call retrieve_decrypted_secret!');
  }
  // Check for permission denied error
  // Error format usually: { code: '42501', message: 'permission denied for function ...', ... }
  if (userFuncError.message.includes('permission denied') || userFuncError.code === '42501') {
      console.log('PASS: User call to retrieve_decrypted_secret failed with permission denied.');
  } else {
      console.log(`PASS: User call failed (unexpected error): ${userFuncError.message}`);
  }

  // 5. Secure Retrieval
  console.log('\n--- Step 5: Secure Retrieval ---');
  // Call as admin (service role)
  const { data: decryptedSecret, error: adminFuncError } = await adminClient.rpc('retrieve_decrypted_secret', {
    p_market_id: market.id,
    p_provider: provider,
  });

  if (adminFuncError) throw adminFuncError;

  if (decryptedSecret !== secretValue) {
    throw new Error(`FAIL: Decrypted secret '${decryptedSecret}' does not match original '${secretValue}'`);
  }
  console.log(`PASS: Service role successfully retrieved and decrypted the secret.`);

  // 6. UI Logic Verification (Programmatic)
  console.log('\n--- Step 6: UI Logic Verification ---');
  // Verify existence check (what UI does via admin client)
  const { data: statusData, error: statusError } = await adminClient
    .from('vault_secrets')
    .select('provider')
    .eq('market_id', market.id);

  if (statusError) throw statusError;

  const connected = statusData.some(r => r.provider === provider);
  if (!connected) {
      throw new Error('FAIL: Admin client could not find the secret to report status.');
  }
  console.log('PASS: Admin client found the secret provider, so UI would show "Connected".');

  // Clean up
  console.log('\n--- Cleaning up ---');
  await adminClient.auth.admin.deleteUser(user.id);

  console.log('Verification Complete. All checks passed.');
}

main().catch((err) => {
  console.error('\nXXX VERIFICATION FAILED XXX');
  console.error(err);
  process.exit(1);
});
