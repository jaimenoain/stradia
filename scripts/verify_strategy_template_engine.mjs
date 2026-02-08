import { createClient } from '@supabase/supabase-js';

// Use values from environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Error: Missing environment variables NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  console.error('Usage: NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/verify_strategy_template_engine.mjs');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function main() {
  console.log('Starting Strategy Template Engine Verification...');
  let orgId = null;
  let userId = null;

  try {
    // 1. Schema Existence Verification (Implicit via operations)
    console.log('\n--- 1. Schema Verification ---');
    console.log('Skipping direct schema query. Will verify via functional usage.');

    // 2. Immutability Verification
    console.log('\n--- 2. Immutability Verification ---');

    // Create Test User
    const email = `test-qa-${Date.now()}@example.com`;
    const password = 'password123';
    console.log(`Creating test user: ${email}`);
    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (userError || !userData.user) throw new Error(`Failed to create user: ${userError?.message}`);
    userId = userData.user.id;

    // Create Organization
    console.log('Creating organization...');
    // We need to create an organization directly or via action simulation.
    // Direct insert is faster for verification.
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .insert({ name: 'QA Org', owner_id: userId })
      .select()
      .single();

    if (orgError || !orgData) throw new Error(`Failed to create org: ${orgError?.message}`);
    orgId = orgData.id;

    // Link Profile (Trigger might have done it, but update org_id)
    await supabase.from('profiles').update({ org_id: orgId }).eq('user_id', userId);

    // Create Template
    console.log('Creating template...');
    const { data: templateData, error: templateError } = await supabase
      .from('templates')
      .insert({
        owner_org_id: orgId,
        name: 'QA Template',
        description: 'Test Description'
      })
      .select()
      .single();

    if (templateError || !templateData) throw new Error(`Failed to create template: ${templateError?.message}`);
    const templateId = templateData.id;

    // Create PUBLISHED Version
    console.log('Creating PUBLISHED version...');
    const { data: versionData, error: versionError } = await supabase
      .from('template_versions')
      .insert({
        template_id: templateId,
        version_string: '1.0.0',
        status: 'PUBLISHED',
        changelog: 'Initial release'
      })
      .select()
      .single();

    if (versionError || !versionData) throw new Error(`Failed to create version: ${versionError?.message}`);
    const versionId = versionData.id;

    // TEST 1: Update Published Version
    console.log('TEST 1: Attempting to update PUBLISHED version (should fail)...');
    const { error: updateError } = await supabase
      .from('template_versions')
      .update({ changelog: 'Updated Changelog' })
      .eq('id', versionId);

    if (!updateError) {
      throw new Error('FAIL: Updated PUBLISHED version! Immutability check failed.');
    } else {
      console.log('PASS: Update failed as expected:', updateError.message);
    }

    // TEST 2: Delete Published Version
    console.log('TEST 2: Attempting to delete PUBLISHED version (should fail)...');
    const { error: deleteError } = await supabase
      .from('template_versions')
      .delete()
      .eq('id', versionId);

    if (!deleteError) {
      throw new Error('FAIL: Deleted PUBLISHED version! Immutability check failed.');
    } else {
      console.log('PASS: Delete failed as expected:', deleteError.message);
    }

    // TEST 3: Insert Task into Published Version
    console.log('TEST 3: Attempting to insert task into PUBLISHED version (should fail)...');
    const { error: insertTaskError } = await supabase
      .from('template_tasks')
      .insert({
        template_version_id: versionId,
        title: 'New Task',
        task_type: 'A',
        task_config: { key: 'value' } // Checking JSONB here too
      });

    if (!insertTaskError) {
      throw new Error('FAIL: Inserted task into PUBLISHED version! Immutability check failed.');
    } else {
      console.log('PASS: Insert task failed as expected:', insertTaskError.message);
    }

    // Check JSONB column existence implicitly by creating a DRAFT version and inserting a task
    console.log('Verifying JSONB column exists via Draft version...');
    const { data: draftVersion, error: draftError } = await supabase
      .from('template_versions')
      .insert({
        template_id: templateId,
        version_string: '1.0.1',
        status: 'DRAFT'
      })
      .select()
      .single();

    if (draftError) throw new Error(`Failed to create draft version: ${draftError.message}`);

    if (draftVersion) {
      const { error: jsonbError } = await supabase
        .from('template_tasks')
        .insert({
          template_version_id: draftVersion.id,
          title: 'Draft Task',
          task_type: 'A',
          task_config: { foo: 'bar' }
        });

      if (jsonbError) throw new Error(`FAIL: Could not insert JSONB task_config: ${jsonbError.message}`);
      console.log('PASS: JSONB task_config verified.');
    }

    console.log('\nALL TESTS PASSED');

  } catch (err) {
    console.error('\nTEST FAILED:', err.message);
    process.exitCode = 1;
  } finally {
     // Cleanup
     if (userId || orgId) {
        console.log('Cleaning up...');
        try {
            if (orgId) await supabase.from('organizations').delete().eq('id', orgId);
            if (userId) await supabase.auth.admin.deleteUser(userId);
        } catch (cleanupErr) {
            console.error('Error during cleanup:', cleanupErr);
        }
     }
  }
}

main();
