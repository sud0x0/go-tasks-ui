import { request } from './client'
import type {
  TaskWithDetails,
  CreateTaskRequest,
  UpdateTaskRequest,
  Task,
  BulkDeleteIdsRequest,
  BulkSoftDeleteResponse,
  BulkPermanentDeleteResponse,
} from '../types/api'

interface ListTasksParams {
  category_id?: string
  active?: boolean
  limit?: number
  offset?: number
}

export async function listTasks(params?: ListTasksParams): Promise<Task[]> {
  const searchParams = new URLSearchParams()
  if (params?.category_id !== undefined) searchParams.set('category_id', params.category_id)
  if (params?.active !== undefined) searchParams.set('active', String(params.active))
  if (params?.limit !== undefined) searchParams.set('limit', String(params.limit))
  if (params?.offset !== undefined) searchParams.set('offset', String(params.offset))
  const query = searchParams.toString()
  return request<Task[]>(`/api/v1/tasks${query ? `?${query}` : ''}`)
}

export async function listInactiveTasks(limit?: number, offset?: number): Promise<Task[]> {
  const params = new URLSearchParams()
  if (limit !== undefined) params.set('limit', String(limit))
  if (offset !== undefined) params.set('offset', String(offset))
  const query = params.toString()
  return request<Task[]>(`/api/v1/tasks/inactive${query ? `?${query}` : ''}`)
}

export async function getTask(id: string): Promise<TaskWithDetails> {
  return request<TaskWithDetails>(`/api/v1/tasks/${id}`)
}

export async function createTask(data: CreateTaskRequest): Promise<TaskWithDetails> {
  return request<TaskWithDetails>('/api/v1/tasks', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateTask(id: string, data: UpdateTaskRequest): Promise<Task> {
  return request<Task>(`/api/v1/tasks/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function deleteTask(id: string): Promise<void> {
  return request<void>(`/api/v1/tasks/${id}`, {
    method: 'DELETE',
  })
}

export async function permanentDeleteTask(id: string): Promise<void> {
  return request<void>(`/api/v1/tasks/${id}/permanent`, {
    method: 'DELETE',
  })
}

export async function reactivateTask(id: string): Promise<Task> {
  return request<Task>(`/api/v1/tasks/${id}/reactivate`, {
    method: 'POST',
  })
}

export async function bulkDeleteTasks(ids: string[]): Promise<BulkSoftDeleteResponse> {
  return request<BulkSoftDeleteResponse>('/api/v1/tasks/bulk-delete', {
    method: 'POST',
    body: JSON.stringify({ ids } satisfies BulkDeleteIdsRequest),
  })
}

export async function bulkPermanentDeleteTasks(
  ids: string[]
): Promise<BulkPermanentDeleteResponse> {
  return request<BulkPermanentDeleteResponse>('/api/v1/tasks/bulk-permanent-delete', {
    method: 'POST',
    body: JSON.stringify({ ids } satisfies BulkDeleteIdsRequest),
  })
}
