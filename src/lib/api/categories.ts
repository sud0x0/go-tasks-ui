import { request } from './client'
import type {
  Category,
  CategoryRequest,
  BulkDeleteIdsRequest,
  BulkSoftDeleteResponse,
  BulkPermanentDeleteResponse,
} from '../types/api'

export async function listCategories(limit?: number, offset?: number): Promise<Category[]> {
  const params = new URLSearchParams()
  if (limit !== undefined) params.set('limit', String(limit))
  if (offset !== undefined) params.set('offset', String(offset))
  const query = params.toString()
  return request<Category[]>(`/api/v1/categories${query ? `?${query}` : ''}`)
}

export async function listInactiveCategories(limit?: number, offset?: number): Promise<Category[]> {
  const params = new URLSearchParams()
  if (limit !== undefined) params.set('limit', String(limit))
  if (offset !== undefined) params.set('offset', String(offset))
  const query = params.toString()
  return request<Category[]>(`/api/v1/categories/inactive${query ? `?${query}` : ''}`)
}

export async function getCategory(id: string): Promise<Category> {
  return request<Category>(`/api/v1/categories/${id}`)
}

export async function createCategory(data: CategoryRequest): Promise<Category> {
  return request<Category>('/api/v1/categories', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateCategory(id: string, data: CategoryRequest): Promise<Category> {
  return request<Category>(`/api/v1/categories/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function deleteCategory(id: string): Promise<void> {
  return request<void>(`/api/v1/categories/${id}`, {
    method: 'DELETE',
  })
}

export async function permanentDeleteCategory(id: string): Promise<void> {
  return request<void>(`/api/v1/categories/${id}/permanent`, {
    method: 'DELETE',
  })
}

export async function reactivateCategory(id: string): Promise<Category> {
  return request<Category>(`/api/v1/categories/${id}/reactivate`, {
    method: 'POST',
  })
}

export async function bulkDeleteCategories(ids: string[]): Promise<BulkSoftDeleteResponse> {
  return request<BulkSoftDeleteResponse>('/api/v1/categories/bulk-delete', {
    method: 'POST',
    body: JSON.stringify({ ids } satisfies BulkDeleteIdsRequest),
  })
}

export async function bulkPermanentDeleteCategories(
  ids: string[]
): Promise<BulkPermanentDeleteResponse> {
  return request<BulkPermanentDeleteResponse>('/api/v1/categories/bulk-permanent-delete', {
    method: 'POST',
    body: JSON.stringify({ ids } satisfies BulkDeleteIdsRequest),
  })
}
