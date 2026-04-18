import type { ApiError } from '../types/api'

export function parseApiError(error: unknown): ApiError {
  if (typeof error === 'object' && error !== null && 'error' in error) {
    return error as ApiError
  }
  if (error instanceof Error) {
    return { error: error.message }
  }
  return { error: 'An unexpected error occurred' }
}
