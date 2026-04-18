<script lang="ts">
  import TopBar from '../lib/components/layout/TopBar.svelte'
  import Modal from '../lib/components/ui/Modal.svelte'
  import { categories } from '../lib/stores/categories'
  import {
    addCategory,
    updateCategoryInStore,
    removeCategoryFromStore,
  } from '../lib/stores/categories'
  import {
    listCategories,
    listInactiveCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    permanentDeleteCategory,
    reactivateCategory,
    bulkDeleteCategories,
    bulkPermanentDeleteCategories,
  } from '../lib/api/categories'
  import { parseApiError } from '../lib/utils/errors'
  import type { Category } from '../lib/types/api'

  // View state
  let showInactive = $state(false)
  let inactiveCategories = $state<Category[]>([])
  let loading = $state(false)

  // Modal state
  let showModal = $state(false)
  let editingCategory = $state<Category | null>(null)
  let modalName = $state('')
  let modalDescription = $state('')
  let modalColour = $state('#808080')
  let modalError = $state('')
  let modalSaving = $state(false)

  // Confirm delete modal state
  let confirmModalOpen = $state(false)
  let confirmCategoryId = $state<string | null>(null)
  let confirmCategoryName = $state('')
  let confirmInput = $state('')
  let confirmError = $state('')
  let confirmIsPermanent = $state(false)

  // Delete state
  let deletingId = $state<string | null>(null)
  let deleteError = $state('')
  let pageError = $state('')

  // Multi-select state
  let selectedIds = $state<Set<string>>(new Set())
  let bulkActionLoading = $state(false)
  let bulkActionResult = $state('')

  // Sorted categories for display
  let displayCategories = $derived(
    showInactive
      ? [...inactiveCategories].sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )
      : [...$categories].sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )
  )

  let allSelected = $derived(
    displayCategories.length > 0 && displayCategories.every((c) => selectedIds.has(c.id))
  )

  // Load inactive categories when tab changes
  $effect(() => {
    if (showInactive) {
      loadInactiveCategories()
    }
  })

  async function loadInactiveCategories() {
    loading = true
    pageError = ''
    try {
      inactiveCategories = await listInactiveCategories()
    } catch (err) {
      pageError = parseApiError(err).error
    } finally {
      loading = false
    }
  }

  function openCreate() {
    editingCategory = null
    modalName = ''
    modalDescription = ''
    modalColour = '#808080'
    modalError = ''
    showModal = true
  }

  function openEdit(cat: Category) {
    editingCategory = cat
    modalName = cat.name
    modalDescription = cat.description ?? ''
    modalColour = cat.colour || '#808080'
    modalError = ''
    showModal = true
  }

  function closeModal() {
    showModal = false
    editingCategory = null
    modalName = ''
    modalDescription = ''
    modalColour = '#808080'
    modalError = ''
    modalSaving = false
  }

  async function handleSave(e: Event) {
    e.preventDefault()
    modalSaving = true
    modalError = ''

    try {
      if (editingCategory === null) {
        const result = await createCategory({
          name: modalName,
          description: modalDescription || undefined,
          colour: modalColour.toLowerCase(),
        })
        addCategory(result)
      } else {
        const result = await updateCategory(editingCategory.id, {
          name: modalName,
          description: modalDescription || undefined,
          colour: modalColour.toLowerCase(),
        })
        updateCategoryInStore(result)
      }
      closeModal()
    } catch (err) {
      modalError = parseApiError(err).error
    } finally {
      modalSaving = false
    }
  }

  function openConfirmDeactivate(cat: Category) {
    confirmCategoryId = cat.id
    confirmCategoryName = cat.name
    confirmInput = ''
    confirmError = ''
    confirmIsPermanent = false
    confirmModalOpen = true
  }

  function openConfirmPermanentDelete(cat: Category) {
    confirmCategoryId = cat.id
    confirmCategoryName = cat.name
    confirmInput = ''
    confirmError = ''
    confirmIsPermanent = true
    confirmModalOpen = true
  }

  function closeConfirm() {
    confirmModalOpen = false
    confirmCategoryId = null
    confirmCategoryName = ''
    confirmInput = ''
    confirmError = ''
    confirmIsPermanent = false
  }

  async function handleConfirmDelete() {
    if (confirmInput !== confirmCategoryName) {
      confirmError = 'Category name does not match.'
      return
    }
    if (!confirmCategoryId) return

    confirmModalOpen = false
    deletingId = confirmCategoryId

    try {
      if (confirmIsPermanent) {
        await permanentDeleteCategory(confirmCategoryId)
        inactiveCategories = inactiveCategories.filter((c) => c.id !== confirmCategoryId)
      } else {
        await deleteCategory(confirmCategoryId)
        removeCategoryFromStore(confirmCategoryId)
      }
      selectedIds.delete(confirmCategoryId)
      selectedIds = new Set(selectedIds)
    } catch (err) {
      const parsed = parseApiError(err).error
      if (!confirmIsPermanent && parsed.toLowerCase().includes('active tasks')) {
        deleteError = 'This category has active tasks. Delete or move them first.'
      } else {
        pageError = parsed
      }
    } finally {
      deletingId = null
      closeConfirm()
    }
  }

  async function handleReactivate(cat: Category) {
    deletingId = cat.id
    pageError = ''

    try {
      const result = await reactivateCategory(cat.id)
      inactiveCategories = inactiveCategories.filter((c) => c.id !== cat.id)
      addCategory(result)
      selectedIds.delete(cat.id)
      selectedIds = new Set(selectedIds)
    } catch (err) {
      const parsed = parseApiError(err).error
      if (parsed.toLowerCase().includes('another active category')) {
        pageError = 'Another active category already uses this name. Rename the other one first.'
      } else {
        pageError = parsed
      }
    } finally {
      deletingId = null
    }
  }

  function toggleSelectAll() {
    if (allSelected) {
      selectedIds = new Set()
    } else {
      selectedIds = new Set(displayCategories.map((c) => c.id))
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
      const result = await bulkDeleteCategories(Array.from(selectedIds))
      bulkActionResult = `Soft-deleted ${result.soft_deleted} of ${result.requested}`

      // Refresh categories
      const freshCategories = await listCategories()
      // Update the store by removing deleted ones
      for (const id of selectedIds) {
        removeCategoryFromStore(id)
      }
      // Re-add fresh ones
      freshCategories.forEach(addCategory)

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
      const result = await bulkPermanentDeleteCategories(Array.from(selectedIds))
      bulkActionResult = `Permanently deleted ${result.permanently_deleted} of ${result.requested}`
      inactiveCategories = inactiveCategories.filter((c) => !selectedIds.has(c.id))
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
    deleteError = ''
    pageError = ''
    bulkActionResult = ''
  }
</script>

<TopBar activePage="categories" />

<main class="page-content">
  <header class="page-header">
    <h1>Categories</h1>
    {#if !showInactive}
      <button class="btn-primary" onclick={openCreate}>+ New Category</button>
    {/if}
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

  {#if deleteError}
    <div class="error-banner">{deleteError}</div>
  {/if}

  {#if loading}
    <div class="loading-state">Loading...</div>
  {:else if displayCategories.length === 0}
    <p class="empty-state">
      {showInactive ? 'No archived categories.' : 'No categories yet. Create one to get started.'}
    </p>
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
          <th class="colour-cell"></th>
          <th>Name</th>
          <th>Description</th>
          <th>Created</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {#each displayCategories as cat (cat.id)}
          <tr>
            <td class="checkbox-cell">
              <input
                type="checkbox"
                checked={selectedIds.has(cat.id)}
                onchange={() => toggleSelect(cat.id)}
                aria-label="Select {cat.name}"
              />
            </td>
            <td class="colour-cell">
              <span class="colour-swatch" style="background: {cat.colour}"></span>
            </td>
            <td class="name-cell">{cat.name}</td>
            <td class="description-cell">{cat.description ?? '—'}</td>
            <td class="date-cell">{formatDate(cat.created_at)}</td>
            <td class="actions-cell">
              {#if showInactive}
                <button
                  class="btn-secondary"
                  onclick={() => handleReactivate(cat)}
                  disabled={deletingId === cat.id}
                >
                  {deletingId === cat.id ? 'Reactivating...' : 'Reactivate'}
                </button>
                <button
                  class="btn-danger"
                  onclick={() => openConfirmPermanentDelete(cat)}
                  disabled={deletingId === cat.id}
                >
                  Delete permanently
                </button>
              {:else}
                <button class="btn-secondary" onclick={() => openEdit(cat)}>Edit</button>
                <button
                  class="btn-danger"
                  onclick={() => openConfirmDeactivate(cat)}
                  disabled={deletingId === cat.id}
                >
                  {deletingId === cat.id ? 'Deactivating...' : 'Deactivate'}
                </button>
              {/if}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}

  <Modal
    open={showModal}
    title={editingCategory ? 'Edit category' : 'New category'}
    onclose={closeModal}
  >
    <form class="modal-form" onsubmit={handleSave}>
      <div class="form-group">
        <label for="cat-name">Name</label>
        <input
          type="text"
          id="cat-name"
          bind:value={modalName}
          required
          maxlength="100"
          placeholder="Category name"
        />
      </div>
      <div class="form-group">
        <label for="cat-description">Description</label>
        <textarea
          id="cat-description"
          bind:value={modalDescription}
          maxlength="500"
          placeholder="Optional description"
          rows="3"
        ></textarea>
      </div>
      <div class="form-group">
        <label for="cat-colour">Colour</label>
        <div class="colour-input-row">
          <input type="color" id="cat-colour" bind:value={modalColour} class="colour-picker" />
          <span class="colour-hex">{modalColour}</span>
        </div>
      </div>
      {#if modalError}
        <div class="modal-error">{modalError}</div>
      {/if}
      <div class="modal-actions">
        <button type="button" class="btn-secondary" onclick={closeModal}>Cancel</button>
        <button type="submit" class="btn-primary" disabled={modalSaving}>
          {modalSaving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </form>
  </Modal>

  <Modal
    open={confirmModalOpen}
    title={confirmIsPermanent ? 'Permanently delete category' : 'Deactivate category'}
    onclose={closeConfirm}
  >
    <div class="confirm-body">
      <p class="confirm-message">
        {#if confirmIsPermanent}
          This will permanently delete <strong>{confirmCategoryName}</strong> and all its associated tasks.
          This cannot be undone.
        {:else}
          This will deactivate <strong>{confirmCategoryName}</strong>. You can reactivate it later
          from the Inactive tab.
        {/if}
      </p>
      <p class="confirm-instruction">Type the category name to confirm:</p>
      <p class="confirm-name">{confirmCategoryName}</p>
      <input
        class="confirm-input"
        type="text"
        bind:value={confirmInput}
        placeholder="Type category name here"
        onkeydown={(e) => {
          if (e.key === 'Enter') handleConfirmDelete()
        }}
      />
      {#if confirmError}
        <p class="confirm-error">{confirmError}</p>
      {/if}
      <div class="confirm-actions">
        <button class="btn-cancel" onclick={closeConfirm}>Cancel</button>
        <button
          class="btn-delete-confirm"
          onclick={handleConfirmDelete}
          disabled={confirmInput !== confirmCategoryName}
        >
          {confirmIsPermanent ? 'Delete permanently' : 'Deactivate'}
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

  .colour-cell {
    width: 32px;
    padding-right: 0;
  }

  .colour-swatch {
    display: inline-block;
    width: 14px;
    height: 14px;
    border-radius: 3px;
    vertical-align: middle;
  }

  .name-cell {
    font-weight: 500;
    color: var(--text-primary);
  }

  .description-cell {
    color: var(--text-secondary);
    font-size: 0.875rem;
  }

  .date-cell {
    color: var(--text-tertiary);
    font-size: 0.875rem;
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

  .modal-form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    min-width: 400px;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  .form-group label {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-primary);
  }

  .form-group input,
  .form-group textarea {
    padding: 0.625rem 0.75rem;
    border: 1px solid var(--border-primary);
    border-radius: 6px;
    background: var(--bg-primary);
    color: var(--text-primary);
    font-size: inherit;
  }

  .form-group input:focus,
  .form-group textarea:focus {
    outline: none;
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-light);
  }

  .form-group textarea {
    resize: vertical;
    font-family: inherit;
  }

  .colour-input-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .colour-picker {
    width: 48px;
    height: 36px;
    padding: 2px;
    border: 1px solid var(--border-primary);
    border-radius: 6px;
    cursor: pointer;
  }

  .colour-hex {
    font-size: 0.875rem;
    color: var(--text-secondary);
    font-family: monospace;
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

  .confirm-name {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-primary);
    background: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: 4px;
    padding: 0.375rem 0.75rem;
    font-family: var(--font-mono, monospace);
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
