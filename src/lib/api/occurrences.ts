import { request } from './client'
import type { OccurrenceWithDetails, AnswerRequest, TaskAnswer } from '../types/api'

interface ListOccurrencesParams {
  date?: string
  start_date?: string
  end_date?: string
}

export async function listOccurrences(
  params: ListOccurrencesParams
): Promise<OccurrenceWithDetails[]> {
  const searchParams = new URLSearchParams()
  if (params.date !== undefined) searchParams.set('date', params.date)
  if (params.start_date !== undefined) searchParams.set('start_date', params.start_date)
  if (params.end_date !== undefined) searchParams.set('end_date', params.end_date)
  const query = searchParams.toString()
  return request<OccurrenceWithDetails[]>(`/api/v1/occurrences${query ? `?${query}` : ''}`)
}

export async function submitAnswer(id: string, data: AnswerRequest): Promise<TaskAnswer> {
  return request<TaskAnswer>(`/api/v1/occurrences/${id}/answer`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function suppressOccurrence(id: string): Promise<void> {
  return request<void>(`/api/v1/occurrences/${id}/suppress`, {
    method: 'POST',
  })
}

export async function unsuppressOccurrence(id: string): Promise<void> {
  return request<void>(`/api/v1/occurrences/${id}/unsuppress`, {
    method: 'POST',
  })
}

export interface BulkDeleteAnswersResponse {
  requested: number
  deleted: number
}

export async function bulkDeleteAnswers(
  occurrenceIds: string[]
): Promise<BulkDeleteAnswersResponse> {
  return request<BulkDeleteAnswersResponse>('/api/v1/occurrences/bulk-delete-answers', {
    method: 'POST',
    body: JSON.stringify({ occurrence_ids: occurrenceIds }),
  })
}
