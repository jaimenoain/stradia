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
  const email = 'e2e-test-user@example.com';
  const password = 'password123';

  // Create or get user
  let userId;
  const { data: users, error: listError } = await supabase.auth.admin.listUsers();
  const existingUser = users?.users.find(u => u.email === email);

  if (existingUser) {
    userId = existingUser.id;
    console.log('User already exists:', userId);
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error) throw error;
    userId = data.user.id;
    console.log('Created user:', userId);
  }

  // Ensure Org
  let orgId;
  const { data: orgs } = await supabase.from('organizations').select('id').eq('owner_id', userId);
  if (orgs && orgs.length > 0) {
    orgId = orgs[0].id;
    console.log('Org already exists:', orgId);
  } else {
    const { data, error } = await supabase.from('organizations').insert({
      name: 'E2E Org',
      owner_id: userId
    }).select().single();
    if (error) throw error;
    orgId = data.id;
    console.log('Created org:', orgId);
  }

  // Link profile
  await supabase.from('profiles').update({ org_id: orgId }).eq('user_id', userId);

  // Ensure Market (needed for app access generally)
  const { data: markets } = await supabase.from('markets').select('id').eq('org_id', orgId);
  let marketId;
  if (markets && markets.length > 0) {
      marketId = markets[0].id;
  } else {
      const { data, error } = await supabase.from('markets').insert({
          org_id: orgId,
          name: 'E2E Market'
      }).select().single();
      if (error) throw error;
      marketId = data.id;
  }

  // Ensure Template
  let templateId;
  const { data: templates } = await supabase.from('templates').select('id').eq('owner_org_id', orgId);
  if (templates && templates.length > 0) {
    templateId = templates[0].id;
    console.log('Template already exists:', templateId);
  } else {
    const { data, error } = await supabase.from('templates').insert({
      owner_org_id: orgId,
      name: 'E2E Template',
      description: 'Template for E2E tests'
    }).select().single();
    if (error) throw error;
    templateId = data.id;
    console.log('Created template:', templateId);
  }

  // Ensure Draft Version
  let versionId;
  const { data: versions } = await supabase.from('template_versions')
    .select('id')
    .eq('template_id', templateId)
    .eq('status', 'DRAFT');

  if (versions && versions.length > 0) {
    versionId = versions[0].id;
    console.log('Draft version already exists:', versionId);
  } else {
    const { data, error } = await supabase.from('template_versions').insert({
      template_id: templateId,
      version_string: '0.0.1',
      status: 'DRAFT',
      changelog: 'Initial E2E draft'
    }).select().single();
    if (error) throw error;
    versionId = data.id;
    console.log('Created draft version:', versionId);
  }

  // Ensure Task
  let taskId;
  const { data: tasks } = await supabase.from('template_tasks').select('id').eq('template_version_id', versionId);
  if (tasks && tasks.length > 0) {
      taskId = tasks[0].id;
      console.log('Task already exists:', taskId);
  } else {
      const { data, error } = await supabase.from('template_tasks').insert({
          template_version_id: versionId,
          title: 'E2E Task',
          task_type: 'A',
          description: '<p>Initial description</p>'
      }).select().single();
      if (error) throw error;
      taskId = data.id;
      console.log('Created task:', taskId);
  }

  console.log('SETUP COMPLETE');
  console.log(JSON.stringify({ email, password, userId, orgId, marketId, templateId, versionId, taskId }));
}

main().catch(console.error);
