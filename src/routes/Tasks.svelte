<script lang="ts">
  import TopBar from '../lib/components/layout/TopBar.svelte'
  import TaskFormModal, { type FormResult } from '../lib/components/tasks/TaskFormModal.svelte'
  import TaskViewModal from '../lib/components/tasks/TaskViewModal.svelte'
  import ConfirmDeleteModal from '../lib/components/tasks/ConfirmDeleteModal.svelte'
  import { categories, categoriesMap } from '../lib/stores/categories'
  import {
    listTasks,
    listInactiveTasks,
    deleteTask,
    permanentDeleteTask,
    reactivateTask,
    bulkDeleteTasks,
    bulkPermanentDeleteTasks,
  } from '../lib/api/tasks'
  import { parseApiError } from '../lib/utils/errors'
  import type { Task } from '../lib/types/api'

  let tasks = $state<Task[]>([])
  let loading = $state(false)
  let pageError = $state('')
  let showActiveOnly = $state(true)
  let filterCategoryId = $state('')

  let formOpen = $state(false)
  let editingTask = $state<Task | null>(null)

  let viewOpen = $state(false)
  let viewTaskId = $state<string | null>(null)

  let confirmOpen = $state(false)
  let confirmTask = $state<{ id: string; name: string } | null>(null)
  let confirmIsPermanent = $state(false)

  let deletingId = $state<string | null>(null)

  let selectedIds = $state<Set<string>>(new Set())
  let bulkActionLoading = $state(false)
  let bulkActionResult = $state('')

  let allSelected = $derived(tasks.length > 0 && tasks.every((t) => selectedIds.has(t.id)))

  $effect(() => {
    loadTasks()
  })

  async function loadTasks() {
    loading = true
    pageError = ''
    selectedIds = new Set()
    bulkActionResult = ''
    try {
      if (showActiveOnly) {
        tasks = await listTasks({
          active: true,
          category_id: filterCategoryId || undefined,
        })
      } else {
        tasks = await listInactiveTasks()
      }
    } catch (err) {
      pageError = parseApiError(err).error
    } finally {
      loading = false
    }
  }

  function openView(id: string) {
    viewTaskId = id
    viewOpen = true
  }

  function openCreate() {
    editingTask = null
    formOpen = true
  }

  function openEdit(t: Task) {
    editingTask = t
    formOpen = true
  }

  function openConfirm(t: Task, isPermanent: boolean) {
    confirmTask = { id: t.id, name: t.name }
    confirmIsPermanent = isPermanent
    confirmOpen = true
  }

  function handleFormSuccess(result: FormResult) {
    if (result.type === 'create') {
      tasks = [result.task.task, ...tasks]
    } else {
      const updated = result.task
      tasks = tasks.map((t) =>
        t.id === updated.id ? { ...t, name: updated.name, description: updated.description } : t
      )
    }
    formOpen = false
  }

  async function handleConfirm() {
    if (!confirmTask) return
    const target = confirmTask
    deletingId = target.id
    pageError = ''
    confirmOpen = false
    try {
      if (confirmIsPermanent) {
        await permanentDeleteTask(target.id)
        tasks = tasks.filter((t) => t.id !== target.id)
        selectedIds.delete(target.id)
        selectedIds = new Set(selectedIds)
      } else {
        await deleteTask(target.id)
        if (showActiveOnly) {
          tasks = tasks.filter((t) => t.id !== target.id)
        } else {
          tasks = tasks.map((t) => (t.id === target.id ? { ...t, is_active: false } : t))
        }
      }
    } catch (err) {
      pageError = parseApiError(err).error
    } finally {
      deletingId = null
      confirmTask = null
    }
  }

  async function handleReactivate(t: Task) {
    deletingId = t.id
    pageError = ''
    try {
      await reactivateTask(t.id)
      tasks = tasks.filter((task) => task.id !== t.id)
      selectedIds.delete(t.id)
      selectedIds = new Set(selectedIds)
    } catch (err) {
      pageError = parseApiError(err).error
    } finally {
      deletingId = null
    }
  }

  function toggleSelectAll() {
    selectedIds = allSelected ? new Set() : new Set(tasks.map((t) => t.id))
  }

  function toggleSelect(id: string) {
    if (selectedIds.has(id)) selectedIds.delete(id)
    else selectedIds.add(id)
    selectedIds = new Set(selectedIds)
  }

  function clearSelection() {
    selectedIds = new Set()
  }

  async function handleBulkSoftDelete() {
    if (selectedIds.size === 0 || selectedIds.size > 100) return
    bulkActionLoading = true
    bulkActionResult = ''
    pageError = ''
    try {
      const result = await bulkDeleteTasks(Array.from(selectedIds))
      bulkActionResult = `Soft-deleted ${result.soft_deleted} of ${result.requested}`
      tasks = tasks.filter((t) => !selectedIds.has(t.id))
      selectedIds = new Set()
    } catch (err) {
      pageError = parseApiError(err).error
    } finally {
      bulkActionLoading = false
    }
  }

  async function handleBulkPermanentDelete() {
    if (selectedIds.size === 0 || selectedIds.size > 100) return
    bulkActionLoading = true
    bulkActionResult = ''
    pageError = ''
    try {
      const result = await bulkPermanentDeleteTasks(Array.from(selectedIds))
      bulkActionResult = `Permanently deleted ${result.permanently_deleted} of ${result.requested}`
      tasks = tasks.filter((t) => !selectedIds.has(t.id))
      selectedIds = new Set()
    } catch (err) {
      pageError = parseApiError(err).error
    } finally {
      bulkActionLoading = false
    }
  }
</script>

<TopBar activePage="tasks" />

<main class="page-content">
  <header class="page-header">
    <h1>Tasks</h1>
    <button class="btn-primary" onclick={openCreate}>+ New Task</button>
  </header>

  <div class="filter-row">
    <div class="toggle-group">
      <button
        class="toggle-btn"
        class:active={showActiveOnly}
        onclick={() => (showActiveOnly = true)}
      >
        Active
      </button>
      <button
        class="toggle-btn"
        class:active={!showActiveOnly}
        onclick={() => (showActiveOnly = false)}
      >
        Inactive
      </button>
    </div>
    <select class="category-filter" bind:value={filterCategoryId}>
      <option value="">All categories</option>
      {#each $categories as cat (cat.id)}
        <option value={cat.id}>{cat.name}</option>
      {/each}
    </select>
  </div>

  {#if filterCategoryId && !$categoriesMap[filterCategoryId]}
    <div class="hint-banner">
      This category is inactive. Its tasks are hidden until the category is reactivated.
    </div>
  {/if}

  {#if selectedIds.size > 0}
    <div class="bulk-action-bar">
      <span class="selected-count">{selectedIds.size} selected</span>
      {#if showActiveOnly}
        <button
          class="btn-danger"
          onclick={handleBulkSoftDelete}
          disabled={bulkActionLoading || selectedIds.size > 100}
          title={selectedIds.size > 100 ? 'Select 100 or fewer' : ''}
        >
          {bulkActionLoading ? 'Deleting...' : 'Soft delete'}
        </button>
      {:else}
        <button
          class="btn-danger"
          onclick={handleBulkPermanentDelete}
          disabled={bulkActionLoading || selectedIds.size > 100}
          title={selectedIds.size > 100 ? 'Select 100 or fewer' : ''}
        >
          {bulkActionLoading ? 'Deleting...' : 'Permanent delete'}
        </button>
      {/if}
      <button class="btn-secondary" onclick={clearSelection}>Clear</button>
    </div>
  {/if}

  {#if bulkActionResult}
    <div class="success-banner">{bulkActionResult}</div>
  {/if}

  {#if pageError}
    <div class="error-banner">{pageError}</div>
  {/if}

  {#if loading}
    <div class="loading-state">Loading...</div>
  {:else if tasks.length === 0}
    <p class="empty-state">No tasks found.</p>
  {:else}
    <table class="data-table">
      <thead>
        <tr>
          <th class="checkbox-cell">
            <input
              type="checkbox"
              checked={allSelected}
              onchange={toggleSelectAll}
              aria-label="Select all"
            />
          </th>
          <th>Name</th>
          <th>Category</th>
          <th>Schedule</th>
          <th>Answer type</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {#each tasks as t (t.id)}
          <tr>
            <td class="checkbox-cell">
              <input
                type="checkbox"
                checked={selectedIds.has(t.id)}
                onchange={() => toggleSelect(t.id)}
                aria-label="Select {t.name}"
              />
            </td>
            <td class="name-cell">
              <button class="task-name-btn" onclick={() => openView(t.id)}>{t.name}</button>
            </td>
            <td class="category-cell">
              {#if $categoriesMap[t.category_id ?? '']}
                <span
                  class="category-swatch"
                  style="background: {$categoriesMap[t.category_id ?? ''].colour}"
                ></span>
              {/if}
              {$categoriesMap[t.category_id ?? '']?.name ?? '—'}
            </td>
            <td class="schedule-cell">—</td>
            <td class="type-cell">
              <span class="type-badge">{t.answer_type}</span>
            </td>
            <td class="status-cell">
              <span class="status-badge" class:active={t.is_active} class:inactive={!t.is_active}>
                {t.is_active ? 'Active' : 'Inactive'}
              </span>
            </td>
            <td class="actions-cell">
              <button class="btn-view" onclick={() => openView(t.id)}>View</button>
              {#if showActiveOnly}
                <button class="btn-secondary" onclick={() => openEdit(t)}>Edit</button>
                <button
                  class="btn-danger"
                  onclick={() => openConfirm(t, false)}
                  disabled={deletingId === t.id}
                >
                  {deletingId === t.id ? 'Deactivating...' : 'Deactivate'}
                </button>
              {:else}
                <button
                  class="btn-secondary"
                  onclick={() => handleReactivate(t)}
                  disabled={deletingId === t.id}
                >
                  {deletingId === t.id ? 'Reactivating...' : 'Reactivate'}
                </button>
                <button
                  class="btn-danger"
                  onclick={() => openConfirm(t, true)}
                  disabled={deletingId === t.id}
                >
                  Delete permanently
                </button>
              {/if}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}

  <TaskFormModal
    open={formOpen}
    {editingTask}
    onclose={() => (formOpen = false)}
    onsuccess={handleFormSuccess}
  />

  <TaskViewModal open={viewOpen} taskId={viewTaskId} onclose={() => (viewOpen = false)} />

  <ConfirmDeleteModal
    open={confirmOpen}
    taskName={confirmTask?.name ?? ''}
    isPermanent={confirmIsPermanent}
    onclose={() => {
      confirmOpen = false
      confirmTask = null
    }}
    onconfirm={handleConfirm}
  />
</main>

<style>
  .page-content {
    flex: 1;
    padding: 2rem;
    max-width: 1200px;
    margin: 0 auto;
    width: 100%;
  }

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
  }

  .bulk-action-bar {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.75rem 1rem;
    background: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: 6px;
    margin-bottom: 1rem;
  }

  .selected-count {
    font-weight: 500;
    color: var(--text-primary);
  }

  .hint-banner {
    background: #fef3c7;
    border: 1px solid #fcd34d;
    color: #92400e;
    padding: 0.75rem 1rem;
    border-radius: 6px;
    margin-bottom: 1rem;
    font-size: 0.875rem;
  }

  .success-banner {
    background: #dcfce7;
    border: 1px solid #86efac;
    color: #166534;
    padding: 0.75rem 1rem;
    border-radius: 6px;
    margin-bottom: 1rem;
  }

  .checkbox-cell {
    width: 40px;
    text-align: center;
  }

  .category-swatch {
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: 2px;
    margin-right: 6px;
    vertical-align: middle;
  }

  h1 {
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0;
  }

  .filter-row {
    display: flex;
    gap: 1rem;
    align-items: center;
    margin-bottom: 1.5rem;
  }

  .toggle-group {
    display: flex;
    border: 1px solid var(--border-primary);
    border-radius: 6px;
    overflow: hidden;
  }

  .toggle-btn {
    padding: 0.5rem 1rem;
    border: none;
    background: var(--bg-primary);
    color: var(--text-secondary);
    cursor: pointer;
    font-size: 0.875rem;
  }

  .toggle-btn.active {
    background: var(--accent);
    color: white;
  }

  .toggle-btn:not(:last-child) {
    border-right: 1px solid var(--border-primary);
  }

  .category-filter {
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--border-primary);
    border-radius: 6px;
    background: var(--bg-primary);
    color: var(--text-primary);
    font-size: 0.875rem;
  }

  .error-banner {
    background: var(--danger-light);
    border: 1px solid var(--danger-border);
    color: var(--danger);
    padding: 0.75rem 1rem;
    border-radius: 6px;
    margin-bottom: 1.5rem;
  }

  .loading-state,
  .empty-state {
    color: var(--text-secondary);
    padding: 2rem;
    text-align: center;
  }

  .data-table {
    width: 100%;
    border-collapse: collapse;
    background: var(--bg-primary);
    border: 1px solid var(--border-primary);
    border-radius: 8px;
    overflow: hidden;
  }

  .data-table th,
  .data-table td {
    padding: 0.75rem 1rem;
    text-align: left;
    border-bottom: 1px solid var(--border-primary);
  }

  .data-table th {
    background: var(--bg-secondary);
    font-weight: 500;
    font-size: 0.875rem;
    color: var(--text-secondary);
  }

  .data-table tbody tr:last-child td {
    border-bottom: none;
  }

  .name-cell {
    font-weight: 500;
    color: var(--text-primary);
  }

  .category-cell,
  .schedule-cell {
    color: var(--text-secondary);
    font-size: 0.875rem;
  }

  .type-badge {
    display: inline-block;
    padding: 0.25rem 0.5rem;
    background: var(--bg-tertiary);
    border-radius: 4px;
    font-size: 0.75rem;
    color: var(--text-secondary);
    text-transform: uppercase;
  }

  .status-badge {
    display: inline-block;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 500;
  }

  .status-badge.active {
    background: #dcfce7;
    color: #166534;
  }

  .status-badge.inactive {
    background: var(--bg-tertiary);
    color: var(--text-tertiary);
  }

  .actions-cell {
    display: flex;
    gap: 0.5rem;
  }

  .btn-primary {
    padding: 0.5rem 1rem;
    background: var(--accent);
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 500;
    font-size: 0.875rem;
  }

  .btn-primary:hover {
    background: var(--accent-dark);
  }

  .btn-secondary {
    padding: 0.375rem 0.75rem;
    background: var(--bg-primary);
    color: var(--text-primary);
    border: 1px solid var(--border-primary);
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.875rem;
  }

  .btn-secondary:hover {
    background: var(--bg-secondary);
  }

  .btn-danger {
    padding: 0.375rem 0.75rem;
    background: var(--bg-primary);
    color: var(--danger);
    border: 1px solid var(--danger-border);
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.875rem;
  }

  .btn-danger:hover {
    background: var(--danger-light);
  }

  .btn-danger:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .task-name-btn {
    background: none;
    border: none;
    padding: 0;
    font-weight: 500;
    font-size: inherit;
    color: var(--accent);
    cursor: pointer;
    text-align: left;
  }

  .task-name-btn:hover {
    text-decoration: underline;
  }

  .btn-view {
    padding: 0.25rem 0.625rem;
    border: 1px solid var(--border-primary);
    border-radius: 4px;
    background: var(--bg-primary);
    color: var(--text-secondary);
    font-size: 0.8125rem;
    cursor: pointer;
  }

  .btn-view:hover {
    background: var(--bg-secondary);
  }
</style>
