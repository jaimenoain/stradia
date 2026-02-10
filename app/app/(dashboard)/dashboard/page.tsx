import { createClient } from '@/lib/supabase/server'
import { DensityMatrix, MatrixData, MatrixMarket, MatrixTemplate } from '@/components/dashboard/density-matrix'

export default async function SatelliteViewPage() {
  const supabase = await createClient()

  // 1. Fetch Markets
  const { data: markets, error: marketsError } = await supabase
    .from('markets')
    .select('id, name')
    .order('name')

  if (marketsError || !markets) {
    console.error('Error fetching markets:', marketsError)
    return <div className="p-8 text-destructive">Error loading markets. Please try again later.</div>
  }

  // 2. Fetch Templates and their versions
  // We need to know which version belongs to which template
  const { data: templates, error: templatesError } = await supabase
    .from('templates')
    .select('id, name, template_versions(id)')
    .order('name')

  if (templatesError || !templates) {
    console.error('Error fetching templates:', templatesError)
    return <div className="p-8 text-destructive">Error loading templates. Please try again later.</div>
  }

  // 3. Fetch Market Strategies (Deployments)
  const { data: strategies, error: strategiesError } = await supabase
    .from('market_strategies')
    .select('market_id, template_version_id')

  if (strategiesError || !strategies) {
    console.error('Error fetching strategies:', strategiesError)
    return <div className="p-8 text-destructive">Error loading strategies. Please try again later.</div>
  }

  // 4. Fetch Mandatory Template Tasks
  const { data: mandatoryTasks, error: mandatoryTasksError } = await supabase
    .from('template_tasks')
    .select('id, template_version_id')
    .eq('is_optional', false)

  if (mandatoryTasksError || !mandatoryTasks) {
    console.error('Error fetching mandatory tasks:', mandatoryTasksError)
    return <div className="p-8 text-destructive">Error loading tasks. Please try again later.</div>
  }

  // Map: Version ID -> Set of Mandatory Task IDs
  const versionMandatoryTasks = new Map<string, Set<string>>()
  mandatoryTasks.forEach((task) => {
    if (!versionMandatoryTasks.has(task.template_version_id)) {
      versionMandatoryTasks.set(task.template_version_id, new Set())
    }
    versionMandatoryTasks.get(task.template_version_id)!.add(task.id)
  })

  // 5. Fetch Done Market Tasks
  // Optimize: only fetch tasks that are DONE.
  const { data: doneTasks, error: doneTasksError } = await supabase
    .from('market_tasks')
    .select('market_id, origin_template_task_id')
    .eq('status', 'DONE')

  if (doneTasksError || !doneTasks) {
    console.error('Error fetching done tasks:', doneTasksError)
    return <div className="p-8 text-destructive">Error loading task status. Please try again later.</div>
  }

  // Map: Market ID -> Set of Done Task IDs (origin_template_task_id)
  const marketDoneTasks = new Map<string, Set<string>>()
  doneTasks.forEach((task) => {
    if (!marketDoneTasks.has(task.market_id)) {
      marketDoneTasks.set(task.market_id, new Set())
    }
    marketDoneTasks.get(task.market_id)!.add(task.origin_template_task_id)
  })

  // 6. Calculate Matrix Data
  const matrixData: MatrixData = {}

  // Create a map: VersionID -> TemplateID to link strategies back to columns
  const versionToTemplate = new Map<string, string>()
  templates.forEach(t => {
    if (t.template_versions) {
      t.template_versions.forEach((v: { id: string }) => {
        versionToTemplate.set(v.id, t.id)
      })
    }
  })

  // Iterate strategies to populate matrix
  strategies.forEach(strategy => {
    const templateId = versionToTemplate.get(strategy.template_version_id)
    if (!templateId) return // Version might belong to a template not fetched or deleted

    if (!matrixData[strategy.market_id]) {
      matrixData[strategy.market_id] = {}
    }

    const mandatorySet = versionMandatoryTasks.get(strategy.template_version_id) || new Set()
    const doneSet = marketDoneTasks.get(strategy.market_id) || new Set()

    let doneCount = 0
    mandatorySet.forEach(taskId => {
      if (doneSet.has(taskId)) {
        doneCount++
      }
    })

    const total = mandatorySet.size
    // If no mandatory tasks, we consider it 100% complete (integrity maintained)
    const percentage = total === 0 ? 100 : Math.round((doneCount / total) * 100)

    matrixData[strategy.market_id][templateId] = {
      percentage,
      totalMandatory: total,
      doneMandatory: doneCount,
      isDeployed: true
    }
  })

  // Transform data for component
  const marketList: MatrixMarket[] = markets.map(m => ({ id: m.id, name: m.name }))
  const templateList: MatrixTemplate[] = templates.map(t => ({ id: t.id, name: t.name }))

  return (
    <div className="flex flex-col h-full w-full p-4 md:p-8 space-y-6 md:space-y-8">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Satellite View</h2>
          <p className="text-muted-foreground">
            Global Digital Maturity & Integrity Matrix
          </p>
        </div>
      </div>

      <div className="flex-1">
        <DensityMatrix markets={marketList} templates={templateList} data={matrixData} />
      </div>
    </div>
  )
}
