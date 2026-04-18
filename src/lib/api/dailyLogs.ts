import { request } from './client'
import type {
  DailyLog,
  CreateDailyLogRequest,
  UpdateDailyLogRequest,
  BulkDeleteIdsRequest,
  BulkSoftDeleteResponse,
  BulkPermanentDeleteResponse,
} from '../types/api'

interface ListDailyLogsParams {
  date?: string
  start_date?: string
  end_date?: string
}

export async function listDailyLogs(params?: ListDailyLogsParams): Promise<DailyLog[]> {
  const searchParams = new URLSearchParams()
  if (params?.date !== undefined) searchParams.set('date', params.date)
  if (params?.start_date !== undefined) searchParams.set('start_date', params.start_date)
  if (params?.end_date !== undefined) searchParams.set('end_date', params.end_date)
  const query = searchParams.toString()
  return request<DailyLog[]>(`/api/v1/daily-logs${query ? `?${query}` : ''}`)
}

export async function listInactiveDailyLogs(limit?: number, offset?: number): Promise<DailyLog[]> {
  const params = new URLSearchParams()
  if (limit !== undefined) params.set('limit', String(limit))
  if (offset !== undefined) params.set('offset', String(offset))
  const query = params.toString()
  return request<DailyLog[]>(`/api/v1/daily-logs/inactive${query ? `?${query}` : ''}`)
}

export async function createDailyLog(data: CreateDailyLogRequest): Promise<DailyLog> {
  return request<DailyLog>('/api/v1/daily-logs', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateDailyLog(id: string, data: UpdateDailyLogRequest): Promise<DailyLog> {
  return request<DailyLog>(`/api/v1/daily-logs/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function deleteDailyLog(id: string): Promise<void> {
  return request<void>(`/api/v1/daily-logs/${id}`, {
    method: 'DELETE',
  })
}

export async function permanentDeleteDailyLog(id: string): Promise<void> {
  return request<void>(`/api/v1/daily-logs/${id}/permanent`, {
    method: 'DELETE',
  })
}

export async function reactivateDailyLog(id: string): Promise<DailyLog> {
  return request<DailyLog>(`/api/v1/daily-logs/${id}/reactivate`, {
    method: 'POST',
  })
}

export async function bulkDeleteDailyLogs(ids: string[]): Promise<BulkSoftDeleteResponse> {
  return request<BulkSoftDeleteResponse>('/api/v1/daily-logs/bulk-delete', {
    method: 'POST',
    body: JSON.stringify({ ids } satisfies BulkDeleteIdsRequest),
  })
}

export async function bulkPermanentDeleteDailyLogs(
  ids: string[]
): Promise<BulkPermanentDeleteResponse> {
  return request<BulkPermanentDeleteResponse>('/api/v1/daily-logs/bulk-permanent-delete', {
    method: 'POST',
    body: JSON.stringify({ ids } satisfies BulkDeleteIdsRequest),
  })
}
