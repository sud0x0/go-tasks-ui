<script lang="ts">
  import TopBar from '../lib/components/layout/TopBar.svelte'
  import Modal from '../lib/components/ui/Modal.svelte'
  import { categories, categoriesMap } from '../lib/stores/categories'
  import {
    listTasks,
    listInactiveTasks,
    getTask,
    createTask,
    updateTask,
    deleteTask,
    permanentDeleteTask,
    reactivateTask,
    bulkDeleteTasks,
    bulkPermanentDeleteTasks,
  } from '../lib/api/tasks'
  import { parseApiError } from '../lib/utils/errors'
  import { todayISO } from '../lib/utils/dates'
  import type {
    Task,
    TaskWithDetails,
    AnswerType,
    RecurrenceType,
    EndType,
    CreateTaskRequest,
  } from '../lib/types/api'

  // List state
  let tasks = $state<Task[]>([])
  let loading = $state(false)
  let pageError = $state('')
  let showActiveOnly = $state(true)
  let filterCategoryId = $state('')

  // Modal state
  let showModal = $state(false)
  let modalStep = $state<1 | 2>(1)
  let editingTask = $state<Task | null>(null)
  let modalError = $state('')
  let modalSaving = $state(false)
  let deletingId = $state<string | null>(null)

  // View modal state
  let viewingTask = $state<TaskWithDetails | null>(null)
  let viewModalOpen = $state(false)
  let viewLoading = $state(false)
  let viewError = $state('')

  // Confirm deactivate modal state
  let confirmModalOpen = $state(false)
  let confirmTaskId = $state<string | null>(null)
  let confirmTaskName = $state('')
  let confirmInput = $state('')
  let confirmError = $state('')
  let confirmIsPermanent = $state(false)

  // Multi-select state
  let selectedIds = $state<Set<string>>(new Set())
  let bulkActionLoading = $state(false)
  let bulkActionResult = $state('')

  let allSelected = $derived(tasks.length > 0 && tasks.every((t) => selectedIds.has(t.id)))

  // Step 1 modal state
  let modalName = $state('')
  let modalDescription = $state('')
  let modalCategoryId = $state('')
  let modalAnswerType = $state<AnswerType>('boolean')
  let modalSelectOptions = $state<string[]>(['', ''])

  // Step 2 modal state
  let modalRecurrenceType = $state<RecurrenceType>('daily')
  let modalStartDate = $state(todayISO())
  let modalEndType = $state<EndType>('never')
  let modalEndDate = $state('')
  let modalEndAfterN = $state(1)
  let modalInterval = $state(1)
  let modalDaysOfWeek = $state<number[]>([])
  let modalScheduledTimes = $state<string[]>([''])
  let modalMonthDay = $state(1)
  let modalMonthWeek = $state(1)
  let modalMonthWeekday = $state(0)
  let modalMonthOfYear = $state(1)

  // Scheduled time duplicate validation
  let scheduledTimeErrors = $derived(
    modalScheduledTimes.map((time, i) => {
      if (!time) return ''
      const isDuplicate = modalScheduledTimes.findIndex((t, j) => t === time && j !== i) !== -1
      return isDuplicate ? 'Duplicate time' : ''
    })
  )

  let hasScheduledTimeErrors = $derived(scheduledTimeErrors.some((e) => e !== ''))

  // Load tasks when filters change
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

  async function handleView(id: string) {
    viewLoading = true
    viewError = ''
    viewModalOpen = true
    viewingTask = null
    try {
      viewingTask = await getTask(id)
    } catch (err) {
      viewError = parseApiError(err).error
    } finally {
      viewLoading = false
    }
  }

  function openCreate() {
    editingTask = null
    modalStep = 1
    modalName = ''
    modalDescription = ''
    modalCategoryId = ''
    modalAnswerType = 'boolean'
    modalSelectOptions = ['', '']
    modalRecurrenceType = 'daily'
    modalStartDate = todayISO()
    modalEndType = 'never'
    modalEndDate = ''
    modalEndAfterN = 1
    modalInterval = 1
    modalDaysOfWeek = []
    modalScheduledTimes = ['']
    modalMonthDay = 1
    modalMonthWeek = 1
    modalMonthWeekday = 0
    modalMonthOfYear = 1
    modalError = ''
    showModal = true
  }

  function openEdit(t: Task) {
    editingTask = t
    modalStep = 1
    modalName = t.name
    modalDescription = t.description ?? ''
    modalError = ''
    showModal = true
  }

  function closeModal() {
    showModal = false
    modalStep = 1
    modalError = ''
  }

  function goToStep2() {
    if (!modalName.trim()) {
      modalError = 'Name is required'
      return
    }
    if (!modalCategoryId) {
      modalError = 'Category is required'
      return
    }
    modalError = ''
    modalStep = 2
  }

  function goToStep1() {
    modalStep = 1
  }

  async function handleSave(e: Event) {
    e.preventDefault()
    modalSaving = true
    modalError = ''

    if (hasScheduledTimeErrors) {
      modalError = 'Please fix duplicate scheduled times before saving.'
      modalSaving = false
      return
    }

    try {
      if (editingTask) {
        const result = await updateTask(editingTask.id, {
          name: modalName,
          description: modalDescription || undefined,
        })
        tasks = tasks.map((t) =>
          t.id === editingTask!.id
            ? { ...t, name: result.name, description: result.description }
            : t
        )
      } else {
        const selectOpts = modalSelectOptions.filter((o) => o.trim() !== '')
        const data: CreateTaskRequest = {
          category_id: modalCategoryId,
          name: modalName,
          description: modalDescription || undefined,
          answer_type: modalAnswerType,
          schedule: {
            recurrence_type: modalRecurrenceType,
            start_date: modalStartDate,
            end_type: modalEndType,
            recurrence_interval:
              modalRecurrenceType === 'every_n_days' || modalRecurrenceType === 'every_n_weeks'
                ? modalInterval
                : undefined,
            days_of_week: modalRecurrenceType === 'weekly' ? modalDaysOfWeek : undefined,
            month_day:
              modalRecurrenceType === 'monthly_date' || modalRecurrenceType === 'yearly'
                ? modalMonthDay
                : undefined,
            month_week: modalRecurrenceType === 'monthly_weekday' ? modalMonthWeek : undefined,
            month_weekday:
              modalRecurrenceType === 'monthly_weekday' ? modalMonthWeekday : undefined,
            month_of_year: modalRecurrenceType === 'yearly' ? modalMonthOfYear : undefined,
            scheduled_times:
              modalScheduledTimes.filter((t) => t.trim() !== '').length > 0
                ? modalScheduledTimes.filter((t) => t.trim() !== '')
                : undefined,
            end_date: modalEndType === 'on_date' ? modalEndDate : undefined,
            end_after_n: modalEndType === 'after_n' ? modalEndAfterN : undefined,
          },
          select_options:
            modalAnswerType === 'select' && selectOpts.length > 0
              ? selectOpts.map((v) => ({ value: v }))
              : undefined,
        }
        const result = await createTask(data)
        tasks = [result.task, ...tasks]
      }
      closeModal()
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
      await deleteTask(id)
      if (showActiveOnly) {
        tasks = tasks.filter((t) => t.id !== id)
      } else {
        tasks = tasks.map((t) => (t.id === id ? { ...t, is_active: false } : t))
      }
    } catch (err) {
      pageError = parseApiError(err).error
    } finally {
      deletingId = null
    }
  }

  function openConfirm(t: Task, isPermanent: boolean = false) {
    confirmTaskId = t.id
    confirmTaskName = t.name
    confirmInput = ''
    confirmError = ''
    confirmIsPermanent = isPermanent
    confirmModalOpen = true
  }

  function closeConfirm() {
    confirmModalOpen = false
    confirmTaskId = null
    confirmTaskName = ''
    confirmInput = ''
    confirmError = ''
    confirmIsPermanent = false
  }

  async function handleConfirmDeactivate() {
    if (confirmInput !== confirmTaskName) {
      confirmError = 'Task name does not match.'
      return
    }
    if (!confirmTaskId) return
    confirmModalOpen = false

    if (confirmIsPermanent) {
      await handlePermanentDelete(confirmTaskId)
    } else {
      await handleDelete(confirmTaskId)
    }
    closeConfirm()
  }

  async function handlePermanentDelete(id: string) {
    deletingId = id
    pageError = ''

    try {
      await permanentDeleteTask(id)
      tasks = tasks.filter((t) => t.id !== id)
      selectedIds.delete(id)
      selectedIds = new Set(selectedIds)
    } catch (err) {
      pageError = parseApiError(err).error
    } finally {
      deletingId = null
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
    if (allSelected) {
      selectedIds = new Set()
    } else {
      selectedIds = new Set(tasks.map((t) => t.id))
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

  function addSelectOption() {
    if (modalSelectOptions.length < 10) {
      modalSelectOptions = [...modalSelectOptions, '']
    }
  }

  function removeSelectOption(index: number) {
    if (modalSelectOptions.length > 2) {
      modalSelectOptions = modalSelectOptions.filter((_, i) => i !== index)
    }
  }

  function updateSelectOption(index: number, value: string) {
    modalSelectOptions = modalSelectOptions.map((o, i) => (i === index ? value : o))
  }

  function addScheduledTime() {
    modalScheduledTimes = [...modalScheduledTimes, '']
  }

  function removeScheduledTime(index: number) {
    modalScheduledTimes = modalScheduledTimes.filter((_, i) => i !== index)
  }

  function updateScheduledTime(index: number, value: string) {
    const updated = [...modalScheduledTimes]
    updated[index] = value
    modalScheduledTimes = updated
  }

  function toggleDayOfWeek(day: number) {
    if (modalDaysOfWeek.includes(day)) {
      modalDaysOfWeek = modalDaysOfWeek.filter((d) => d !== day)
    } else {
      modalDaysOfWeek = [...modalDaysOfWeek, day]
    }
  }

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const recurrenceTypes: { value: RecurrenceType; label: string }[] = [
    { value: 'once', label: 'Once' },
    { value: 'daily', label: 'Daily' },
    { value: 'every_n_days', label: 'Every N days' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'every_n_weeks', label: 'Every N weeks' },
    { value: 'monthly_date', label: 'Monthly (by date)' },
    { value: 'monthly_weekday', label: 'Monthly (by weekday)' },
    { value: 'yearly', label: 'Yearly' },
  ]
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
              <button class="task-name-btn" onclick={() => handleView(t.id)}>{t.name}</button>
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
              <button class="btn-view" onclick={() => handleView(t.id)}>View</button>
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

  <Modal
    open={showModal}
    title={editingTask
      ? 'Edit task'
      : modalStep === 1
        ? 'New task — details'
        : 'New task — schedule'}
    onclose={closeModal}
  >
    <form class="modal-form" onsubmit={handleSave}>
      {#if !editingTask}
        <p class="step-indicator">Step {modalStep} of 2</p>
      {/if}

      {#if modalStep === 1}
        <div class="form-group">
          <label for="task-name">Name</label>
          <input
            type="text"
            id="task-name"
            bind:value={modalName}
            required
            maxlength="200"
            placeholder="Task name"
          />
        </div>
        <div class="form-group">
          <label for="task-description">Description</label>
          <textarea
            id="task-description"
            bind:value={modalDescription}
            maxlength="1000"
            placeholder="Optional description"
            rows="3"
          ></textarea>
        </div>
        {#if !editingTask}
          <div class="form-group">
            <label for="task-category">Category</label>
            <select id="task-category" bind:value={modalCategoryId} required>
              <option value="">Select a category</option>
              {#each $categories as cat (cat.id)}
                <option value={cat.id}>{cat.name}</option>
              {/each}
            </select>
          </div>
          <div class="form-group">
            <label for="task-answer-type">Answer type</label>
            <select id="task-answer-type" bind:value={modalAnswerType}>
              <option value="boolean">Boolean (Yes/No)</option>
              <option value="integer">Integer</option>
              <option value="string">String</option>
              <option value="select">Select (multiple choice)</option>
            </select>
          </div>
          {#if modalAnswerType === 'select'}
            <div class="form-group">
              <label>Options (min 2, max 10)</label>
              <div class="select-options">
                {#each modalSelectOptions as opt, i (i)}
                  <div class="select-option-row">
                    <input
                      type="text"
                      value={opt}
                      oninput={(e) => updateSelectOption(i, e.currentTarget.value)}
                      placeholder={`Option ${i + 1}`}
                    />
                    {#if modalSelectOptions.length > 2}
                      <button type="button" class="btn-icon" onclick={() => removeSelectOption(i)}
                        >×</button
                      >
                    {/if}
                  </div>
                {/each}
                {#if modalSelectOptions.length < 10}
                  <button type="button" class="btn-link" onclick={addSelectOption}
                    >+ Add option</button
                  >
                {/if}
              </div>
            </div>
          {/if}
        {/if}
      {:else}
        <div class="form-group">
          <label for="task-recurrence">Recurrence type</label>
          <select id="task-recurrence" bind:value={modalRecurrenceType}>
            {#each recurrenceTypes as rt (rt.value)}
              <option value={rt.value}>{rt.label}</option>
            {/each}
          </select>
        </div>
        <div class="form-group">
          <label for="task-start-date">Start date</label>
          <input type="date" id="task-start-date" bind:value={modalStartDate} required />
        </div>
        <div class="form-group">
          <label class="form-label">Scheduled times <span class="optional">optional</span></label>
          {#each modalScheduledTimes as time, i}
            <div class="time-input-row">
              <input
                type="time"
                class="form-input time-input"
                class:input-error={scheduledTimeErrors[i] !== ''}
                value={time}
                onchange={(e) => updateScheduledTime(i, e.currentTarget.value)}
              />
              {#if scheduledTimeErrors[i]}
                <span class="time-error">{scheduledTimeErrors[i]}</span>
              {/if}
              {#if modalScheduledTimes.length > 1}
                <button type="button" class="btn-remove-time" onclick={() => removeScheduledTime(i)}
                  >✕</button
                >
              {/if}
            </div>
          {/each}
          <button type="button" class="btn-add-time" onclick={addScheduledTime}>+ Add time</button>
        </div>
        {#if modalRecurrenceType === 'every_n_days' || modalRecurrenceType === 'every_n_weeks'}
          <div class="form-group">
            <label for="task-interval">Interval</label>
            <input type="number" id="task-interval" bind:value={modalInterval} min="1" max="365" />
          </div>
        {/if}
        {#if modalRecurrenceType === 'weekly'}
          <div class="form-group">
            <label>Days of week</label>
            <div class="days-of-week">
              {#each dayNames as day, i (i)}
                <button
                  type="button"
                  class="day-btn"
                  class:selected={modalDaysOfWeek.includes(i)}
                  onclick={() => toggleDayOfWeek(i)}
                >
                  {day}
                </button>
              {/each}
            </div>
          </div>
        {/if}
        {#if modalRecurrenceType === 'monthly_date'}
          <div class="form-group">
            <label for="task-month-day">Day of month</label>
            <input type="number" id="task-month-day" bind:value={modalMonthDay} min="1" max="31" />
          </div>
        {/if}
        {#if modalRecurrenceType === 'monthly_weekday'}
          <div class="form-row">
            <div class="form-group">
              <label for="task-month-week">Week of month</label>
              <input
                type="number"
                id="task-month-week"
                bind:value={modalMonthWeek}
                min="1"
                max="5"
              />
            </div>
            <div class="form-group">
              <label for="task-month-weekday">Day of week</label>
              <select id="task-month-weekday" bind:value={modalMonthWeekday}>
                {#each dayNames as day, i (i)}
                  <option value={i}>{day}</option>
                {/each}
              </select>
            </div>
          </div>
        {/if}
        {#if modalRecurrenceType === 'yearly'}
          <div class="form-row">
            <div class="form-group">
              <label for="task-month-of-year">Month</label>
              <input
                type="number"
                id="task-month-of-year"
                bind:value={modalMonthOfYear}
                min="1"
                max="12"
              />
            </div>
            <div class="form-group">
              <label for="task-yearly-day">Day</label>
              <input
                type="number"
                id="task-yearly-day"
                bind:value={modalMonthDay}
                min="1"
                max="31"
              />
            </div>
          </div>
        {/if}
        <div class="form-group">
          <label for="task-end-type">End type</label>
          <select id="task-end-type" bind:value={modalEndType}>
            <option value="never">Never</option>
            <option value="on_date">On date</option>
            <option value="after_n">After N occurrences</option>
          </select>
        </div>
        {#if modalEndType === 'on_date'}
          <div class="form-group">
            <label for="task-end-date">End date</label>
            <input type="date" id="task-end-date" bind:value={modalEndDate} />
          </div>
        {/if}
        {#if modalEndType === 'after_n'}
          <div class="form-group">
            <label for="task-end-after">End after N occurrences</label>
            <input type="number" id="task-end-after" bind:value={modalEndAfterN} min="1" />
          </div>
        {/if}
      {/if}

      {#if modalError}
        <div class="modal-error">{modalError}</div>
      {/if}

      <div class="modal-actions">
        {#if editingTask}
          <button type="button" class="btn-secondary" onclick={closeModal}>Cancel</button>
          <button type="submit" class="btn-primary" disabled={modalSaving}>
            {modalSaving ? 'Saving...' : 'Save'}
          </button>
        {:else if modalStep === 1}
          <button type="button" class="btn-secondary" onclick={closeModal}>Cancel</button>
          <button type="button" class="btn-primary" onclick={goToStep2}>Next: Schedule →</button>
        {:else}
          <button type="button" class="btn-secondary" onclick={goToStep1}>← Back</button>
          <button type="submit" class="btn-primary" disabled={modalSaving}>
            {modalSaving ? 'Saving...' : 'Save'}
          </button>
        {/if}
      </div>
    </form>
  </Modal>

  <Modal open={viewModalOpen} title="Task details" onclose={() => (viewModalOpen = false)}>
    {#if viewLoading}
      <p class="loading-text">Loading...</p>
    {:else if viewError}
      <p class="error-text">{viewError}</p>
    {:else if viewingTask}
      <div class="detail-grid">
        <div class="detail-row">
          <span class="detail-label">Name</span>
          <span class="detail-value">{viewingTask.task.name}</span>
        </div>
        {#if viewingTask.task.description}
          <div class="detail-row">
            <span class="detail-label">Description</span>
            <span class="detail-value">{viewingTask.task.description}</span>
          </div>
        {/if}
        <div class="detail-row">
          <span class="detail-label">Category</span>
          <span class="detail-value"
            >{$categoriesMap[viewingTask.task.category_id ?? '']?.name ?? '—'}</span
          >
        </div>
        <div class="detail-row">
          <span class="detail-label">Answer type</span>
          <span class="detail-value">{viewingTask.task.answer_type}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Status</span>
          <span class="detail-value">{viewingTask.task.is_active ? 'Active' : 'Inactive'}</span>
        </div>
        {#if viewingTask.schedule}
          <hr class="detail-divider" />
          <div class="detail-row">
            <span class="detail-label">Recurrence</span>
            <span class="detail-value">{viewingTask.schedule.recurrence_type}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Start date</span>
            <span class="detail-value">{viewingTask.schedule.start_date.split('T')[0]}</span>
          </div>
          {#if viewingTask.schedule.scheduled_times?.length}
            <div class="detail-row">
              <span class="detail-label">Scheduled times</span>
              <span class="detail-value"
                >{viewingTask.schedule.scheduled_times
                  .map((t) => t.substring(0, 5))
                  .join(', ')}</span
              >
            </div>
          {/if}
          {#if viewingTask.schedule.end_type !== 'never'}
            <div class="detail-row">
              <span class="detail-label">End</span>
              <span class="detail-value">
                {viewingTask.schedule.end_type === 'on_date'
                  ? `On ${viewingTask.schedule.end_date}`
                  : `After ${viewingTask.schedule.end_after_n} occurrences`}
              </span>
            </div>
          {/if}
          {#if viewingTask.schedule.days_of_week?.length}
            <div class="detail-row">
              <span class="detail-label">Days of week</span>
              <span class="detail-value"
                >{viewingTask.schedule.days_of_week
                  .map((d) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d])
                  .join(', ')}</span
              >
            </div>
          {/if}
          {#if viewingTask.schedule.recurrence_interval}
            <div class="detail-row">
              <span class="detail-label">Interval</span>
              <span class="detail-value">Every {viewingTask.schedule.recurrence_interval}</span>
            </div>
          {/if}
        {/if}
        {#if viewingTask.select_options?.length}
          <hr class="detail-divider" />
          <div class="detail-row">
            <span class="detail-label">Options</span>
            <span class="detail-value"
              >{viewingTask.select_options.map((o) => o.value).join(', ')}</span
            >
          </div>
        {/if}
      </div>
    {/if}
  </Modal>

  <Modal
    open={confirmModalOpen}
    title={confirmIsPermanent ? 'Permanently delete task' : 'Deactivate task'}
    onclose={closeConfirm}
  >
    <div class="confirm-body">
      <p class="confirm-message">
        {#if confirmIsPermanent}
          This will permanently delete <strong>{confirmTaskName}</strong> and cannot be recovered.
        {:else}
          This will deactivate <strong>{confirmTaskName}</strong>. It will no longer appear in
          Today.
        {/if}
      </p>
      <p class="confirm-instruction">Type the task name to confirm:</p>
      <p class="confirm-task-name">{confirmTaskName}</p>
      <input
        class="confirm-input"
        type="text"
        bind:value={confirmInput}
        placeholder="Type task name here"
        onkeydown={(e) => {
          if (e.key === 'Enter') handleConfirmDeactivate()
        }}
      />
      {#if confirmError}
        <p class="confirm-error">{confirmError}</p>
      {/if}
      <div class="confirm-actions">
        <button class="btn-cancel" onclick={closeConfirm}>Cancel</button>
        <button
          class="btn-deactivate-confirm"
          onclick={handleConfirmDeactivate}
          disabled={confirmInput !== confirmTaskName}
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
    min-width: 450px;
  }

  .step-indicator {
    font-size: 0.75rem;
    color: var(--text-tertiary);
    margin: 0;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  .form-row {
    display: flex;
    gap: 1rem;
  }

  .form-row .form-group {
    flex: 1;
  }

  .form-group label {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-primary);
  }

  .form-group input,
  .form-group textarea,
  .form-group select {
    padding: 0.625rem 0.75rem;
    border: 1px solid var(--border-primary);
    border-radius: 6px;
    background: var(--bg-primary);
    color: var(--text-primary);
    font-size: inherit;
  }

  .form-group input:focus,
  .form-group textarea:focus,
  .form-group select:focus {
    outline: none;
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-light);
  }

  .form-group textarea {
    resize: vertical;
    font-family: inherit;
  }

  .select-options,
  .scheduled-times {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .select-option-row,
  .time-row {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .select-option-row input,
  .time-row input {
    flex: 1;
  }

  .btn-icon {
    width: 28px;
    height: 28px;
    border: 1px solid var(--border-primary);
    border-radius: 4px;
    background: var(--bg-primary);
    color: var(--text-secondary);
    cursor: pointer;
    font-size: 1rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .btn-icon:hover {
    background: var(--bg-secondary);
  }

  .btn-link {
    background: none;
    border: none;
    color: var(--accent);
    cursor: pointer;
    font-size: 0.875rem;
    padding: 0;
    text-align: left;
  }

  .btn-link:hover {
    text-decoration: underline;
  }

  .days-of-week {
    display: flex;
    gap: 0.25rem;
    flex-wrap: wrap;
  }

  .day-btn {
    padding: 0.375rem 0.625rem;
    border: 1px solid var(--border-primary);
    border-radius: 4px;
    background: var(--bg-primary);
    color: var(--text-secondary);
    cursor: pointer;
    font-size: 0.75rem;
  }

  .day-btn.selected {
    background: var(--accent);
    border-color: var(--accent);
    color: white;
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

  .detail-grid {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .detail-row {
    display: grid;
    grid-template-columns: 140px 1fr;
    gap: 1rem;
    align-items: baseline;
  }

  .detail-label {
    font-size: 0.8125rem;
    font-weight: 500;
    color: var(--text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .detail-value {
    font-size: 0.9375rem;
    color: var(--text-primary);
  }

  .detail-divider {
    border: none;
    border-top: 1px solid var(--border-primary);
    margin: 0.25rem 0;
  }

  .loading-text {
    color: var(--text-secondary);
    text-align: center;
    padding: 1rem;
  }

  .error-text {
    color: var(--danger);
    text-align: center;
    padding: 1rem;
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

  .confirm-task-name {
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

  .btn-deactivate-confirm {
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

  .btn-deactivate-confirm:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .btn-deactivate-confirm:not(:disabled):hover {
    opacity: 0.9;
  }

  .time-input-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .time-input {
    width: 140px;
  }

  .input-error {
    border-color: var(--danger);
  }

  .time-error {
    font-size: 0.75rem;
    color: var(--danger);
  }

  .btn-remove-time {
    background: none;
    border: none;
    color: var(--text-tertiary);
    cursor: pointer;
    font-size: 0.875rem;
    padding: 0.25rem;
  }

  .btn-remove-time:hover {
    color: var(--danger);
  }

  .btn-add-time {
    background: none;
    border: 1px dashed var(--border-primary);
    border-radius: 4px;
    color: var(--accent);
    font-size: 0.8125rem;
    padding: 0.25rem 0.75rem;
    cursor: pointer;
    margin-top: 0.25rem;
  }

  .btn-add-time:hover {
    background: var(--bg-secondary);
  }

  .optional {
    font-weight: 400;
    color: var(--text-tertiary);
    font-size: 0.8125rem;
  }

  .form-label {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-primary);
  }
</style>
