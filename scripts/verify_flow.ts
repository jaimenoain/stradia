import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing environment variables.');
  process.exit(1);
}

const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  // Check admin connection
  const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
  if (listError) {
    console.error('Failed to list users with admin client:', listError);
    process.exit(1);
  }
  console.log(`Admin client connected. User count: ${users.users.length}`);

  const email = `jules${Date.now()}@test.com`;
  const password = 'Password123!';

  console.log(`1. Creating user via Admin: ${email}`);
  const { data: { user }, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (signUpError) {
    console.error('User creation failed:', signUpError);
    process.exit(1);
  }

  if (!user) {
    console.error('No user returned from signup');
    process.exit(1);
  }

  console.log('   User created:', user.id);

  console.log('2. Verifying profile creation (trigger)...');
  // Wait a bit for trigger
  let profile = null;
  for (let i = 0; i < 10; i++) {
    const { data } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (data) {
      profile = data;
      break;
    }
    await new Promise(r => setTimeout(r, 500));
  }

  if (!profile) {
    console.error('Profile not created via trigger.');
    // Cleanup
    await supabaseAdmin.auth.admin.deleteUser(user.id);
    process.exit(1);
  }

  console.log('   Profile found:', profile);

  console.log('3. Verifying org_id is NULL...');
  if (profile.org_id !== null) {
    console.error('Profile org_id is not null:', profile.org_id);
    await supabaseAdmin.auth.admin.deleteUser(user.id);
    process.exit(1);
  }
  console.log('   Confirmed org_id is NULL.');

  // Try to sign in to get a fresh session/token if needed
  const { data: { session }, error: signInError } = await supabaseAnon.auth.signInWithPassword({
    email,
    password,
  });

  let userClient = supabaseAnon;

  if (signInError) {
    console.log('   Sign in failed:', signInError.message);
    // If we can't sign in, maybe confirm email?
    // But we'll assume we can't proceed as user if sign in fails.
    await supabaseAdmin.auth.admin.deleteUser(user.id);
    process.exit(1);
  }

  if (!session) {
    console.log('   No session returned. Email confirmation likely required.');
    await supabaseAdmin.auth.admin.deleteUser(user.id);
    process.exit(1);
  }

  // Create client for user
  userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${session.access_token}` } }
  });

  console.log('4. Creating Organization as User...');
  const orgName = `Org for ${email}`;

  // Insert Organization
  const { data: org, error: orgError } = await userClient
    .from('organizations')
    .insert({ name: orgName, owner_id: user.id })
    .select()
    .single();

  if (orgError) {
    console.error('Failed to create organization:', orgError);
    await supabaseAdmin.auth.admin.deleteUser(user.id);
    process.exit(1);
  }

  console.log('   Organization created:', org);

  console.log('5. Updating Profile with org_id as User...');
  const { error: updateError } = await userClient
    .from('profiles')
    .update({ org_id: org.id })
    .eq('user_id', user.id);

  if (updateError) {
    console.error('Failed to update profile:', updateError);
    await supabaseAdmin.from('organizations').delete().eq('id', org.id);
    await supabaseAdmin.auth.admin.deleteUser(user.id);
    process.exit(1);
  }

  console.log('   Profile updated.');

  console.log('6. Verifying Final State...');
  const { data: finalProfile } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (finalProfile.org_id !== org.id) {
    console.error('Final profile org_id mismatch:', finalProfile.org_id, 'expected', org.id);
    process.exit(1);
  }

  console.log('   SUCCESS: Profile correctly linked to Organization.');

  console.log('7. Cleanup...');
  await supabaseAdmin.auth.admin.deleteUser(user.id);
  // Delete org manually since cascading might not be set up from user -> org (since user owns org but isn't FKed on id)
  // org -> owner_id is FK. If user is deleted, what happens?
  // `owner_id uuid references auth.users(id)`
  // If it doesn't say `on delete cascade`, it might block user deletion OR set null.
  // The migration `20240524000000_fix_org_rls.sql` just said `references auth.users(id)`. Default is NO ACTION or RESTRICT.
  // So we probably need to delete org first.

  const { error: delOrgError } = await supabaseAdmin.from('organizations').delete().eq('id', org.id);
  if (delOrgError) {
     console.log('   Warning: Failed to delete org:', delOrgError.message);
     // It might be that we need to delete user first if cascade is configured? No, if restrict, we must delete child first.
  } else {
     console.log('   Org deleted.');
  }

  // Verify user deletion
  const { error: delUserError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
  if (delUserError) {
      console.error('   Failed to delete user:', delUserError.message);
  } else {
      console.log('   User deleted.');
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
