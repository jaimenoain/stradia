import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

// Load .env.local manually
const envPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8')
  envConfig.split('\n').forEach((line) => {
    const [key, ...valueParts] = line.split('=')
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=')
      process.env[key.trim()] = value.trim().replace(/^"|"$/g, '')
    }
  })
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    'Skipping verification: Missing environment variables NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.'
  )
  process.exit(0)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function main() {
  console.log('Running Integrity Scoring Verification...')

  // 1. Setup Common Data (Org & Market)
  const timestamp = Date.now()
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .insert({
      name: 'Scoring QA Org ' + timestamp,
    })
    .select()
    .single()

  if (orgError) {
    console.error('Error creating org:', orgError)
    throw orgError
  }
  const orgId = org.id
  console.log('Created Org:', orgId)

  const { data: market, error: marketError } = await supabase
    .from('markets')
    .insert({
      org_id: orgId,
      name: 'Scoring QA Market',
    })
    .select()
    .single()

  if (marketError) {
    console.error('Error creating market:', marketError)
    throw marketError
  }
  const marketId = market.id
  console.log('Created Market:', marketId)

  // 2. Setup Template & Tasks
  const { data: template, error: templateError } = await supabase
    .from('templates')
    .insert({
      owner_org_id: orgId,
      name: 'Scoring QA Template',
    })
    .select()
    .single()

  if (templateError) throw templateError
  const templateId = template.id

  const { data: version, error: versionError } = await supabase
    .from('template_versions')
    .insert({
      template_id: templateId,
      version_string: '1.0.0',
      status: 'DRAFT',
    })
    .select()
    .single()

  if (versionError) throw versionError
  const versionId = version.id

  // Create 2 Global Tasks (Weight 1 and 3)
  const { data: tasks, error: tasksError } = await supabase
    .from('template_tasks')
    .insert([
      {
        template_version_id: versionId,
        title: 'Task 1 (Weight 1)',
        task_type: 'A',
        weight: 1,
      },
      {
        template_version_id: versionId,
        title: 'Task 2 (Weight 3)',
        task_type: 'A',
        weight: 3,
      },
    ])
    .select()

  if (tasksError) throw tasksError
  // Sort tasks to ensure deterministic assignment
  const sortedTasks = tasks.sort((a, b) => a.weight - b.weight)
  const task1 = sortedTasks[0] // Weight 1
  const task2 = sortedTasks[1] // Weight 3

  // 3. Deploy Strategy (Populate market_tasks)
  console.log('Inserting Market Tasks...')
  const { data: mt1, error: mt1Error } = await supabase
    .from('market_tasks')
    .insert({
      market_id: marketId,
      origin_template_task_id: task1.id,
      status: 'TODO',
    })
    .select()
    .single()
  if (mt1Error) throw mt1Error

  const { data: mt2, error: mt2Error } = await supabase
    .from('market_tasks')
    .insert({
      market_id: marketId,
      origin_template_task_id: task2.id,
      status: 'TODO',
    })
    .select()
    .single()
  if (mt2Error) throw mt2Error

  // 4. Verify Initial Score (0)
  // Wait a bit for trigger
  await new Promise((r) => setTimeout(r, 1000))

  const { data: score0, error: score0Error } = await supabase
    .from('market_scores')
    .select('*')
    .eq('market_id', marketId)
    .single()

  if (score0Error) throw score0Error
  console.log('Initial Score:', score0.integrity_score)
  if (Number(score0.integrity_score) !== 0) {
    throw new Error(`Expected score 0, got ${score0.integrity_score}`)
  }

  // 5. Update Task 1 to DONE (Weight 1 / Total 4 = 25%)
  console.log('Updating Task 1 to DONE...')
  const { error: update1Error } = await supabase
    .from('market_tasks')
    .update({ status: 'DONE' })
    .eq('id', mt1.id)

  if (update1Error) throw update1Error
  await new Promise((r) => setTimeout(r, 1000))

  const { data: score1, error: score1Error } = await supabase
    .from('market_scores')
    .select('*')
    .eq('market_id', marketId)
    .single()

  if (score1Error) throw score1Error
  console.log('Score after Task 1 DONE:', score1.integrity_score)
  if (Number(score1.integrity_score) !== 25) {
    throw new Error(`Expected score 25, got ${score1.integrity_score}`)
  }

  // 6. Update Task 2 to DONE (Weight 4 / Total 4 = 100%)
  console.log('Updating Task 2 to DONE...')
  const { error: update2Error } = await supabase
    .from('market_tasks')
    .update({ status: 'DONE' })
    .eq('id', mt2.id)

  if (update2Error) throw update2Error
  await new Promise((r) => setTimeout(r, 1000))

  const { data: score2, error: score2Error } = await supabase
    .from('market_scores')
    .select('*')
    .eq('market_id', marketId)
    .single()

  if (score2Error) throw score2Error
  console.log('Score after Task 2 DONE:', score2.integrity_score)
  if (Number(score2.integrity_score) !== 100) {
    throw new Error(`Expected score 100, got ${score2.integrity_score}`)
  }

  // 7. Update Task 1 to DRIFTED (Weight 3 / Total 4 = 75%)
  console.log('Updating Task 1 to DRIFTED...')
  const { error: update3Error } = await supabase
    .from('market_tasks')
    .update({ status: 'DRIFTED' })
    .eq('id', mt1.id)

  if (update3Error) throw update3Error
  await new Promise((r) => setTimeout(r, 1000))

  const { data: score3, error: score3Error } = await supabase
    .from('market_scores')
    .select('*')
    .eq('market_id', marketId)
    .single()

  if (score3Error) throw score3Error
  console.log('Score after Task 1 DRIFTED:', score3.integrity_score)
  if (Number(score3.integrity_score) !== 75) {
    throw new Error(`Expected score 75, got ${score3.integrity_score}`)
  }

  // 8. Delete Task 2 (Weight 1 remains, which is DRIFTED. Score should be 0.)
  console.log('Deleting Task 2...')
  const { error: deleteError } = await supabase
    .from('market_tasks')
    .delete()
    .eq('id', mt2.id)

  if (deleteError) throw deleteError
  await new Promise((r) => setTimeout(r, 1000))

  const { data: score4, error: score4Error } = await supabase
    .from('market_scores')
    .select('*')
    .eq('market_id', marketId)
    .single()

  if (score4Error) throw score4Error
  console.log('Score after Task 2 Deleted:', score4.integrity_score)
  if (Number(score4.integrity_score) !== 0) {
    throw new Error(`Expected score 0, got ${score4.integrity_score}`)
  }

  // Cleanup
  console.log('Cleaning up...')
  // Deleting org cascades to markets, strategies, tasks, scores
  await supabase.from('organizations').delete().eq('id', orgId)

  console.log('Integrity Scoring Verification PASSED.')
}

main().catch((err) => {
  console.error('Integrity Scoring Verification FAILED:', err)
  process.exit(1)
})
