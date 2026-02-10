import { createClient } from '@/lib/supabase/server'
import { DensityMatrix, MatrixData, MatrixMarket, MatrixTemplate } from '@/components/dashboard/density-matrix'
import { calculateHeatmapData } from '@/lib/dashboard-logic'

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

  // Use the refactored logic
  const { markets: marketList, templates: templateList, matrixData } = calculateHeatmapData({
    markets,
    templates,
    strategies,
    mandatoryTasks,
    doneTasks,
  })

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
