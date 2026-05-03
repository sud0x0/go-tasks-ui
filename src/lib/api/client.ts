import { get } from 'svelte/store'
import { accessToken, refreshToken, expiresAt, clearAuth, setSession } from '../stores/auth'
import type { ApiError, RefreshResponse } from '../types/api'

let isRefreshing = false
let refreshPromise: Promise<boolean> | null = null

function isTokenExpiringSoon(): boolean {
  const expires = get(expiresAt)
  if (!expires) return false

  try {
    const expiresDate = new Date(expires)
    const now = new Date()
    const thirtySecondsFromNow = new Date(now.getTime() + 30 * 1000)
    return expiresDate <= thirtySecondsFromNow
  } catch {
    return false
  }
}

async function attemptTokenRefresh(): Promise<boolean> {
  const currentRefreshToken = get(refreshToken)
  const currentAccessToken = get(accessToken)

  if (!currentRefreshToken) {
    return false
  }

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Refresh-Token': currentRefreshToken,
    }

    if (currentAccessToken) {
      headers['Authorization'] = `Bearer ${currentAccessToken}`
    }

    const response = await fetch('/api/v1/auth/refresh', {
      method: 'POST',
      headers,
    })

    if (!response.ok) {
      clearAuth()
      return false
    }

    const data: RefreshResponse = await response.json()
    setSession(data.access_token, data.refresh_token, data.expires_at)
    return true
  } catch {
    clearAuth()
    return false
  }
}

async function refreshTokenIfNeeded(): Promise<boolean> {
  if (isRefreshing && refreshPromise) {
    return refreshPromise
  }

  isRefreshing = true
  refreshPromise = attemptTokenRefresh().finally(() => {
    isRefreshing = false
    refreshPromise = null
  })

  return refreshPromise
}

export async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  // Proactive refresh if token is expiring soon. If refresh fails, the auth
  // store has already been cleared — bail now rather than firing a doomed
  // request with no Authorization header that will just 401.
  const token = get(accessToken)
  if (token && isTokenExpiringSoon()) {
    const refreshed = await refreshTokenIfNeeded()
    if (!refreshed) {
      const error: ApiError = { error: 'Authentication failed' }
      throw error
    }
  }

  const currentToken = get(accessToken)

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  if (currentToken) {
    ;(headers as Record<string, string>)['Authorization'] = `Bearer ${currentToken}`
  }

  // Use relative paths, proxy handles the rest
  const url = endpoint.startsWith('/') ? endpoint : `/${endpoint}`

  let response = await fetch(url, {
    ...options,
    headers,
  })

  // On 401, attempt token refresh once
  if (response.status === 401 && currentToken) {
    const refreshed = await refreshTokenIfNeeded()

    if (refreshed) {
      // Retry the original request with new token
      const newToken = get(accessToken)
      if (newToken) {
        ;(headers as Record<string, string>)['Authorization'] = `Bearer ${newToken}`
      }

      response = await fetch(url, {
        ...options,
        headers,
      })

      // If still 401 after refresh, clear auth
      if (response.status === 401) {
        clearAuth()
        const error: ApiError = { error: 'Authentication failed' }
        throw error
      }
    } else {
      // Refresh failed, clear auth
      clearAuth()
      const error: ApiError = { error: 'Authentication failed' }
      throw error
    }
  }

  if (!response.ok) {
    let error: ApiError
    const text = await response.text()
    try {
      error = JSON.parse(text)
    } catch {
      error = { error: text || `Request failed with status ${response.status}` }
    }
    throw error
  }

  // Handle empty responses (204 No Content)
  if (response.status === 204) {
    return undefined as T
  }

  return response.json()
}
