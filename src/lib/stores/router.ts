import { writable } from 'svelte/store'

export type Route =
  | 'login'
  | 'register'
  | 'today'
  | 'tasks'
  | 'categories'
  | 'charts'
  | 'logs'
  | 'answers'

export const currentRoute = writable<Route>('today')

export function navigate(route: Route): void {
  currentRoute.set(route)
}
