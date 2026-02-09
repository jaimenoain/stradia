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
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_ANON_KEY) {
  console.error('Error: Missing environment variables NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or NEXT_PUBLIC_SUPABASE_ANON_KEY.');
  process.exit(1);
}

// Service Role Client
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log('Running Vault Verification...');

  // 1. Create User
  const email = `vault-test-${Date.now()}@example.com`;
  const password = 'password123';

  console.log(`Creating User ${email}...`);
  const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (userError) throw userError;
  const userId = userData.user.id;
  console.log('User created:', userId);

  // 2. Create Org
  console.log('Creating Org...');
  const { data: org, error: orgError } = await supabaseAdmin.from('organizations').insert({
    name: 'Vault Org',
    owner_id: userId
  }).select().single();
  if (orgError) throw orgError;
  const orgId = org.id;
  console.log('Org created:', orgId);

  // Link profile
  const { error: profileError } = await supabaseAdmin.from('profiles').update({ org_id: orgId }).eq('user_id', userId);
  if (profileError) throw profileError;

  // 3. Create Market
  console.log('Creating Market...');
  const { data: market, error: marketError } = await supabaseAdmin.from('markets').insert({
    org_id: orgId,
    name: 'Vault Market'
  }).select().single();
  if (marketError) throw marketError;
  const marketId = market.id;
  console.log('Market created:', marketId);

  // 4. Authenticate as User
  console.log('Authenticating as User...');
  const supabaseUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const { error: signInError } = await supabaseUser.auth.signInWithPassword({
    email,
    password
  });
  if (signInError) throw signInError;
  console.log('User authenticated.');

  // 5. Insert Secret (Blind Write)
  console.log('Inserting Secret...');
  const secretValue = 'my-super-secret-token';
  const { error: insertError } = await supabaseUser.from('vault_secrets').insert({
    market_id: marketId,
    provider: 'GTM',
    encrypted_token: secretValue, // Sending plain text, trigger should encrypt
    token_metadata: { scope: 'read' }
  });
  if (insertError) throw insertError;
  console.log('Secret inserted successfully.');

  // 6. Attempt SELECT (Should fail/return empty)
  console.log('Attempting SELECT as User...');
  const { data: selectData, error: selectError } = await supabaseUser.from('vault_secrets').select('*');

  if (selectError) {
      console.log('SELECT failed as expected (RLS might block it completely).', selectError.message);
  } else if (selectData.length === 0) {
      console.log('SELECT returned 0 rows as expected (Blind Write).');
  } else {
      throw new Error(`Security Breach: User was able to select secrets! Data: ${JSON.stringify(selectData)}`);
  }

  // 7. Security Check: Attempt to call retrieve_decrypted_secret as User (Should Fail)
  console.log('Attempting to call retrieve_decrypted_secret as User (Negative Test)...');
  const { data: hackedData, error: hackError } = await supabaseUser.rpc('retrieve_decrypted_secret', {
      p_market_id: marketId,
      p_provider: 'GTM'
  });

  if (!hackError) {
      throw new Error(`CRITICAL SECURITY FAILURE: User was able to call retrieve_decrypted_secret! Data: ${hackedData}`);
  } else {
      console.log(`Security Check Passed: User blocked from calling RPC. Error: ${hackError.message}`);
  }

  // 8. Retrieve Decrypted Secret (Service Role)
  console.log('Retrieving Decrypted Secret as Admin...');
  const { data: decryptedToken, error: rpcError } = await supabaseAdmin.rpc('retrieve_decrypted_secret', {
    p_market_id: marketId,
    p_provider: 'GTM'
  });

  if (rpcError) throw rpcError;

  if (decryptedToken !== secretValue) {
    console.error(`Decryption Mismatch! Expected: "${secretValue}", Got: "${decryptedToken}"`);
    throw new Error('Decryption Mismatch');
  }
  console.log('Decrypted token matches original secret.');

  // 9. Delete Secret (User)
  console.log('Deleting Secret as User...');
  const { error: deleteError } = await supabaseUser.from('vault_secrets')
    .delete()
    .eq('market_id', marketId)
    .eq('provider', 'GTM');

  if (deleteError) throw deleteError;

  // Verify deletion
  const { data: checkDelete } = await supabaseAdmin.rpc('retrieve_decrypted_secret', {
      p_market_id: marketId,
      p_provider: 'GTM'
  });

  if (checkDelete !== null) {
      throw new Error('Deletion failed! Secret still exists.');
  }
  console.log('Secret deleted successfully.');

  console.log('ALL VAULT VERIFICATIONS PASSED.');
}

main().catch(err => {
  console.error('VERIFICATION FAILED:', err);
  process.exit(1);
});
