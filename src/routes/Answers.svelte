<script lang="ts">
  import TopBar from '../lib/components/layout/TopBar.svelte'
  import Modal from '../lib/components/ui/Modal.svelte'
  import { listOccurrences, bulkDeleteAnswers } from '../lib/api/occurrences'
  import { parseApiError } from '../lib/utils/errors'
  import { todayISO, addDays } from '../lib/utils/dates'
  import { categories, categoriesMap } from '../lib/stores/categories'
  import type { OccurrenceWithDetails } from '../lib/types/api'

  // State
  let startDate = $state(addDays(todayISO(), -7))
  let endDate = $state(todayISO())
  let occurrences = $state<OccurrenceWithDetails[]>([])
  let loading = $state(false)
  let error = $state('')
  let categoryFilter = $state('')

  // Multi-select state
  let selectedIds = $state<Set<string>>(new Set())
  let bulkActionLoading = $state(false)
  let bulkActionResult = $state('')

  // Confirm modal state
  let confirmModalOpen = $state(false)
  let confirmInput = $state('')
  let confirmError = $state('')

  // View answer modal state
  let viewModalOpen = $state(false)
  let viewingOcc = $state<OccurrenceWithDetails | null>(null)

  // Filter to only show answered occurrences
  let answeredOccurrences = $derived(
    occurrences.filter((o) => o.answer !== undefined && !o.occurrence.is_suppressed)
  )

  let filteredOccurrences = $derived(
    categoryFilter
      ? answeredOccurrences.filter((o) => o.task.category_id === categoryFilter)
      : answeredOccurrences
  )

  let allSelected = $derived(
    filteredOccurrences.length > 0 &&
      filteredOccurrences.every((o) => selectedIds.has(o.occurrence.id))
  )

  // Load data
  $effect(() => {
    loadData()
  })

  async function loadData() {
    loading = true
    error = ''
    bulkActionResult = ''
    selectedIds = new Set()
    try {
      occurrences = await listOccurrences({ start_date: startDate, end_date: endDate })
    } catch (err) {
      error = parseApiError(err).error
    } finally {
      loading = false
    }
  }

  function toggleSelectAll() {
    if (allSelected) {
      selectedIds = new Set()
    } else {
      selectedIds = new Set(filteredOccurrences.map((o) => o.occurrence.id))
    }
  }

  function toggleSelect(id: string) {
    if (selectedIds.has(id)) {
      selectedIds.delete(id)
    } else {
      selectedIds.add(id)
    }
    selectedIds = new Set(selectedIds)
  }

  function clearSelection() {
    selectedIds = new Set()
  }

  function openConfirmModal() {
    if (selectedIds.size === 0 || selectedIds.size > 100) return
    confirmInput = ''
    confirmError = ''
    confirmModalOpen = true
  }

  function closeConfirmModal() {
    confirmModalOpen = false
    confirmInput = ''
    confirmError = ''
  }

  async function handleConfirmDelete() {
    if (confirmInput !== 'delete') {
      confirmError = 'Please type "delete" to confirm.'
      return
    }

    confirmModalOpen = false
    bulkActionLoading = true
    bulkActionResult = ''
    error = ''

    try {
      const result = await bulkDeleteAnswers(Array.from(selectedIds))
      bulkActionResult = `Deleted ${result.deleted} of ${result.requested} answers`

      // Remove deleted answers from local state
      occurrences = occurrences.map((o) =>
        selectedIds.has(o.occurrence.id) ? { ...o, answer: undefined } : o
      )
      selectedIds = new Set()
    } catch (err) {
      error = parseApiError(err).error
    } finally {
      bulkActionLoading = false
      closeConfirmModal()
    }
  }

  function getAnswerDisplay(occ: OccurrenceWithDetails): string {
    if (!occ.answer) return '—'
    switch (occ.task.answer_type) {
      case 'string': {
        const str = occ.answer.answer_string ?? ''
        return str.length > 50 ? str.substring(0, 50) + '...' : str
      }
      case 'integer':
        return occ.answer.answer_integer?.toString() ?? '—'
      case 'boolean':
        return occ.answer.answer_boolean ? 'Yes' : 'No'
      case 'select': {
        const optId = occ.answer.answer_select
        const opt = occ.select_options?.find((o) => o.id === optId)
        return opt?.value ?? '—'
      }
      default:
        return '—'
    }
  }

  function formatDateTime(dateStr: string): string {
    return new Date(dateStr).toLocaleString('en-AU', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  function formatTime(timeStr: string | undefined): string {
    if (!timeStr) return '—'
    return timeStr.substring(11, 16)
  }

  function openViewModal(occ: OccurrenceWithDetails) {
    viewingOcc = occ
    viewModalOpen = true
  }

  function closeViewModal() {
    viewModalOpen = false
    viewingOcc = null
  }
</script>

<TopBar activePage="answers" />

<main class="page-content">
  <header class="page-header">
    <h1>Answers</h1>
  </header>

  <div class="filter-row">
    <div class="date-range">
      <label>
        From:
        <input type="date" bind:value={startDate} />
      </label>
      <label>
        To:
        <input type="date" bind:value={endDate} />
      </label>
      <button class="btn-secondary" onclick={loadData}>Load</button>
    </div>
    <select class="category-filter" bind:value={categoryFilter}>
      <option value="">All categories</option>
      {#each $categories as cat (cat.id)}
        <option value={cat.id}>{cat.name}</option>
      {/each}
    </select>
  </div>

  {#if selectedIds.size > 0}
    <div class="bulk-action-bar">
      <span class="selected-count">{selectedIds.size} selected</span>
      <button
        class="btn-danger"
        onclick={openConfirmModal}
        disabled={bulkActionLoading || selectedIds.size > 100}
        title={selectedIds.size > 100 ? 'Select 100 or fewer' : ''}
      >
        {bulkActionLoading ? 'Deleting...' : 'Delete answers'}
      </button>
      <button class="btn-secondary" onclick={clearSelection}>Clear</button>
    </div>
  {/if}

  {#if bulkActionResult}
    <div class="success-banner">{bulkActionResult}</div>
  {/if}

  {#if error}
    <div class="error-banner">{error}</div>
  {/if}

  {#if loading}
    <div class="loading-state">Loading...</div>
  {:else if filteredOccurrences.length === 0}
    <p class="empty-state">No answered occurrences found in this date range.</p>
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
          <th>Task</th>
          <th>Category</th>
          <th>Type</th>
          <th>Time</th>
          <th>Answered At</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {#each filteredOccurrences as occ (occ.occurrence.id)}
          <tr>
            <td class="checkbox-cell">
              <input
                type="checkbox"
                checked={selectedIds.has(occ.occurrence.id)}
                onchange={() => toggleSelect(occ.occurrence.id)}
                aria-label="Select {occ.task.name}"
              />
            </td>
            <td class="task-cell">
              <span class="task-name">{occ.task.name}</span>
              <span class="occurrence-date">{occ.occurrence.occurrence_date.substring(0, 10)}</span>
            </td>
            <td class="category-cell">
              {#if $categoriesMap[occ.task.category_id ?? '']}
                <span
                  class="category-swatch"
                  style="background: {$categoriesMap[occ.task.category_id ?? ''].colour}"
                ></span>
              {/if}
              {$categoriesMap[occ.task.category_id ?? '']?.name ?? '—'}
            </td>
            <td class="type-cell">
              <span class="answer-type-badge">{occ.task.answer_type}</span>
            </td>
            <td class="time-cell">{formatTime(occ.occurrence.scheduled_time)}</td>
            <td class="date-cell">{occ.answer ? formatDateTime(occ.answer.answered_at) : '—'}</td>
            <td class="actions-cell">
              <button class="btn-view" onclick={() => openViewModal(occ)}>View</button>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}

  <Modal open={confirmModalOpen} title="Delete answers" onclose={closeConfirmModal}>
    <div class="confirm-body">
      <p class="confirm-warning">
        This will permanently delete {selectedIds.size} answer{selectedIds.size === 1 ? '' : 's'}.
        This action cannot be undone.
      </p>
      <p class="confirm-instruction">
        Type <strong>delete</strong> to confirm:
      </p>
      <input
        class="confirm-input"
        type="text"
        bind:value={confirmInput}
        placeholder="Type delete here"
        onkeydown={(e) => {
          if (e.key === 'Enter') handleConfirmDelete()
        }}
      />
      {#if confirmError}
        <p class="confirm-error">{confirmError}</p>
      {/if}
      <div class="confirm-actions">
        <button class="btn-cancel" onclick={closeConfirmModal}>Cancel</button>
        <button
          class="btn-delete-confirm"
          onclick={handleConfirmDelete}
          disabled={confirmInput !== 'delete'}
        >
          Delete permanently
        </button>
      </div>
    </div>
  </Modal>

  <Modal open={viewModalOpen} title="View Answer" onclose={closeViewModal}>
    {#if viewingOcc}
      <div class="view-modal-body">
        <div class="view-row">
          <span class="view-label">Task:</span>
          <span class="view-value">{viewingOcc.task.name}</span>
        </div>
        <div class="view-row">
          <span class="view-label">Date:</span>
          <span class="view-value">{viewingOcc.occurrence.occurrence_date.substring(0, 10)}</span>
        </div>
        {#if viewingOcc.occurrence.scheduled_time}
          <div class="view-row">
            <span class="view-label">Time:</span>
            <span class="view-value">{formatTime(viewingOcc.occurrence.scheduled_time)}</span>
          </div>
        {/if}
        <div class="view-row">
          <span class="view-label">Type:</span>
          <span class="view-value">{viewingOcc.task.answer_type}</span>
        </div>
        <div class="view-row">
          <span class="view-label">Answer:</span>
          <span class="view-value answer-value">{getAnswerDisplay(viewingOcc)}</span>
        </div>
        <div class="view-actions">
          <button class="btn-secondary" onclick={closeViewModal}>Close</button>
        </div>
      </div>
    {/if}
  </Modal>
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
    flex-wrap: wrap;
  }

  .date-range {
    display: flex;
    gap: 0.75rem;
    align-items: center;
  }

  .date-range label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    color: var(--text-secondary);
  }

  .date-range input[type='date'] {
    padding: 0.375rem 0.5rem;
    border: 1px solid var(--border-primary);
    border-radius: 6px;
    background: var(--bg-primary);
    color: var(--text-primary);
    font-size: inherit;
  }

  .category-filter {
    padding: 0.375rem 0.75rem;
    border: 1px solid var(--border-primary);
    border-radius: 6px;
    background: var(--bg-primary);
    color: var(--text-primary);
    font-size: inherit;
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

  .success-banner {
    background: #dcfce7;
    border: 1px solid #86efac;
    color: #166534;
    padding: 0.75rem 1rem;
    border-radius: 6px;
    margin-bottom: 1rem;
  }

  .error-banner {
    background: var(--danger-light);
    border: 1px solid var(--danger-border);
    color: var(--danger);
    padding: 0.75rem 1rem;
    border-radius: 6px;
    margin-bottom: 1rem;
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

  .checkbox-cell {
    width: 40px;
    text-align: center;
  }

  .task-cell {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .task-name {
    font-weight: 500;
    color: var(--text-primary);
  }

  .occurrence-date {
    font-size: 0.75rem;
    color: var(--text-tertiary);
  }

  .category-cell {
    color: var(--text-secondary);
    font-size: 0.875rem;
  }

  .category-swatch {
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: 2px;
    margin-right: 6px;
    vertical-align: middle;
  }

  .type-cell {
    color: var(--text-tertiary);
    font-size: 0.75rem;
    text-transform: uppercase;
  }

  .answer-type-badge {
    padding: 0.125rem 0.375rem;
    background: var(--bg-secondary);
    border-radius: 4px;
  }

  .time-cell {
    color: var(--text-secondary);
    font-size: 0.875rem;
    white-space: nowrap;
  }

  .date-cell {
    color: var(--text-tertiary);
    font-size: 0.875rem;
    white-space: nowrap;
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

  .confirm-body {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    min-width: 320px;
  }

  .confirm-warning {
    font-size: 0.9375rem;
    color: var(--danger);
    line-height: 1.6;
    margin: 0;
    padding: 0.75rem;
    background: var(--danger-light);
    border: 1px solid var(--danger-border);
    border-radius: 6px;
  }

  .confirm-instruction {
    font-size: 0.875rem;
    color: var(--text-secondary);
    margin: 0;
  }

  .confirm-input {
    width: 100%;
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--border-primary);
    border-radius: 6px;
    background: var(--bg-primary);
    color: var(--text-primary);
    font-size: 0.9375rem;
  }

  .confirm-input:focus {
    outline: none;
    border-color: var(--accent);
  }

  .confirm-error {
    font-size: 0.875rem;
    color: var(--danger);
    margin: 0;
  }

  .confirm-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
    margin-top: 0.5rem;
    padding-top: 0.75rem;
    border-top: 1px solid var(--border-primary);
  }

  .btn-cancel {
    padding: 0.5rem 1rem;
    border: 1px solid var(--border-primary);
    border-radius: 6px;
    background: var(--bg-primary);
    color: var(--text-secondary);
    font-size: 0.875rem;
    cursor: pointer;
  }

  .btn-cancel:hover {
    background: var(--bg-secondary);
  }

  .btn-delete-confirm {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 6px;
    background: var(--danger);
    color: white;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
  }

  .btn-delete-confirm:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .btn-delete-confirm:not(:disabled):hover {
    opacity: 0.9;
  }

  .actions-cell {
    white-space: nowrap;
  }

  .btn-view {
    padding: 0.25rem 0.625rem;
    background: var(--bg-primary);
    color: var(--text-primary);
    border: 1px solid var(--border-primary);
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.8125rem;
  }

  .btn-view:hover {
    background: var(--bg-secondary);
  }

  .view-modal-body {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    min-width: 300px;
  }

  .view-row {
    display: flex;
    gap: 0.75rem;
  }

  .view-label {
    font-size: 0.875rem;
    color: var(--text-tertiary);
    min-width: 60px;
  }

  .view-value {
    font-size: 0.9375rem;
    color: var(--text-primary);
  }

  .answer-value {
    font-weight: 500;
  }

  .view-actions {
    display: flex;
    justify-content: flex-end;
    margin-top: 0.5rem;
    padding-top: 0.75rem;
    border-top: 1px solid var(--border-primary);
  }
</style>
