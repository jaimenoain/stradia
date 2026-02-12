import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load .env.local or .env manually
const loadEnv = (filePath: string) => {
  if (fs.existsSync(filePath)) {
    const envConfig = fs.readFileSync(filePath, 'utf8');
    envConfig.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=');
        // Only set if not already set
        if (!process.env[key.trim()]) {
           process.env[key.trim()] = value.trim().replace(/^"|"$/g, '');
        }
      }
    });
  }
};

loadEnv(path.resolve(process.cwd(), '.env.local'));
loadEnv(path.resolve(process.cwd(), '.env'));

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('Skipping verification: Missing environment variables NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function main() {
  console.log('Running Signup Trigger Verification...');

  const timestamp = Date.now();
  const testEmail = `testuser_${timestamp}@example.com`;
  const testPassword = 'testpassword123';
  const orgName = `Test Org ${timestamp}`;

  let userId: string | null = null;
  let orgId: string | null = null;
  let exitCode = 0;

  try {
    // Step 1: Create a dummy user in auth.users
    console.log(`Creating dummy user: ${testEmail}...`);
    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
    });

    if (userError) throw new Error(`Failed to create user: ${userError.message}`);
    userId = userData.user.id;
    console.log(`User created with ID: ${userId}`);

    // Wait for public.profiles creation (triggered by auth.users insert)
    console.log('Waiting for public.profiles entry...');
    let profileCreated = false;
    for (let i = 0; i < 5; i++) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('user_id', userId)
            .single();
        if (profile) {
            profileCreated = true;
            break;
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    if (!profileCreated) {
        throw new Error('Timeout waiting for public.profiles entry creation.');
    }
    console.log('Profile entry confirmed.');


    // Step 2: Insert a new row into public.organizations
    console.log(`Creating organization: ${orgName} with owner_id: ${userId}...`);
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: orgName,
        owner_id: userId,
      })
      .select()
      .single();

    if (orgError) throw new Error(`Failed to create organization: ${orgError.message}`);
    orgId = orgData.id;
    console.log(`Organization created with ID: ${orgId}`);

    // Step 3: Wait for trigger to fire
    console.log('Waiting 2 seconds for trigger to fire...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 4: Fetch user's row from public.profiles
    console.log('Fetching user profile...');
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (profileError) throw new Error(`Failed to fetch profile: ${profileError.message}`);

    // Step 5: Assertion
    console.log(`Profile org_id: ${profileData.org_id}`);
    console.log(`Expected org_id: ${orgId}`);

    if (profileData.org_id === orgId) {
      console.log('SUCCESS: Database Trigger linked profile correctly');
    } else {
      console.error('FAILURE: Profile org_id does not match created organization ID');
      throw new Error('Verification Failed');
    }

  } catch (error) {
    console.error('An error occurred during verification:', error);
    exitCode = 1;
  } finally {
    // Step 6: Cleanup
    console.log('Cleaning up...');
    if (orgId) {
        // Delete organization first (assuming cascade or explicit delete needed)
        const { error: delOrgError } = await supabase
            .from('organizations')
            .delete()
            .eq('id', orgId);
        if (delOrgError) console.error('Error deleting organization:', delOrgError);
        else console.log('Organization deleted.');
    }

    if (userId) {
        const { error: delUserError } = await supabase.auth.admin.deleteUser(userId);
         if (delUserError) console.error('Error deleting user:', delUserError);
         else console.log('User deleted.');
    }

    if (exitCode !== 0) {
        process.exit(exitCode);
    }
  }
}

main();
