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
  console.log('Running Market Scoring Trigger Verification...');

  // 1. Setup Data
  const timestamp = Date.now();
  const orgName = `ScoreTest Org ${timestamp}`;

  // Create Org
  const { data: org, error: orgError } = await supabase.from('organizations').insert({
    name: orgName
  }).select().single();
  if (orgError) throw orgError;
  const orgId = org.id;
  console.log('Created Org:', orgId);

  // Create Market
  const { data: market, error: marketError } = await supabase.from('markets').insert({
    org_id: orgId,
    name: 'ScoreTest Market'
  }).select().single();
  if (marketError) throw marketError;
  const marketId = market.id;
  console.log('Created Market:', marketId);

  // Create Template & Version
  const { data: template, error: tmplError } = await supabase.from('templates').insert({
    owner_org_id: orgId,
    name: 'ScoreTest Template'
  }).select().single();
  if (tmplError) throw tmplError;

  const { data: version, error: verError } = await supabase.from('template_versions').insert({
    template_id: template.id,
    version_string: `1.0.${timestamp}`,
    status: 'DRAFT'
  }).select().single();
  if (verError) throw verError;

  // Create Global Task Template (Weight 10)
  const { data: templateTask, error: ttError } = await supabase.from('template_tasks').insert({
    template_version_id: version.id,
    title: 'Global Task 1',
    task_type: 'A',
    weight: 10
  }).select().single();
  if (ttError) throw ttError;
  const templateTaskId = templateTask.id;


  // 2. Test Logic

  // A. Insert "Local Task" (DONE)
  console.log('Inserting Local Task (DONE)...');
  const { error: localTaskError } = await supabase.from('market_tasks').insert({
    market_id: marketId,
    origin_template_task_id: null,
    status: 'DONE',
    title: 'Local Task 1',
    task_type: 'A'
  });
  if (localTaskError) throw localTaskError;

  // Assert Score is 0 (Global Only Invariant + Division by Zero check)
  let { data: scoreRow, error: scoreError } = await supabase.from('market_scores').select('integrity_score').eq('market_id', marketId).single();

  // Note: If row doesn't exist, logic failed (trigger didn't fire).
  if (scoreError) throw new Error(`Failed to fetch score: ${scoreError.message}`);

  console.log(`Score after Local Task DONE: ${scoreRow.integrity_score}`);
  if (scoreRow.integrity_score !== 0) {
    throw new Error(`Expected Score 0, got ${scoreRow.integrity_score}`);
  }


  // B. Insert "Global Task" (TODO)
  console.log('Inserting Global Task (TODO)...');
  const { error: globalTaskError } = await supabase.from('market_tasks').insert({
    market_id: marketId,
    origin_template_task_id: templateTaskId,
    status: 'TODO'
  });
  if (globalTaskError) throw globalTaskError;

  // Assert Score is 0
  ({ data: scoreRow, error: scoreError } = await supabase.from('market_scores').select('integrity_score').eq('market_id', marketId).single());
  console.log(`Score after Global Task TODO: ${scoreRow.integrity_score}`);
  if (scoreRow.integrity_score !== 0) {
    throw new Error(`Expected Score 0, got ${scoreRow.integrity_score}`);
  }


  // C. Mark Global Task DONE
  console.log('Updating Global Task to DONE...');
  const { error: updateError } = await supabase.from('market_tasks')
    .update({ status: 'DONE' })
    .eq('market_id', marketId)
    .eq('origin_template_task_id', templateTaskId);
  if (updateError) throw updateError;

  // Assert Score is 100
  ({ data: scoreRow, error: scoreError } = await supabase.from('market_scores').select('integrity_score').eq('market_id', marketId).single());
  console.log(`Score after Global Task DONE: ${scoreRow.integrity_score}`);
  if (scoreRow.integrity_score !== 100) {
    throw new Error(`Expected Score 100, got ${scoreRow.integrity_score}`);
  }


  // D. Mark Global Task DRIFTED
  console.log('Updating Global Task to DRIFTED...');
  const { error: driftError } = await supabase.from('market_tasks')
    .update({ status: 'DRIFTED' })
    .eq('market_id', marketId)
    .eq('origin_template_task_id', templateTaskId);
  if (driftError) throw driftError;

  // Assert Score is 0 (Drift Penalty)
  ({ data: scoreRow, error: scoreError } = await supabase.from('market_scores').select('integrity_score').eq('market_id', marketId).single());
  console.log(`Score after Global Task DRIFTED: ${scoreRow.integrity_score}`);
  if (scoreRow.integrity_score !== 0) {
    throw new Error(`Expected Score 0, got ${scoreRow.integrity_score}`);
  }


  // Cleanup
  console.log('Cleaning up...');
  await supabase.from('market_tasks').delete().eq('market_id', marketId);
  await supabase.from('markets').delete().eq('id', marketId);
  await supabase.from('organizations').delete().eq('id', orgId);
  // Templates cascade delete? Only if org deleted?
  // Templates reference org with set null. So delete explicitly.
  await supabase.from('templates').delete().eq('id', template.id);

  console.log('Verification PASSED.');
}

main().catch(err => {
  console.error('Verification FAILED:', err);
  process.exit(1);
});
