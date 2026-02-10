import { MatrixData, MatrixMarket, MatrixTemplate } from '@/components/dashboard/density-matrix'

export interface DashboardData {
  markets: { id: string; name: string }[]
  templates: { id: string; name: string; template_versions: { id: string }[] }[]
  strategies: { market_id: string; template_version_id: string }[]
  mandatoryTasks: { id: string; template_version_id: string }[]
  doneTasks: { market_id: string; origin_template_task_id: string }[]
}

export function calculateHeatmapData(data: DashboardData): {
  markets: MatrixMarket[]
  templates: MatrixTemplate[]
  matrixData: MatrixData
} {
  const { markets, templates, strategies, mandatoryTasks, doneTasks } = data

  const versionMandatoryTasks = new Map<string, Set<string>>()
  mandatoryTasks.forEach((task) => {
    if (!versionMandatoryTasks.has(task.template_version_id)) {
      versionMandatoryTasks.set(task.template_version_id, new Set())
    }
    versionMandatoryTasks.get(task.template_version_id)!.add(task.id)
  })

  const marketDoneTasks = new Map<string, Set<string>>()
  doneTasks.forEach((task) => {
    if (!marketDoneTasks.has(task.market_id)) {
      marketDoneTasks.set(task.market_id, new Set())
    }
    marketDoneTasks.get(task.market_id)!.add(task.origin_template_task_id)
  })

  const matrixData: MatrixData = {}

  const versionToTemplate = new Map<string, string>()
  templates.forEach(t => {
    if (t.template_versions) {
      t.template_versions.forEach((v: { id: string }) => {
        versionToTemplate.set(v.id, t.id)
      })
    }
  })

  strategies.forEach(strategy => {
    const templateId = versionToTemplate.get(strategy.template_version_id)
    if (!templateId) return

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
    const percentage = total === 0 ? 100 : Math.round((doneCount / total) * 100)

    matrixData[strategy.market_id][templateId] = {
      percentage,
      totalMandatory: total,
      doneMandatory: doneCount,
      isDeployed: true
    }
  })

  const marketList: MatrixMarket[] = markets.map(m => ({ id: m.id, name: m.name }))
  const templateList: MatrixTemplate[] = templates.map(t => ({ id: t.id, name: t.name }))

  return { markets: marketList, templates: templateList, matrixData }
}
