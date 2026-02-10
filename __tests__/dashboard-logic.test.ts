import { calculateHeatmapData, DashboardData } from '@/lib/dashboard-logic'

describe('calculateHeatmapData', () => {
  const mockData: DashboardData = {
    markets: [
      { id: 'm1', name: 'Market 1' },
      { id: 'm2', name: 'Market 2' },
    ],
    templates: [
      {
        id: 't1',
        name: 'Template A',
        template_versions: [{ id: 'v1' }],
      },
      {
        id: 't2',
        name: 'Template B',
        template_versions: [{ id: 'v2' }],
      },
    ],
    strategies: [
      { market_id: 'm1', template_version_id: 'v1' }, // Market 1 uses Template A
      { market_id: 'm1', template_version_id: 'v2' }, // Market 1 uses Template B
      { market_id: 'm2', template_version_id: 'v1' }, // Market 2 uses Template A
    ],
    mandatoryTasks: [
      { id: 'task1', template_version_id: 'v1' },
      { id: 'task2', template_version_id: 'v1' },
      { id: 'task3', template_version_id: 'v2' },
    ],
    doneTasks: [
      { market_id: 'm1', origin_template_task_id: 'task1' }, // Market 1: v1 (50% done)
      { market_id: 'm1', origin_template_task_id: 'task3' }, // Market 1: v2 (100% done)
      { market_id: 'm2', origin_template_task_id: 'task1' }, // Market 2: v1 (50% done)
      { market_id: 'm2', origin_template_task_id: 'task2' }, // Market 2: v1 (100% done)
    ],
  }

  it('calculates correct percentages for markets and templates', () => {
    const result = calculateHeatmapData(mockData)
    const { matrixData } = result

    // Market 1, Template A (v1): 2 mandatory, 1 done -> 50%
    expect(matrixData['m1']['t1'].percentage).toBe(50)
    expect(matrixData['m1']['t1'].totalMandatory).toBe(2)
    expect(matrixData['m1']['t1'].doneMandatory).toBe(1)

    // Market 1, Template B (v2): 1 mandatory, 1 done -> 100%
    expect(matrixData['m1']['t1'].isDeployed).toBe(true)
    expect(matrixData['m1']['t2'].percentage).toBe(100)
    expect(matrixData['m1']['t2'].totalMandatory).toBe(1)
    expect(matrixData['m1']['t2'].doneMandatory).toBe(1)

    // Market 2, Template A (v1): 2 mandatory, 2 done -> 100%
    expect(matrixData['m2']['t1'].percentage).toBe(100)
    expect(matrixData['m2']['t1'].totalMandatory).toBe(2)
    expect(matrixData['m2']['t1'].doneMandatory).toBe(2)

    // Market 2, Template B (v2): Not deployed
    expect(matrixData['m2']['t2']).toBeUndefined()
  })

  it('excludes Ghost cards/Optional tasks from numerator', () => {
    // If a done task is NOT in the mandatory list, it shouldn't count.
    const ghostData: DashboardData = {
      ...mockData,
      doneTasks: [
        { market_id: 'm1', origin_template_task_id: 'task1' }, // Valid mandatory
        { market_id: 'm1', origin_template_task_id: 'ghost_task' }, // Ghost/Optional task (not in mandatoryTasks)
      ],
    }

    const result = calculateHeatmapData(ghostData)
    const { matrixData } = result

    // Market 1, Template A (v1): 2 mandatory, 1 valid done -> 50%
    // The ghost task should typically not match any mandatory ID.
    // Assuming 'ghost_task' is not in mandatoryTasks.
    expect(matrixData['m1']['t1'].percentage).toBe(50)
    expect(matrixData['m1']['t1'].doneMandatory).toBe(1)
  })

  it('handles 0 mandatory tasks gracefully (100% integrity)', () => {
     const emptyMandatoryData: DashboardData = {
       ...mockData,
       mandatoryTasks: [], // No mandatory tasks for v1
       strategies: [
         { market_id: 'm1', template_version_id: 'v1' }
       ]
     }

     const result = calculateHeatmapData(emptyMandatoryData)
     const { matrixData } = result

     expect(matrixData['m1']['t1'].percentage).toBe(100)
     expect(matrixData['m1']['t1'].totalMandatory).toBe(0)
  })

  it('handles 0 strategies gracefully', () => {
    const noStrategyData: DashboardData = {
      ...mockData,
      strategies: [],
    }

    const result = calculateHeatmapData(noStrategyData)
    expect(result.matrixData).toEqual({})
  })
})
