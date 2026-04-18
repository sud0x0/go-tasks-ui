<script lang="ts">
  import TopBar from '../lib/components/layout/TopBar.svelte'
  import EChart from '../lib/components/charts/EChart.svelte'
  import { categories } from '../lib/stores/categories'
  import { listTasks } from '../lib/api/tasks'
  import { listOccurrences } from '../lib/api/occurrences'
  import { parseApiError } from '../lib/utils/errors'
  import { todayISO, addDays } from '../lib/utils/dates'
  import {
    booleanTimeSeries,
    integerTimeSeries,
    heatmapSeries,
    selectDistribution,
    calculateStreaks,
    integerStats,
    completionRate,
    type DailyPoint,
    type HeatmapPoint,
  } from '../lib/utils/chartData'
  import type { Task, OccurrenceWithDetails } from '../lib/types/api'
  import type { EChartsOption } from 'echarts'

  // State
  let selectedId = $state<string | null>(null)
  let selectedType = $state<'task' | 'category' | null>(null)
  let dateRange = $state<'7' | '30' | '90'>('30')
  let occurrences = $state<OccurrenceWithDetails[]>([])
  let loading = $state(false)
  let error = $state('')
  let tasks = $state<Task[]>([])

  // Derived
  let startDate = $derived(addDays(todayISO(), -Number(dateRange)))
  let endDate = $derived(todayISO())
  let selectedTask = $derived(tasks.find((t) => t.id === selectedId) ?? null)
  let selectedCategory = $derived($categories.find((c) => c.id === selectedId) ?? null)

  // Load tasks on mount
  $effect(() => {
    loadTasks()
  })

  async function loadTasks() {
    try {
      tasks = await listTasks({ active: true })
    } catch {
      // silently fail, tasks will be empty
    }
  }

  // Load occurrences when selection or date range changes
  $effect(() => {
    if (!selectedId || !selectedType) return
    loadOccurrences()
  })

  async function loadOccurrences() {
    loading = true
    error = ''
    occurrences = []

    const start = addDays(todayISO(), -Number(dateRange))
    const end = todayISO()

    try {
      const allOccs = await listOccurrences({ start_date: start, end_date: end })

      if (selectedType === 'task') {
        occurrences = allOccs.filter((o) => o.task.id === selectedId)
      } else if (selectedType === 'category') {
        occurrences = allOccs.filter((o) => o.task.category_id === selectedId)
      }
    } catch (err) {
      error = parseApiError(err).error
    } finally {
      loading = false
    }
  }

  function selectTask(id: string) {
    selectedId = id
    selectedType = 'task'
  }

  function selectCategory(id: string) {
    selectedId = id
    selectedType = 'category'
  }

  // ECharts option builders
  function getThemeColors() {
    const style = getComputedStyle(document.documentElement)
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark'
    return {
      accent: style.getPropertyValue('--accent').trim() || '#2196F3',
      bgPrimary: style.getPropertyValue('--bg-primary').trim(),
      bgSecondary: style.getPropertyValue('--bg-secondary').trim(),
      textPrimary: style.getPropertyValue('--text-primary').trim(),
      textSecondary: style.getPropertyValue('--text-secondary').trim(),
      textTertiary: style.getPropertyValue('--text-tertiary').trim(),
      borderPrimary: style.getPropertyValue('--border-primary').trim(),
      emptyCell: isDark ? '#1f2937' : '#f3f4f6',
    }
  }

  function booleanBarOption(data: DailyPoint[]): EChartsOption {
    const c = getThemeColors()
    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: c.bgPrimary,
        borderColor: c.borderPrimary,
        textStyle: { color: c.textPrimary, fontSize: 12 },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        formatter: (params: any) => {
          const p = params[0]
          return `${p.axisValue}<br/>${p.value === 1 ? 'Yes' : p.value === 0 ? 'No' : 'No answer'}`
        },
      },
      xAxis: {
        type: 'category',
        data: data.map((d) => d.date),
        axisLine: { lineStyle: { color: c.borderPrimary } },
        axisLabel: {
          color: c.textTertiary,
          fontSize: 11,
          formatter: (val: string) => val.substring(5),
          interval: Math.floor(data.length / 8),
        },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: 1,
        splitLine: { lineStyle: { color: c.borderPrimary, type: 'dashed' } },
        axisLabel: {
          color: c.textTertiary,
          fontSize: 11,
          formatter: (v: number) => (v === 1 ? 'Yes' : v === 0 ? 'No' : ''),
        },
        axisTick: { show: false },
        axisLine: { show: false },
      },
      series: [
        {
          type: 'bar',
          data: data.map((d) => d.value),
          barMaxWidth: 24,
          itemStyle: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            color: (params: any) => (params.value === 1 ? c.accent : c.emptyCell),
            borderRadius: [3, 3, 0, 0],
          },
        },
      ],
      grid: { left: 48, right: 16, top: 12, bottom: 36 },
    }
  }

  function integerLineOption(data: DailyPoint[]): EChartsOption {
    const c = getThemeColors()
    const nonNull = data.map((d) => d.value).filter((v) => v != null) as number[]
    const avg = nonNull.length ? nonNull.reduce((a, b) => a + b, 0) / nonNull.length : 0
    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: c.bgPrimary,
        borderColor: c.borderPrimary,
        textStyle: { color: c.textPrimary, fontSize: 12 },
      },
      xAxis: {
        type: 'category',
        data: data.map((d) => d.date),
        axisLine: { lineStyle: { color: c.borderPrimary } },
        axisLabel: {
          color: c.textTertiary,
          fontSize: 11,
          formatter: (val: string) => val.substring(5),
          interval: Math.floor(data.length / 8),
        },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: c.borderPrimary, type: 'dashed' } },
        axisLabel: { color: c.textTertiary, fontSize: 11 },
        axisTick: { show: false },
        axisLine: { show: false },
      },
      series: [
        {
          name: 'Value',
          type: 'line',
          data: data.map((d) => d.value),
          smooth: true,
          symbol: 'circle',
          symbolSize: 5,
          itemStyle: { color: c.accent },
          lineStyle: { color: c.accent, width: 2 },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: c.accent + '33' },
                { offset: 1, color: c.accent + '00' },
              ],
            },
          },
          connectNulls: false,
        },
        {
          name: 'Average',
          type: 'line',
          data: data.map(() => Math.round(avg * 10) / 10),
          lineStyle: { type: 'dashed', color: c.textTertiary, width: 1 },
          itemStyle: { color: c.textTertiary },
          symbol: 'none',
        },
      ],
      legend: {
        data: ['Value', 'Average'],
        bottom: 0,
        textStyle: { color: c.textSecondary, fontSize: 11 },
        icon: 'circle',
        itemWidth: 8,
        itemHeight: 8,
      },
      grid: { left: 48, right: 16, top: 12, bottom: 40 },
    }
  }

  function heatmapOption(data: HeatmapPoint[], start: string, end: string): EChartsOption {
    const c = getThemeColors()
    return {
      backgroundColor: 'transparent',
      tooltip: {
        backgroundColor: c.bgPrimary,
        borderColor: c.borderPrimary,
        textStyle: { color: c.textPrimary, fontSize: 12 },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        formatter: (params: any) => {
          const [date, val] = params.value
          return `${date}: ${val ? 'Completed' : 'Missed'}`
        },
      },
      visualMap: {
        show: false,
        min: 0,
        max: 1,
        inRange: { color: [c.emptyCell, c.accent] },
      },
      calendar: {
        range: [start, end],
        cellSize: [18, 18],
        itemStyle: {
          borderWidth: 3,
          borderColor: c.bgPrimary,
          borderRadius: 3,
          color: c.emptyCell,
        },
        splitLine: { show: false },
        yearLabel: { show: false },
        monthLabel: {
          color: c.textTertiary,
          fontSize: 11,
          nameMap: [
            'Jan',
            'Feb',
            'Mar',
            'Apr',
            'May',
            'Jun',
            'Jul',
            'Aug',
            'Sep',
            'Oct',
            'Nov',
            'Dec',
          ],
        },
        dayLabel: {
          color: c.textTertiary,
          fontSize: 10,
          nameMap: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
          firstDay: 1,
        },
        top: 20,
        left: 30,
        right: 16,
        bottom: 10,
      },
      series: [
        {
          type: 'heatmap',
          coordinateSystem: 'calendar',
          data: data.map((d) => [d.date, d.completed ? 1 : 0]),
        },
      ],
    }
  }

  function donutOption(distribution: Record<string, number>): EChartsOption {
    const c = getThemeColors()
    const entries = Object.entries(distribution)
    const palette = [c.accent, '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4']
    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: c.bgPrimary,
        borderColor: c.borderPrimary,
        textStyle: { color: c.textPrimary, fontSize: 12 },
        formatter: '{b}: {c} ({d}%)',
      },
      legend: {
        bottom: 0,
        textStyle: { color: c.textSecondary, fontSize: 11 },
        icon: 'circle',
        itemWidth: 8,
        itemHeight: 8,
      },
      series: [
        {
          type: 'pie',
          radius: ['45%', '70%'],
          center: ['50%', '45%'],
          data: entries.map(([name, value], i) => ({
            name,
            value,
            itemStyle: { color: palette[i % palette.length] },
          })),
          label: { show: false },
          emphasis: {
            scale: true,
            scaleSize: 6,
            itemStyle: { shadowBlur: 8, shadowColor: 'rgba(0,0,0,0.2)' },
          },
        },
      ],
    }
  }

  function selectBarOption(distribution: Record<string, number>): EChartsOption {
    const c = getThemeColors()
    const entries = Object.entries(distribution)
    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: c.bgPrimary,
        borderColor: c.borderPrimary,
        textStyle: { color: c.textPrimary, fontSize: 12 },
      },
      xAxis: {
        type: 'category',
        data: entries.map(([k]) => k),
        axisLine: { lineStyle: { color: c.borderPrimary } },
        axisLabel: { color: c.textTertiary, fontSize: 11 },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: c.borderPrimary, type: 'dashed' } },
        axisLabel: { color: c.textTertiary, fontSize: 11 },
        axisTick: { show: false },
        axisLine: { show: false },
      },
      series: [
        {
          type: 'bar',
          data: entries.map(([, v]) => v),
          barMaxWidth: 40,
          itemStyle: { color: c.accent, borderRadius: [3, 3, 0, 0] },
        },
      ],
      grid: { left: 40, right: 16, top: 12, bottom: 36 },
    }
  }

  function categoryCompletionOption(
    occs: OccurrenceWithDetails[],
    categoryTasks: Task[]
  ): EChartsOption {
    const c = getThemeColors()
    const rates = categoryTasks
      .map((t) => {
        const taskOccs = occs.filter((o) => o.task.id === t.id)
        return { name: t.name, rate: completionRate(taskOccs) }
      })
      .sort((a, b) => b.rate - a.rate)
    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: c.bgPrimary,
        borderColor: c.borderPrimary,
        textStyle: { color: c.textPrimary, fontSize: 12 },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        formatter: (params: any) => `${params[0].axisValue}: ${params[0].value}%`,
      },
      xAxis: {
        type: 'value',
        min: 0,
        max: 100,
        splitLine: { lineStyle: { color: c.borderPrimary, type: 'dashed' } },
        axisLabel: { color: c.textTertiary, fontSize: 11, formatter: '{value}%' },
        axisTick: { show: false },
        axisLine: { show: false },
      },
      yAxis: {
        type: 'category',
        data: rates.map((r) => r.name),
        axisLine: { lineStyle: { color: c.borderPrimary } },
        axisLabel: { color: c.textSecondary, fontSize: 12 },
        axisTick: { show: false },
      },
      series: [
        {
          type: 'bar',
          data: rates.map((r) => r.rate),
          barMaxWidth: 24,
          itemStyle: { color: c.accent, borderRadius: [0, 3, 3, 0] },
          label: {
            show: true,
            position: 'right',
            formatter: '{c}%',
            color: c.textSecondary,
            fontSize: 11,
          },
        },
      ],
      grid: { left: 140, right: 60, top: 12, bottom: 20 },
    }
  }
</script>

<TopBar activePage="charts" />

<main class="charts-layout">
  <!-- Left panel -->
  <aside class="charts-sidebar">
    <div class="sidebar-section">
      <div class="sidebar-section-label">Categories</div>
      {#each $categories as cat (cat.id)}
        <button
          class="sidebar-item"
          class:active={selectedId === cat.id && selectedType === 'category'}
          onclick={() => selectCategory(cat.id)}
        >
          {cat.name}
        </button>
      {/each}
    </div>

    <div class="sidebar-section">
      <div class="sidebar-section-label">Tasks</div>
      {#each tasks as task (task.id)}
        <button
          class="sidebar-item"
          class:active={selectedId === task.id && selectedType === 'task'}
          onclick={() => selectTask(task.id)}
        >
          <span>{task.name}</span>
          <span class="sidebar-item-type">{task.answer_type}</span>
        </button>
      {/each}
    </div>
  </aside>

  <!-- Right panel -->
  <div class="charts-panel">
    {#if !selectedId}
      <div class="charts-empty">Select a task or category to view charts.</div>
    {:else if loading}
      <div class="charts-loading">Loading...</div>
    {:else if error}
      <div class="charts-error">{error}</div>
    {:else if selectedType === 'task' && selectedTask}
      <!-- Date range selector -->
      <div class="chart-header">
        <h2>{selectedTask.name}</h2>
        <div class="date-range-picker">
          <button
            class="range-btn"
            class:active={dateRange === '7'}
            onclick={() => (dateRange = '7')}>7 days</button
          >
          <button
            class="range-btn"
            class:active={dateRange === '30'}
            onclick={() => (dateRange = '30')}>30 days</button
          >
          <button
            class="range-btn"
            class:active={dateRange === '90'}
            onclick={() => (dateRange = '90')}>90 days</button
          >
        </div>
      </div>

      <!-- BOOLEAN task -->
      {#if selectedTask.answer_type === 'boolean'}
        {@const streaks = calculateStreaks(occurrences)}
        {@const rate = completionRate(occurrences)}
        <div class="stat-row">
          <div class="stat-card">
            <div class="stat-label">Completion rate</div>
            <div class="stat-value">{rate}%</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Current streak</div>
            <div class="stat-value">{streaks.current} days</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Longest streak</div>
            <div class="stat-value">{streaks.longest} days</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Total answered</div>
            <div class="stat-value">{occurrences.filter((o) => o.answer != null).length}</div>
          </div>
        </div>

        <div class="chart-section">
          <div class="chart-section-label">Daily result</div>
          <EChart height="220px" option={booleanBarOption(booleanTimeSeries(occurrences))} />
        </div>

        <div class="chart-section">
          <div class="chart-section-label">Activity heatmap</div>
          <EChart
            height="180px"
            option={heatmapOption(heatmapSeries(occurrences), startDate, endDate)}
          />
        </div>

        <!-- INTEGER task -->
      {:else if selectedTask.answer_type === 'integer'}
        {@const stats = integerStats(occurrences)}
        {@const rate = completionRate(occurrences)}
        <div class="stat-row">
          <div class="stat-card">
            <div class="stat-label">Completion rate</div>
            <div class="stat-value">{rate}%</div>
          </div>
          {#if stats}
            <div class="stat-card">
              <div class="stat-label">Average</div>
              <div class="stat-value">{stats.avg}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Min</div>
              <div class="stat-value">{stats.min}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Max</div>
              <div class="stat-value">{stats.max}</div>
            </div>
          {/if}
        </div>

        <div class="chart-section">
          <div class="chart-section-label">Trend over time</div>
          <EChart height="260px" option={integerLineOption(integerTimeSeries(occurrences))} />
        </div>

        <div class="chart-section">
          <div class="chart-section-label">Activity heatmap</div>
          <EChart
            height="180px"
            option={heatmapOption(heatmapSeries(occurrences), startDate, endDate)}
          />
        </div>

        <!-- SELECT task -->
      {:else if selectedTask.answer_type === 'select'}
        {@const rate = completionRate(occurrences)}
        <div class="stat-row">
          <div class="stat-card">
            <div class="stat-label">Completion rate</div>
            <div class="stat-value">{rate}%</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Total answered</div>
            <div class="stat-value">{occurrences.filter((o) => o.answer != null).length}</div>
          </div>
        </div>

        <div class="chart-section">
          <div class="chart-section-label">Distribution</div>
          <EChart height="280px" option={donutOption(selectDistribution(occurrences))} />
        </div>

        <div class="chart-section">
          <div class="chart-section-label">Frequency by option</div>
          <EChart height="220px" option={selectBarOption(selectDistribution(occurrences))} />
        </div>

        <!-- STRING task -->
      {:else if selectedTask.answer_type === 'string'}
        {@const rate = completionRate(occurrences)}
        <div class="stat-row">
          <div class="stat-card">
            <div class="stat-label">Completion rate</div>
            <div class="stat-value">{rate}%</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Total answered</div>
            <div class="stat-value">{occurrences.filter((o) => o.answer != null).length}</div>
          </div>
        </div>
      {/if}

      <!-- Raw data table for all task types -->
      <div class="chart-section">
        <div class="chart-section-label">Raw data</div>
        <table class="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Time</th>
              <th>Answer</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {#each occurrences
              .slice()
              .sort( (a, b) => b.occurrence.occurrence_date.localeCompare(a.occurrence.occurrence_date) ) as o (o.occurrence.id)}
              <tr>
                <td>{o.occurrence.occurrence_date.split('T')[0]}</td>
                <td
                  >{o.occurrence.scheduled_time
                    ? o.occurrence.scheduled_time.substring(11, 16)
                    : '—'}</td
                >
                <td>
                  {#if o.answer}
                    {o.answer.answer_boolean != null
                      ? o.answer.answer_boolean
                        ? 'Yes'
                        : 'No'
                      : ''}
                    {o.answer.answer_integer != null ? o.answer.answer_integer : ''}
                    {o.answer.answer_string != null ? o.answer.answer_string : ''}
                    {#if o.answer.answer_select}
                      {o.select_options?.find((opt) => opt.id === o.answer!.answer_select)?.value ??
                        '—'}
                    {/if}
                  {:else}
                    —
                  {/if}
                </td>
                <td>
                  {#if o.occurrence.is_suppressed}
                    <span class="status-badge skipped">Skipped</span>
                  {:else if o.answer}
                    <span class="status-badge done">Done</span>
                  {:else}
                    <span class="status-badge pending">Pending</span>
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {:else if selectedType === 'category' && selectedCategory}
      <div class="chart-header">
        <h2>{selectedCategory.name}</h2>
        <div class="date-range-picker">
          <button
            class="range-btn"
            class:active={dateRange === '7'}
            onclick={() => (dateRange = '7')}>7 days</button
          >
          <button
            class="range-btn"
            class:active={dateRange === '30'}
            onclick={() => (dateRange = '30')}>30 days</button
          >
          <button
            class="range-btn"
            class:active={dateRange === '90'}
            onclick={() => (dateRange = '90')}>90 days</button
          >
        </div>
      </div>

      <div class="chart-section">
        <div class="chart-section-label">Completion rate by task</div>
        <EChart
          height="260px"
          option={categoryCompletionOption(
            occurrences,
            tasks.filter((t) => t.category_id === selectedId)
          )}
        />
      </div>

      {@const rate = completionRate(occurrences)}
      <div class="stat-row">
        <div class="stat-card">
          <div class="stat-label">Overall completion</div>
          <div class="stat-value">{rate}%</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Total occurrences</div>
          <div class="stat-value">{occurrences.length}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Tasks in category</div>
          <div class="stat-value">{tasks.filter((t) => t.category_id === selectedId).length}</div>
        </div>
      </div>
    {/if}
  </div>
</main>

<style>
  .charts-layout {
    display: flex;
    flex: 1;
    height: calc(100vh - 56px);
    overflow: hidden;
  }

  .charts-sidebar {
    width: 240px;
    flex-shrink: 0;
    border-right: 1px solid var(--border-primary);
    overflow-y: auto;
    padding: 1rem 0;
    background: var(--bg-secondary);
  }

  .sidebar-section {
    margin-bottom: 1.5rem;
  }

  .sidebar-section-label {
    font-size: 0.6875rem;
    font-weight: 500;
    color: var(--text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    padding: 0 1rem;
    margin-bottom: 0.5rem;
  }

  .sidebar-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 0.5rem 1rem;
    background: none;
    border: none;
    text-align: left;
    font-size: 0.875rem;
    color: var(--text-secondary);
    cursor: pointer;
    transition:
      background-color 0.15s,
      color 0.15s;
  }

  .sidebar-item:hover {
    background: var(--bg-tertiary);
    color: var(--text-primary);
  }

  .sidebar-item.active {
    background: var(--bg-primary);
    color: var(--accent);
    font-weight: 500;
    border-right: 2px solid var(--accent);
  }

  .sidebar-item-type {
    font-size: 0.6875rem;
    color: var(--text-tertiary);
    text-transform: uppercase;
  }

  .charts-panel {
    flex: 1;
    overflow-y: auto;
    padding: 1.5rem 2rem;
  }

  .charts-empty,
  .charts-loading,
  .charts-error {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 200px;
    color: var(--text-tertiary);
    font-size: 0.9375rem;
  }

  .charts-error {
    color: var(--danger);
  }

  .chart-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1.5rem;
    gap: 1rem;
  }

  .chart-header h2 {
    font-size: 1.25rem;
    font-weight: 500;
    color: var(--text-primary);
    margin: 0;
  }

  .date-range-picker {
    display: flex;
    gap: 4px;
  }

  .range-btn {
    padding: 0.25rem 0.75rem;
    border: 1px solid var(--border-primary);
    border-radius: 4px;
    background: var(--bg-primary);
    color: var(--text-secondary);
    font-size: 0.8125rem;
    cursor: pointer;
    transition: all 0.15s;
  }

  .range-btn.active {
    border-color: var(--accent);
    color: var(--accent);
    background: var(--bg-secondary);
  }

  .stat-row {
    display: flex;
    gap: 8px;
    margin-bottom: 1.5rem;
    flex-wrap: wrap;
  }

  .stat-card {
    background: var(--bg-secondary);
    border-radius: 6px;
    padding: 10px 16px;
    min-width: 100px;
  }

  .stat-label {
    font-size: 0.6875rem;
    color: var(--text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 4px;
  }

  .stat-value {
    font-size: 1.5rem;
    font-weight: 500;
    color: var(--text-primary);
    line-height: 1;
  }

  .chart-section {
    margin-bottom: 2rem;
  }

  .chart-section-label {
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-bottom: 0.75rem;
  }

  .data-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
  }

  .data-table th {
    text-align: left;
    padding: 6px 8px;
    font-size: 0.6875rem;
    font-weight: 500;
    color: var(--text-tertiary);
    border-bottom: 1px solid var(--border-primary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .data-table td {
    padding: 8px 8px;
    border-bottom: 1px solid var(--border-primary);
    color: var(--text-primary);
  }

  .data-table tr:last-child td {
    border-bottom: none;
  }

  .status-badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 0.75rem;
    font-weight: 500;
  }

  .status-badge.done {
    background: #dcfce7;
    color: #166534;
  }
  .status-badge.pending {
    background: #fef3c7;
    color: #92400e;
  }
  .status-badge.skipped {
    background: var(--bg-tertiary);
    color: var(--text-tertiary);
  }
</style>
