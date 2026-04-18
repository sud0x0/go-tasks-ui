import { writable, derived } from 'svelte/store'
import type { Category } from '../types/api'

export const categories = writable<Category[]>([])
export const categoriesLoaded = writable<boolean>(false)

export const categoriesMap = derived(categories, ($categories) =>
  Object.fromEntries($categories.map((c) => [c.id, c]))
)

export function setCategories(data: Category[]): void {
  categories.set(data)
  categoriesLoaded.set(true)
}

export function addCategory(category: Category): void {
  categories.update((cats) => [...cats, category])
}

export function updateCategoryInStore(updated: Category): void {
  categories.update((cats) => cats.map((c) => (c.id === updated.id ? updated : c)))
}

export function removeCategoryFromStore(id: string): void {
  categories.update((cats) => cats.filter((c) => c.id !== id))
}
