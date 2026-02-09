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

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('Skipping verification: Missing environment variables NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(0);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log('Running Vault Backend Verification...');

  // 1. Setup Common Data (Org & Market)
  const timestamp = Date.now();
  const { data: org, error: orgError } = await supabase.from('organizations').insert({
    name: 'Vault QA Org ' + timestamp
  }).select().single();
  if (orgError) {
    console.error('Error creating org:', orgError);
    throw orgError;
  }
  const orgId = org.id;
  console.log('Created Org:', orgId);

  const { data: market, error: marketError } = await supabase.from('markets').insert({
    org_id: orgId,
    name: 'Vault QA Market'
  }).select().single();
  if (marketError) {
    console.error('Error creating market:', marketError);
    throw marketError;
  }
  const marketId = market.id;
  console.log('Created Market:', marketId);

  // 2. Test Insertion
  console.log('Inserting GTM Secret...');
  const { data: secret, error: insertError } = await supabase.from('vault_secrets').insert({
    market_id: marketId,
    provider: 'GTM',
    encrypted_token: 'test-token-123'
  }).select().single();

  if (insertError) {
    console.error('Error inserting secret:', insertError);
    throw insertError;
  }
  console.log('Secret inserted successfully.');

  // 3. Verify Encryption
  console.log('Verifying encryption...');
  if (secret.encrypted_token === 'test-token-123') {
    throw new Error('Token was NOT encrypted! Trigger might be missing or failed.');
  }
  console.log('Token is encrypted (value changed).');

  // 4. Verify Retrieval via RPC
  console.log('Verifying decryption via RPC...');
  const { data: decryptedToken, error: rpcError } = await supabase.rpc('retrieve_decrypted_secret', {
    p_market_id: marketId,
    p_provider: 'GTM'
  });

  if (rpcError) {
    console.error('Error calling RPC:', rpcError);
    throw rpcError;
  }
  if (decryptedToken !== 'test-token-123') {
    throw new Error(`Decryption failed! Expected 'test-token-123', got '${decryptedToken}'`);
  }
  console.log('Decryption successful.');

  // 5. Verify Admin Select
  const { data: secretsList, error: selectError } = await supabase
    .from('vault_secrets')
    .select('provider')
    .eq('market_id', marketId);

  if (selectError) throw selectError;
  if (secretsList.length !== 1 || secretsList[0].provider !== 'GTM') {
    throw new Error('Admin Select failed or returned wrong data.');
  }
  console.log('Admin Select verified.');

  // 6. Cleanup
  console.log('Cleaning up...');
  await supabase.from('vault_secrets').delete().eq('market_id', marketId);
  await supabase.from('markets').delete().eq('id', marketId);
  await supabase.from('organizations').delete().eq('id', orgId);

  console.log('Vault Verification PASSED.');
}

main().catch(err => {
  console.error('Vault Verification FAILED:', err);
  process.exit(1);
});
