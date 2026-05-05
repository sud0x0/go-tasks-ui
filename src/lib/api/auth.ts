import { request } from './client'
import type { RegisterRequest, LoginRequest, LoginResponse, UserResponse } from '../types/api'
import { get } from 'svelte/store'
import { accessToken, refreshToken } from '../stores/auth'

export async function register(data: RegisterRequest): Promise<UserResponse> {
  return request<UserResponse>('/api/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function login(credentials: LoginRequest): Promise<LoginResponse> {
  return request<LoginResponse>('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  })
}

export async function logout(): Promise<void> {
  const rt = get(refreshToken)
  const at = get(accessToken)
  if (!rt || !at) return
  await request<void>('/api/v1/auth/logout', {
    method: 'POST',
    headers: { 'X-Refresh-Token': rt },
  })
}
