import { writable } from 'svelte/store'

export type AccentColour = 'green' | 'blue' | 'red' | 'orange' | 'pink' | 'purple'

export type Theme = 'light' | 'dark' | 'sepia'

export type FontSize = 'medium' | 'large' | 'xlarge'

const THEME_KEY = 'gotasks_theme'
const ACCENT_KEY = 'gotasks_accent'

function getStoredValue<T>(key: string, defaultValue: T): T {
  try {
    if (typeof window === 'undefined') return defaultValue
    const stored = localStorage.getItem(key)
    if (stored === null) return defaultValue
    return stored as T
  } catch {
    return defaultValue
  }
}

function createPersistedStore<T extends string>(key: string, defaultValue: T) {
  const initial = getStoredValue(key, defaultValue)
  const store = writable<T>(initial)

  store.subscribe((value) => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(key, value)
      }
    } catch {
      // localStorage unavailable, ignore
    }
  })

  return store
}

export const theme = createPersistedStore<Theme>(THEME_KEY, 'sepia')
export const accentColour = createPersistedStore<AccentColour>(ACCENT_KEY, 'blue')
export const fontSize = createPersistedStore<FontSize>('gotasks_font_size', 'large')
