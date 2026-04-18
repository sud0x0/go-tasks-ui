import { writable, derived } from 'svelte/store'
import type { UserResponse } from '../types/api'

const ACCESS_TOKEN_KEY = 'gotasks_access_token'
const REFRESH_TOKEN_KEY = 'gotasks_refresh_token'
const EXPIRES_AT_KEY = 'gotasks_expires_at'
const USER_KEY = 'gotasks_user'

function getStoredValue(key: string): string | null {
  try {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function setStoredValue(key: string, value: string | null): void {
  try {
    if (typeof window === 'undefined') return
    if (value === null) {
      localStorage.removeItem(key)
    } else {
      localStorage.setItem(key, value)
    }
  } catch {
    // localStorage unavailable, ignore
  }
}

function createTokenStore(key: string) {
  const initial = getStoredValue(key)
  const store = writable<string | null>(initial)

  store.subscribe((value) => {
    setStoredValue(key, value)
  })

  return store
}

function createUserStore() {
  let initial: UserResponse | null = null
  try {
    const stored = getStoredValue(USER_KEY)
    if (stored) {
      initial = JSON.parse(stored) as UserResponse
    }
  } catch {
    initial = null
  }

  const store = writable<UserResponse | null>(initial)

  store.subscribe((value) => {
    setStoredValue(USER_KEY, value ? JSON.stringify(value) : null)
  })

  return store
}

export const accessToken = createTokenStore(ACCESS_TOKEN_KEY)
export const refreshToken = createTokenStore(REFRESH_TOKEN_KEY)
export const expiresAt = createTokenStore(EXPIRES_AT_KEY)
export const currentUser = createUserStore()

export const isAuthenticated = derived(accessToken, ($accessToken) => $accessToken !== null)

export function clearAuth(): void {
  accessToken.set(null)
  refreshToken.set(null)
  expiresAt.set(null)
  currentUser.set(null)
}

export function setSession(
  access: string,
  refresh: string,
  expires: string,
  user?: UserResponse
): void {
  accessToken.set(access)
  refreshToken.set(refresh)
  expiresAt.set(expires)
  if (user !== undefined) {
    currentUser.set(user)
  }
}
