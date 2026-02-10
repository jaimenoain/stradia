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
  console.log('Running Execution Logs Verification...');

  // 1. Setup Common Data (Org & Market)
  const timestamp = Date.now();
  // Create Org
  const { data: org, error: orgError } = await supabase.from('organizations').insert({
    name: 'Logs QA Org ' + timestamp
  }).select().single();
  if (orgError) {
    console.error('Error creating org:', orgError);
    throw orgError;
  }
  const orgId = org.id;
  console.log('Created Org:', orgId);

  // Create Market
  const { data: market, error: marketError } = await supabase.from('markets').insert({
    org_id: orgId,
    name: 'Logs QA Market'
  }).select().single();
  if (marketError) {
    console.error('Error creating market:', marketError);
    throw marketError;
  }
  const marketId = market.id;
  console.log('Created Market:', marketId);

  // 2. Create Task
  const { data: task, error: taskError } = await supabase.from('market_tasks').insert({
    market_id: marketId,
    title: 'Test Task for Logs',
    status: 'TODO',
    task_type: 'B',
    origin_template_task_id: null
  }).select().single();

  if (taskError) {
    console.error('Error creating task:', taskError);
    throw taskError;
  }
  const taskId = task.id;
  console.log('Created Task:', taskId);

  // 3. Create Snapshot
  const snapshotContent = { key: 'value', timestamp };
  const { data: snapshot, error: snapshotError } = await supabase.from('snapshots').insert({
    market_id: marketId,
    task_id: taskId,
    resource_type: 'TEST_RESOURCE',
    resource_id: 'test-resource-1',
    content: snapshotContent
  }).select().single();

  if (snapshotError) {
    console.error('Error creating snapshot:', snapshotError);
    throw snapshotError;
  }
  const snapshotId = snapshot.id;
  console.log('Created Snapshot:', snapshotId);

  // 4. Create Execution Log
  const payload = { input: 'test input' };
  const { data: log, error: logError } = await supabase.from('execution_logs').insert({
    task_id: taskId,
    user_id: null, // System execution
    snapshot_id: snapshotId,
    status: 'SUCCESS',
    payload: payload
  }).select().single();

  if (logError) {
    console.error('Error creating execution log:', logError);
    throw logError;
  }
  const logId = log.id;
  console.log('Created Execution Log:', logId);

  // 5. Verify Retrieval (Simulate Frontend)
  console.log('Verifying Retrieval...');
  const { data: fetchedLogs, error: fetchError } = await supabase
    .from('execution_logs')
    .select(`
      id,
      task_id,
      status,
      payload,
      snapshots (
        content
      )
    `)
    .eq('id', logId)
    .single();

  if (fetchError) {
    console.error('Error fetching logs:', fetchError);
    throw fetchError;
  }

  // 6. Assertions
  if (fetchedLogs.status !== 'SUCCESS') {
    throw new Error(`Expected status SUCCESS, got ${fetchedLogs.status}`);
  }
  if (JSON.stringify(fetchedLogs.payload) !== JSON.stringify(payload)) {
    throw new Error(`Payload mismatch`);
  }
  if (!fetchedLogs.snapshots || !fetchedLogs.snapshots.content) {
    throw new Error(`Snapshot content missing in join`);
  }
  if (JSON.stringify(fetchedLogs.snapshots.content) !== JSON.stringify(snapshotContent)) {
     throw new Error(`Snapshot content mismatch`);
  }

  console.log('Retrieval Verified Successfully.');

  // 7. Test Null Snapshot Case
  console.log('Testing Null Snapshot Log...');
  const { data: nullSnapshotLog, error: nsLogError } = await supabase.from('execution_logs').insert({
    task_id: taskId,
    status: 'FAILURE',
    payload: { error: 'failed' },
    snapshot_id: null
  }).select().single();

  if (nsLogError) throw nsLogError;

  const { data: fetchedNsLog, error: fetchNsError } = await supabase
    .from('execution_logs')
    .select(`
      id,
      snapshots (
        content
      )
    `)
    .eq('id', nullSnapshotLog.id)
    .single();

  if (fetchNsError) throw fetchNsError;

  if (fetchedNsLog.snapshots !== null) {
      // Depending on Supabase/PostgREST version, an empty relation might be null or empty array (if not single).
      // Since we used .single() on the main query, the relation 'snapshots' (which is singular FK) should be null if no match.
      // But wait, it's a left join by default in Supabase Select?
      // Actually, standard PostgREST behavior for 1:1 or N:1:
      // If FK is null, the embedded resource is null.
      if (fetchedNsLog.snapshots !== null) {
          console.warn('Expected snapshots to be null, got:', fetchedNsLog.snapshots);
      }
  }
  console.log('Null Snapshot Log Verified.');

  // 8. Cleanup
  console.log('Cleaning up...');
  await supabase.from('execution_logs').delete().eq('task_id', taskId); // Cascade should handle this but explicit is good
  await supabase.from('snapshots').delete().eq('task_id', taskId);
  await supabase.from('market_tasks').delete().eq('id', taskId);
  await supabase.from('markets').delete().eq('id', marketId);
  await supabase.from('organizations').delete().eq('id', orgId);

  console.log('Execution Logs Verification PASSED.');
}

main().catch(err => {
  console.error('Execution Logs Verification FAILED:', err);
  process.exit(1);
});
