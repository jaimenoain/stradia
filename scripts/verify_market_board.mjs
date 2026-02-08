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
  console.log('Running QA Verification for get_market_board...');

  // 1. Setup Common Data (Org & Market)
  const timestamp = Date.now();
  const { data: org, error: orgError } = await supabase.from('organizations').insert({
    name: 'QA Org ' + timestamp
  }).select().single();
  if (orgError) throw orgError;
  const orgId = org.id;
  console.log('Created Org:', orgId);

  const { data: market, error: marketError } = await supabase.from('markets').insert({
    org_id: orgId,
    name: 'QA Market'
  }).select().single();
  if (marketError) throw marketError;
  const marketId = market.id;
  console.log('Created Market:', marketId);

  // --- Scenario 1: Hybrid State (1 Mandatory, 1 Optional) ---
  console.log('\n--- Scenario 1: Hybrid State (1 Mandatory, 1 Optional) ---');

  const { data: template1, error: t1Error } = await supabase.from('templates').insert({
    owner_org_id: orgId,
    name: 'Hybrid Template'
  }).select().single();
  if (t1Error) throw t1Error;

  const { data: version1, error: v1Error } = await supabase.from('template_versions').insert({
    template_id: template1.id,
    version_string: '1.0.0',
    status: 'DRAFT'
  }).select().single();
  if (v1Error) throw v1Error;

  // Mandatory Task
  const { data: taskMandatory, error: tmError } = await supabase.from('template_tasks').insert({
    template_version_id: version1.id,
    title: 'Mandatory Task',
    task_type: 'A',
    is_optional: false,
    weight: 1
  }).select().single();
  if (tmError) throw tmError;

  // Optional Task
  const { data: taskOptional, error: toError } = await supabase.from('template_tasks').insert({
    template_version_id: version1.id,
    title: 'Optional Task',
    task_type: 'B',
    is_optional: true,
    weight: 2
  }).select().single();
  if (toError) throw toError;

  // Publish Version 1
  const { error: p1Error } = await supabase.from('template_versions')
    .update({ status: 'PUBLISHED' })
    .eq('id', version1.id);
  if (p1Error) throw p1Error;

  // Deploy Strategy
  console.log('Deploying Hybrid Strategy...');
  const { error: d1Error } = await supabase.rpc('deploy_strategy', {
    p_market_id: marketId,
    p_version_id: version1.id
  });
  if (d1Error) throw d1Error;

  // Verify Board
  let { data: board1, error: b1Error } = await supabase.rpc('get_market_board', {
    target_market_id: marketId
  });
  if (b1Error) throw b1Error;

  console.log('Hybrid Board Length:', board1.length);
  if (board1.length !== 2) throw new Error(`Expected 2 tasks, got ${board1.length}`);

  const hybridReal = board1.find(t => t.origin_template_task_id === taskMandatory.id);
  const hybridGhost = board1.find(t => t.origin_template_task_id === taskOptional.id);

  if (!hybridReal || hybridReal.is_ghost !== false || hybridReal.status !== 'TODO' || hybridReal.id.startsWith('temp_')) {
    throw new Error('Hybrid State: Mandatory task check failed (should be Real/TODO)');
  }
  if (!hybridGhost || hybridGhost.is_ghost !== true || hybridGhost.status !== 'GHOST' || !hybridGhost.id.startsWith('temp_')) {
    throw new Error('Hybrid State: Optional task check failed (should be Ghost)');
  }
  console.log('Scenario 1 PASSED.');


  // --- Scenario 2: Zero-State (All Optional) ---
  console.log('\n--- Scenario 2: Zero-State (2 Optional Tasks) ---');

  // New Market for isolation (or reuse same market but new deployment overrides?)
  // deploy_strategy updates deployment time, so get_market_board picks the latest.
  // But market_tasks from previous deployment persist if they match origin_template_task_id?
  // No, market_tasks are linked to origin_template_task_id. If new version has NEW tasks (different IDs), old tasks remain but won't match.
  // However, get_market_board filters by:
  //   join public.template_versions tv on tv.id = ms.template_version_id
  //   join public.template_tasks tt on tt.template_version_id = tv.id
  // So it only returns tasks from the CURRENT version. Old tasks from previous version are ignored.
  // So I can reuse the market if I use a NEW version.

  const { data: version2, error: v2Error } = await supabase.from('template_versions').insert({
    template_id: template1.id,
    version_string: '2.0.0',
    status: 'DRAFT'
  }).select().single();
  if (v2Error) throw v2Error;

  // 2 Optional Tasks (New IDs)
  const { data: taskOpt1, error: to1Error } = await supabase.from('template_tasks').insert({
    template_version_id: version2.id,
    title: 'Optional Task 1',
    task_type: 'A',
    is_optional: true,
    weight: 1
  }).select().single();
  if (to1Error) throw to1Error;

  const { data: taskOpt2, error: to2Error } = await supabase.from('template_tasks').insert({
    template_version_id: version2.id,
    title: 'Optional Task 2',
    task_type: 'B',
    is_optional: true,
    weight: 2
  }).select().single();
  if (to2Error) throw to2Error;

  // Publish Version 2
  const { error: p2Error } = await supabase.from('template_versions')
    .update({ status: 'PUBLISHED' })
    .eq('id', version2.id);
  if (p2Error) throw p2Error;

  // Deploy Strategy Version 2
  console.log('Deploying Zero-State Strategy...');
  const { error: d2Error } = await supabase.rpc('deploy_strategy', {
    p_market_id: marketId,
    p_version_id: version2.id
  });
  if (d2Error) throw d2Error;

  // Verify Board
  const { data: board2, error: b2Error } = await supabase.rpc('get_market_board', {
    target_market_id: marketId
  });
  if (b2Error) throw b2Error;

  console.log('Zero-State Board Length:', board2.length);
  if (board2.length !== 2) throw new Error(`Expected 2 tasks, got ${board2.length}`);

  const ghost1 = board2.find(t => t.origin_template_task_id === taskOpt1.id);
  const ghost2 = board2.find(t => t.origin_template_task_id === taskOpt2.id);

  if (!ghost1 || ghost1.is_ghost !== true || ghost1.status !== 'GHOST' || !ghost1.id.startsWith('temp_')) {
    throw new Error('Zero-State: Task 1 check failed (should be Ghost)');
  }
  if (!ghost2 || ghost2.is_ghost !== true || ghost2.status !== 'GHOST' || !ghost2.id.startsWith('temp_')) {
    throw new Error('Zero-State: Task 2 check failed (should be Ghost)');
  }
  console.log('Scenario 2 PASSED.');


  // --- Scenario 3: Accepted Optional (Hybrid -> Accepted) ---
  console.log('\n--- Scenario 3: Accepted Optional ---');

  // Reuse Scenario 1 Setup. Since we deployed Version 2, we need to deploy Version 1 again to get back to Hybrid state?
  // Or just create a new market for clarity. Let's create a new market.
  const { data: market2, error: market2Error } = await supabase.from('markets').insert({
    org_id: orgId,
    name: 'QA Market 2'
  }).select().single();
  if (market2Error) throw market2Error;

  // Deploy Version 1 (Hybrid) to Market 2
  console.log('Deploying Hybrid Strategy to Market 2...');
  await supabase.rpc('deploy_strategy', {
    p_market_id: market2.id,
    p_version_id: version1.id
  });

  // Verify initial state (1 Real, 1 Ghost)
  let { data: board3_init } = await supabase.rpc('get_market_board', { target_market_id: market2.id });
  // (Assuming it passes as per Scenario 1)

  // Manually insert the optional task (simulating acceptance)
  console.log('Manually accepting Optional Task...');
  const { error: acceptError } = await supabase.from('market_tasks').insert({
    market_id: market2.id,
    origin_template_task_id: taskOptional.id,
    status: 'TODO'
  });
  if (acceptError) throw acceptError;

  // Verify Board
  const { data: board3, error: b3Error } = await supabase.rpc('get_market_board', {
    target_market_id: market2.id
  });
  if (b3Error) throw b3Error;

  console.log('Accepted Board Length:', board3.length);
  if (board3.length !== 2) throw new Error(`Expected 2 tasks, got ${board3.length}`);

  const acceptedReal = board3.find(t => t.origin_template_task_id === taskOptional.id);
  const mandatoryReal = board3.find(t => t.origin_template_task_id === taskMandatory.id);

  if (!acceptedReal || acceptedReal.is_ghost !== false || acceptedReal.status !== 'TODO' || acceptedReal.id.startsWith('temp_')) {
    throw new Error('Accepted Optional: Task check failed (should be Real/TODO)');
  }
  if (!mandatoryReal || mandatoryReal.is_ghost !== false) {
     throw new Error('Accepted Optional: Mandatory task check failed (should still be Real)');
  }
  console.log('Scenario 3 PASSED.');

  console.log('\nALL VERIFICATION PASSED SUCCESSFULLY.');
}

main().catch(err => {
  console.error('\nVERIFICATION FAILED:', err);
  process.exit(1);
});
