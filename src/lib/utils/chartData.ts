import type { OccurrenceWithDetails } from '../types/api'

export interface DailyPoint {
  date: string
  value: number | null
}

export interface HeatmapPoint {
  date: string
  completed: boolean
}

// For boolean tasks: returns 1 for true, 0 for false, null for no answer
export function booleanTimeSeries(occurrences: OccurrenceWithDetails[]): DailyPoint[] {
  return occurrences
    .filter((o) => !o.occurrence.is_suppressed)
    .map((o) => ({
      date: o.occurrence.occurrence_date,
      value: o.answer?.answer_boolean == null ? null : o.answer.answer_boolean ? 1 : 0,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

// For integer tasks: returns the integer value or null
export function integerTimeSeries(occurrences: OccurrenceWithDetails[]): DailyPoint[] {
  return occurrences
    .filter((o) => !o.occurrence.is_suppressed)
    .map((o) => ({
      date: o.occurrence.occurrence_date,
      value: o.answer?.answer_integer ?? null,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

// For heatmap: returns completion status per date
export function heatmapSeries(occurrences: OccurrenceWithDetails[]): HeatmapPoint[] {
  const byDate = new Map<string, boolean>()
  for (const o of occurrences) {
    const date = o.occurrence.occurrence_date
    const existing = byDate.get(date) ?? false
    const completed = !o.occurrence.is_suppressed && o.answer != null
    byDate.set(date, existing || completed)
  }
  return Array.from(byDate.entries())
    .map(([date, completed]) => ({ date, completed }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

// For select tasks: returns count per option value
export function selectDistribution(occurrences: OccurrenceWithDetails[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const o of occurrences) {
    if (o.answer?.answer_select) {
      const option = o.select_options?.find((opt) => opt.id === o.answer!.answer_select)
      const label = option?.value ?? o.answer.answer_select
      counts[label] = (counts[label] ?? 0) + 1
    }
  }
  return counts
}

// Streak calculation for boolean tasks
export function calculateStreaks(occurrences: OccurrenceWithDetails[]): {
  current: number
  longest: number
} {
  const sorted = occurrences
    .filter((o) => !o.occurrence.is_suppressed)
    .sort((a, b) => a.occurrence.occurrence_date.localeCompare(b.occurrence.occurrence_date))

  let longest = 0
  let streak = 0

  for (const o of sorted) {
    if (o.answer?.answer_boolean === true) {
      streak++
      longest = Math.max(longest, streak)
    } else {
      streak = 0
    }
  }

  return { current: streak, longest }
}

// Stats for integer tasks
export function integerStats(
  occurrences: OccurrenceWithDetails[]
): { min: number; max: number; avg: number; count: number } | null {
  const values = occurrences
    .filter((o) => !o.occurrence.is_suppressed && o.answer?.answer_integer != null)
    .map((o) => o.answer!.answer_integer!)

  if (values.length === 0) return null

  return {
    min: Math.min(...values),
    max: Math.max(...values),
    avg: Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10,
    count: values.length,
  }
}

// Completion rate for a set of occurrences
export function completionRate(occurrences: OccurrenceWithDetails[]): number {
  const nonSuppressed = occurrences.filter((o) => !o.occurrence.is_suppressed)
  if (nonSuppressed.length === 0) return 0
  const answered = nonSuppressed.filter((o) => o.answer != null).length
  return Math.round((answered / nonSuppressed.length) * 100)
}
