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
  console.log('Verifying system_prompt storage in task_config...');

  // 1. Create a dummy task with system_prompt in task_config
  // We need a valid template_version_id. I'll fetch one or create if needed.
  // For simplicity, let's just try to find an existing one.
  const { data: versions } = await supabase.from('template_versions').select('id').limit(1);

  if (!versions || versions.length === 0) {
      console.log('No template versions found. Please run setup-e2e-data.mjs first.');
      process.exit(1);
  }

  const versionId = versions[0].id;
  const systemPrompt = "You are a helpful assistant that outputs JSON.";

  const { data: task, error } = await supabase.from('template_tasks').insert({
      template_version_id: versionId,
      title: 'System Prompt Test Task',
      task_type: 'B', // Using B as it's typically Generative
      task_config: {
          system_prompt: systemPrompt,
          other_config: 'value'
      }
  }).select().single();

  if (error) {
      console.error('Error inserting task:', error);
      process.exit(1);
  }

  console.log('Task inserted with ID:', task.id);

  // 2. Retrieve the task and check task_config
  const { data: retrievedTask, error: retrieveError } = await supabase
      .from('template_tasks')
      .select('task_config')
      .eq('id', task.id)
      .single();

  if (retrieveError) {
      console.error('Error retrieving task:', retrieveError);
      process.exit(1);
  }

  if (retrievedTask.task_config.system_prompt === systemPrompt) {
      console.log('SUCCESS: system_prompt correctly stored and retrieved from task_config.');
  } else {
      console.error('FAILURE: system_prompt mismatch.', retrievedTask.task_config);
      process.exit(1);
  }

  // Cleanup
  await supabase.from('template_tasks').delete().eq('id', task.id);
  console.log('Cleanup complete.');
}

main().catch(console.error);
