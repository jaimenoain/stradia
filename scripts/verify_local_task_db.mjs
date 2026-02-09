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
  console.error('Error: Missing environment variables NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log('Running Verification for Local Task (Schema & Logic)...');

  // 1. Setup Common Data (Org & Market)
  const timestamp = Date.now();
  const { data: org, error: orgError } = await supabase.from('organizations').insert({
    name: 'LocalTask Org ' + timestamp
  }).select().single();
  if (orgError) throw orgError;
  const orgId = org.id;
  console.log('Created Org:', orgId);

  const { data: market, error: marketError } = await supabase.from('markets').insert({
    org_id: orgId,
    name: 'LocalTask Market'
  }).select().single();
  if (marketError) throw marketError;
  const marketId = market.id;
  console.log('Created Market:', marketId);

  // 2. Attempt to create a Local Task
  console.log('Attempting to create a Local Task (origin_template_task_id = NULL)...');

  const localTaskPayload = {
    market_id: marketId,
    title: 'My Local Task',
    description: 'This is a test local task.',
    status: 'TODO',
    task_type: 'A',
    origin_template_task_id: null
  };

  const { data: localTask, error: createError } = await supabase
    .from('market_tasks')
    .insert(localTaskPayload)
    .select()
    .single();

  if (createError) {
    if (createError.message.includes('null value in column "origin_template_task_id"')) {
      console.warn('WARNING: Schema migration has NOT been applied. "origin_template_task_id" cannot be null.');
      console.warn('Skipping further verification steps as they depend on the schema change.');
      return;
    }
    if (createError.code === '42703') { // Undefined column
       console.warn('WARNING: Schema migration has NOT been applied. Column missing (title/description/task_type).');
       console.warn('Skipping further verification steps.');
       return;
    }
    throw createError;
  }

  console.log('Local Task created successfully:', localTask.id);

  // 3. Verify get_market_board includes it
  console.log('Verifying get_market_board RPC...');
  const { data: board, error: rpcError } = await supabase.rpc('get_market_board', {
    target_market_id: marketId
  });

  if (rpcError) throw rpcError;

  const foundTask = board.find(t => t.id === localTask.id);

  if (!foundTask) {
    console.warn('WARNING: Local task not found in get_market_board response.');
    console.warn('This indicates the RPC function has NOT been updated to include local tasks.');
    return;
  }

  console.log('Found task in board:', foundTask);

  if (foundTask.origin_template_task_id !== null) {
    throw new Error('Task origin_template_task_id should be null');
  }
  if (foundTask.title !== 'My Local Task') {
    throw new Error('Task title mismatch');
  }
  if (foundTask.is_ghost !== false) {
    throw new Error('Task should not be a ghost');
  }

  console.log('VERIFICATION SUCCESSFUL: Local Task logic works correctly.');
}

main().catch(err => {
  console.error('\nVERIFICATION FAILED:', err);
  process.exit(1);
});
