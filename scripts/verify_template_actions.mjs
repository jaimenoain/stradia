import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing environment variables.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function main() {
  console.log('Starting Template Actions Verification...')

  let userId = null
  let orgId = null
  let templateId = null

  try {
    // Setup User & Org
    const email = `test-admin-${Date.now()}@example.com`
    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
      email,
      password: 'password123',
      email_confirm: true
    })
    if (userError) throw userError
    userId = userData.user.id

    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .insert({ name: 'Test Org', owner_id: userId })
      .select()
      .single()
    if (orgError) throw orgError
    orgId = orgData.id

    // Create Template
    const { data: template, error: templateError } = await supabase
      .from('templates')
      .insert({ owner_org_id: orgId, name: 'Action Test Template' })
      .select()
      .single()
    if (templateError) throw templateError
    templateId = template.id
    console.log(`Created Template: ${templateId}`)

    // Create Initial Version (1.0 DRAFT)
    const { data: v1, error: v1Error } = await supabase
      .from('template_versions')
      .insert({ template_id: templateId, version_string: '1.0', status: 'DRAFT' })
      .select()
      .single()
    if (v1Error) throw v1Error
    console.log(`Created Version 1.0: ${v1.id}`)

    // Add Task to v1
    const { error: taskError } = await supabase
      .from('template_tasks')
      .insert({
        template_version_id: v1.id,
        title: 'Task 1',
        task_type: 'A',
        task_config: { foo: 'bar' }
      })
    if (taskError) throw taskError
    console.log('Added Task 1 to v1')

    // --- SIMULATE PUBLISH ACTION ---
    console.log('\nSimulating Publish Action...')
    const { error: publishError } = await supabase
      .from('template_versions')
      .update({ status: 'PUBLISHED' })
      .eq('id', v1.id)
    if (publishError) throw publishError
    console.log('Published v1.0')

    // Verify
    const { data: v1Verify } = await supabase
      .from('template_versions')
      .select('status')
      .eq('id', v1.id)
      .single()
    if (v1Verify?.status !== 'PUBLISHED') throw new Error('Failed to publish')
    console.log('Verified v1.0 is PUBLISHED')


    // --- SIMULATE CREATE DRAFT ACTION ---
    console.log('\nSimulating Create Draft Action...')

    // 1. Fetch latest
    const { data: versions } = await supabase
      .from('template_versions')
      .select('*')
      .eq('template_id', templateId)
      .order('created_at', { ascending: false })
      .limit(1)

    const latest = versions[0]
    const newVersionString = incrementVersion(latest.version_string)
    console.log(`New Version String: ${newVersionString}`)

    // 2. Create new version
    const { data: v2, error: v2Error } = await supabase
      .from('template_versions')
      .insert({ template_id: templateId, version_string: newVersionString, status: 'DRAFT' })
      .select()
      .single()
    if (v2Error) throw v2Error
    console.log(`Created Version ${newVersionString}: ${v2.id}`)

    // 3. Copy tasks
    const { data: tasksToCopy } = await supabase
      .from('template_tasks')
      .select('*')
      .eq('template_version_id', latest.id)

    if (tasksToCopy && tasksToCopy.length > 0) {
      const newTasks = tasksToCopy.map(t => ({
        template_version_id: v2.id,
        title: t.title,
        description: t.description,
        task_type: t.task_type,
        weight: t.weight,
        is_optional: t.is_optional,
        task_config: t.task_config
      }))

      const { error: copyError } = await supabase
        .from('template_tasks')
        .insert(newTasks)
      if (copyError) throw copyError
      console.log(`Copied ${tasksToCopy.length} tasks to v2`)
    }

    // Verify v2 tasks
    const { count } = await supabase
      .from('template_tasks')
      .select('*', { count: 'exact', head: true })
      .eq('template_version_id', v2.id)

    if (count !== 1) throw new Error(`Expected 1 task in v2, found ${count}`)
    console.log('Verified v2 has correct number of tasks')

    console.log('\nALL ACTIONS VERIFIED SUCCESSFULLY')

  } catch (err) {
    console.error('\nVERIFICATION FAILED:', err.message)
    process.exit(1)
  } finally {
    // Cleanup
    if (orgId) await supabase.from('organizations').delete().eq('id', orgId)
    if (userId) await supabase.auth.admin.deleteUser(userId)
  }
}

function incrementVersion(v) {
  const parts = v.split('.')
  const last = parts[parts.length - 1]
  const num = parseInt(last, 10)
  if (!isNaN(num)) {
    parts[parts.length - 1] = (num + 1).toString()
    return parts.join('.')
  }
  return v + '.1'
}

main()
