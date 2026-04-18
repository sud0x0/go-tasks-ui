<script lang="ts">
  import TopBar from '../lib/components/layout/TopBar.svelte'
  import Modal from '../lib/components/ui/Modal.svelte'
  import {
    listDailyLogs,
    listInactiveDailyLogs,
    updateDailyLog,
    deleteDailyLog,
    permanentDeleteDailyLog,
    reactivateDailyLog,
    bulkDeleteDailyLogs,
    bulkPermanentDeleteDailyLogs,
  } from '../lib/api/dailyLogs'
  import { parseApiError } from '../lib/utils/errors'
  import { todayISO, addDays } from '../lib/utils/dates'
  import type { DailyLog } from '../lib/types/api'

  // View state
  let showInactive = $state(false)
  let logs = $state<DailyLog[]>([])
  let loading = $state(false)
  let pageError = $state('')

  // Date filter state (active tab only)
  let startDate = $state(addDays(todayISO(), -30))
  let endDate = $state(todayISO())

  // Modal state
  let viewModalOpen = $state(false)
  let viewingLog = $state<DailyLog | null>(null)
  let editEntry = $state('')
  let modalSaving = $state(false)
  let modalError = $state('')

  // Confirm permanent delete modal state
  let confirmModalOpen = $state(false)
  let confirmLogId = $state<string | null>(null)
  let confirmInput = $state('')
  let confirmError = $state('')

  // Delete state
  let deletingId = $state<string | null>(null)

  // Multi-select state
  let selectedIds = $state<Set<string>>(new Set())
  let bulkActionLoading = $state(false)
  let bulkActionResult = $state('')

  let allSelected = $derived(logs.length > 0 && logs.every((l) => selectedIds.has(l.id)))

  // Sorted logs for display
  let sortedLogs = $derived(
    [...logs].sort((a, b) => new Date(b.log_date).getTime() - new Date(a.log_date).getTime())
  )

  // Load logs on mount and when tab/dates change
  $effect(() => {
    loadLogs()
  })

  async function loadLogs() {
    loading = true
    pageError = ''
    selectedIds = new Set()
    bulkActionResult = ''
    try {
      if (showInactive) {
        logs = await listInactiveDailyLogs()
      } else {
        logs = await listDailyLogs({ start_date: startDate, end_date: endDate })
      }
    } catch (err) {
      pageError = parseApiError(err).error
    } finally {
      loading = false
    }
  }

  function openView(log: DailyLog) {
    viewingLog = log
    editEntry = log.entry
    modalError = ''
    viewModalOpen = true
  }

  function closeViewModal() {
    viewModalOpen = false
    viewingLog = null
    editEntry = ''
    modalError = ''
    modalSaving = false
  }

  async function handleSaveEdit() {
    if (!viewingLog || showInactive) return
    modalSaving = true
    modalError = ''

    try {
      const result = await updateDailyLog(viewingLog.id, { entry: editEntry })
      logs = logs.map((l) => (l.id === result.id ? result : l))
      closeViewModal()
    } catch (err) {
      modalError = parseApiError(err).error
    } finally {
      modalSaving = false
    }
  }

  async function handleDelete(id: string) {
    deletingId = id
    pageError = ''

    try {
      await deleteDailyLog(id)
      logs = logs.filter((l) => l.id !== id)
      selectedIds.delete(id)
      selectedIds = new Set(selectedIds)
    } catch (err) {
      pageError = parseApiError(err).error
    } finally {
      deletingId = null
    }
  }

  function openConfirmPermanentDelete(log: DailyLog) {
    confirmLogId = log.id
    confirmInput = ''
    confirmError = ''
    confirmModalOpen = true
  }

  function closeConfirm() {
    confirmModalOpen = false
    confirmLogId = null
    confirmInput = ''
    confirmError = ''
  }

  async function handleConfirmPermanentDelete() {
    if (confirmInput !== 'delete') {
      confirmError = 'Type "delete" to confirm.'
      return
    }
    if (!confirmLogId) return

    confirmModalOpen = false
    deletingId = confirmLogId

    try {
      await permanentDeleteDailyLog(confirmLogId)
      logs = logs.filter((l) => l.id !== confirmLogId)
      selectedIds.delete(confirmLogId)
      selectedIds = new Set(selectedIds)
    } catch (err) {
      pageError = parseApiError(err).error
    } finally {
      deletingId = null
      closeConfirm()
    }
  }

  async function handleReactivate(log: DailyLog) {
    deletingId = log.id
    pageError = ''

    try {
      await reactivateDailyLog(log.id)
      logs = logs.filter((l) => l.id !== log.id)
      selectedIds.delete(log.id)
      selectedIds = new Set(selectedIds)
    } catch (err) {
      pageError = parseApiError(err).error
    } finally {
      deletingId = null
    }
  }

  function toggleSelectAll() {
    if (allSelected) {
      selectedIds = new Set()
    } else {
      selectedIds = new Set(logs.map((l) => l.id))
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

  async function handleBulkSoftDelete() {
    if (selectedIds.size === 0 || selectedIds.size > 100) return
    bulkActionLoading = true
    bulkActionResult = ''
    pageError = ''

    try {
      const result = await bulkDeleteDailyLogs(Array.from(selectedIds))
      bulkActionResult = `Soft-deleted ${result.soft_deleted} of ${result.requested}`
      logs = logs.filter((l) => !selectedIds.has(l.id))
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
      const result = await bulkPermanentDeleteDailyLogs(Array.from(selectedIds))
      bulkActionResult = `Permanently deleted ${result.permanently_deleted} of ${result.requested}`
      logs = logs.filter((l) => !selectedIds.has(l.id))
      selectedIds = new Set()
    } catch (err) {
      pageError = parseApiError(err).error
    } finally {
      bulkActionLoading = false
    }
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  function switchTab(inactive: boolean) {
    showInactive = inactive
    selectedIds = new Set()
    pageError = ''
    bulkActionResult = ''
  }

  function setLast30Days() {
    startDate = addDays(todayISO(), -30)
    endDate = todayISO()
  }

  function setThisMonth() {
    const now = new Date()
    startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
    endDate = todayISO()
  }

  function setThisYear() {
    const now = new Date()
    startDate = `${now.getFullYear()}-01-01`
    endDate = todayISO()
  }
</script>

<TopBar activePage="logs" />

<main class="page-content">
  <header class="page-header">
    <h1>Daily Logs</h1>
  </header>

  <div class="filter-row">
    <div class="toggle-group">
      <button class="toggle-btn" class:active={!showInactive} onclick={() => switchTab(false)}>
        Active
      </button>
      <button class="toggle-btn" class:active={showInactive} onclick={() => switchTab(true)}>
        Inactive
      </button>
    </div>

    {#if !showInactive}
      <div class="date-filters">
        <input type="date" bind:value={startDate} class="date-input" />
        <span class="date-separator">to</span>
        <input type="date" bind:value={endDate} class="date-input" />
        <button class="btn-quick" onclick={setLast30Days}>Last 30 days</button>
        <button class="btn-quick" onclick={setThisMonth}>This month</button>
        <button class="btn-quick" onclick={setThisYear}>This year</button>
      </div>
    {/if}
  </div>

  {#if selectedIds.size > 0}
    <div class="bulk-action-bar">
      <span class="selected-count">{selectedIds.size} selected</span>
      {#if showInactive}
        <button
          class="btn-danger"
          onclick={handleBulkPermanentDelete}
          disabled={bulkActionLoading || selectedIds.size > 100}
          title={selectedIds.size > 100 ? 'Select 100 or fewer' : ''}
        >
          {bulkActionLoading ? 'Deleting...' : 'Permanent delete'}
        </button>
      {:else}
        <button
          class="btn-danger"
          onclick={handleBulkSoftDelete}
          disabled={bulkActionLoading || selectedIds.size > 100}
          title={selectedIds.size > 100 ? 'Select 100 or fewer' : ''}
        >
          {bulkActionLoading ? 'Deleting...' : 'Soft delete'}
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
  {:else if sortedLogs.length === 0}
    <p class="empty-state">{showInactive ? 'No archived logs.' : 'No logs found.'}</p>
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
          <th>Date</th>
          <th>Updated</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {#each sortedLogs as log (log.id)}
          <tr>
            <td class="checkbox-cell">
              <input
                type="checkbox"
                checked={selectedIds.has(log.id)}
                onchange={() => toggleSelect(log.id)}
                aria-label="Select log from {formatDate(log.log_date)}"
              />
            </td>
            <td class="date-cell">{formatDate(log.log_date)}</td>
            <td class="updated-cell">{formatDate(log.updated_at)}</td>
            <td class="actions-cell">
              {#if showInactive}
                <button class="btn-secondary" onclick={() => openView(log)}>View</button>
                <button
                  class="btn-secondary"
                  onclick={() => handleReactivate(log)}
                  disabled={deletingId === log.id}
                >
                  {deletingId === log.id ? 'Reactivating...' : 'Reactivate'}
                </button>
                <button
                  class="btn-danger"
                  onclick={() => openConfirmPermanentDelete(log)}
                  disabled={deletingId === log.id}
                >
                  Delete permanently
                </button>
              {:else}
                <button class="btn-secondary" onclick={() => openView(log)}>View</button>
                <button
                  class="btn-danger"
                  onclick={() => handleDelete(log.id)}
                  disabled={deletingId === log.id}
                >
                  {deletingId === log.id ? 'Deleting...' : 'Delete'}
                </button>
              {/if}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}

  <Modal
    open={viewModalOpen}
    title={showInactive ? 'View log' : 'View / Edit log'}
    onclose={closeViewModal}
  >
    {#if viewingLog}
      <div class="view-modal-body">
        <p class="log-date">Date: {formatDate(viewingLog.log_date)}</p>
        {#if showInactive}
          <div class="log-entry-readonly">{viewingLog.entry}</div>
        {:else}
          <textarea class="log-entry-edit" bind:value={editEntry} rows="10" maxlength="10000"
          ></textarea>
        {/if}
        {#if modalError}
          <div class="modal-error">{modalError}</div>
        {/if}
        <div class="modal-actions">
          <button class="btn-secondary" onclick={closeViewModal}>
            {showInactive ? 'Close' : 'Cancel'}
          </button>
          {#if !showInactive}
            <button class="btn-primary" onclick={handleSaveEdit} disabled={modalSaving}>
              {modalSaving ? 'Saving...' : 'Save'}
            </button>
          {/if}
        </div>
      </div>
    {/if}
  </Modal>

  <Modal open={confirmModalOpen} title="Permanently delete log" onclose={closeConfirm}>
    <div class="confirm-body">
      <p class="confirm-message">
        This will permanently delete this log entry and cannot be undone.
      </p>
      <p class="confirm-instruction">Type "delete" to confirm:</p>
      <input
        class="confirm-input"
        type="text"
        bind:value={confirmInput}
        placeholder="delete"
        onkeydown={(e) => {
          if (e.key === 'Enter') handleConfirmPermanentDelete()
        }}
      />
      {#if confirmError}
        <p class="confirm-error">{confirmError}</p>
      {/if}
      <div class="confirm-actions">
        <button class="btn-cancel" onclick={closeConfirm}>Cancel</button>
        <button
          class="btn-delete-confirm"
          onclick={handleConfirmPermanentDelete}
          disabled={confirmInput !== 'delete'}
        >
          Delete permanently
        </button>
      </div>
    </div>
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
    flex-wrap: wrap;
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

  .date-filters {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .date-input {
    padding: 0.375rem 0.5rem;
    border: 1px solid var(--border-primary);
    border-radius: 6px;
    background: var(--bg-primary);
    color: var(--text-primary);
    font-size: 0.875rem;
  }

  .date-separator {
    color: var(--text-tertiary);
    font-size: 0.875rem;
  }

  .btn-quick {
    padding: 0.375rem 0.75rem;
    border: 1px solid var(--border-primary);
    border-radius: 6px;
    background: var(--bg-primary);
    color: var(--text-secondary);
    font-size: 0.75rem;
    cursor: pointer;
  }

  .btn-quick:hover {
    background: var(--bg-secondary);
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

  .date-cell {
    font-weight: 500;
    color: var(--text-primary);
    white-space: nowrap;
  }

  .updated-cell {
    color: var(--text-tertiary);
    font-size: 0.875rem;
    white-space: nowrap;
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

  .btn-primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
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

  .btn-secondary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
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

  .view-modal-body {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    min-width: 500px;
  }

  .log-date {
    font-size: 0.875rem;
    color: var(--text-tertiary);
    margin: 0;
  }

  .log-entry-readonly {
    background: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: 6px;
    padding: 1rem;
    font-size: 0.9375rem;
    color: var(--text-primary);
    white-space: pre-wrap;
    max-height: 400px;
    overflow-y: auto;
  }

  .log-entry-edit {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid var(--border-primary);
    border-radius: 6px;
    background: var(--bg-primary);
    color: var(--text-primary);
    font-family: inherit;
    font-size: inherit;
    resize: vertical;
    min-height: 200px;
  }

  .log-entry-edit:focus {
    outline: none;
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-light);
  }

  .modal-error {
    color: var(--danger);
    font-size: 0.875rem;
    padding: 0.5rem;
    background: var(--danger-light);
    border-radius: 4px;
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
    margin-top: 0.5rem;
  }

  .confirm-body {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .confirm-message {
    font-size: 0.9375rem;
    color: var(--text-primary);
    line-height: 1.6;
  }

  .confirm-instruction {
    font-size: 0.875rem;
    color: var(--text-secondary);
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
    transition: opacity 0.15s;
  }

  .btn-delete-confirm:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .btn-delete-confirm:not(:disabled):hover {
    opacity: 0.9;
  }
</style>
