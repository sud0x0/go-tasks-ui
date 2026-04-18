<script lang="ts">
  import TopBar from '../lib/components/layout/TopBar.svelte'
  import DateNav from '../lib/components/ui/DateNav.svelte'
  import ProgressBar from '../lib/components/ui/ProgressBar.svelte'
  import Modal from '../lib/components/ui/Modal.svelte'
  import {
    listOccurrences,
    submitAnswer,
    suppressOccurrence,
    unsuppressOccurrence,
    bulkDeleteAnswers,
  } from '../lib/api/occurrences'
  import {
    listDailyLogs,
    listInactiveDailyLogs,
    createDailyLog,
    updateDailyLog,
    reactivateDailyLog,
  } from '../lib/api/dailyLogs'
  import { parseApiError } from '../lib/utils/errors'
  import { todayISO, formatDate, addDays } from '../lib/utils/dates'
  import { categories, categoriesMap } from '../lib/stores/categories'
  import type { OccurrenceWithDetails, DailyLog, AnswerRequest } from '../lib/types/api'

  // State
  let selectedDate = $state(todayISO())
  let occurrences = $state<OccurrenceWithDetails[]>([])
  let dailyLog = $state<DailyLog | null>(null)
  let inactiveDailyLog = $state<DailyLog | null>(null)
  let loading = $state(true)
  let error = $state('')
  let dailyLogText = $state('')
  let savingLog = $state(false)
  let reactivatingLog = $state(false)
  let categoryFilter = $state('')

  // Answer modal state
  let answerModalOpen = $state(false)
  let answerModalOccurrence = $state<OccurrenceWithDetails | null>(null)
  let answerModalValue = $state<string>('')
  let answerModalSaving = $state(false)
  let answerModalError = $state('')
  let expandedTasks = $state<Set<string>>(new Set())

  // Derived
  let filteredOccurrences = $derived(
    categoryFilter ? occurrences.filter((o) => o.task.category_id === categoryFilter) : occurrences
  )
  let total = $derived(filteredOccurrences.length)
  let answered = $derived(
    filteredOccurrences.filter((o) => o.answer !== undefined && !o.occurrence.is_suppressed).length
  )
  let suppressed = $derived(filteredOccurrences.filter((o) => o.occurrence.is_suppressed).length)
  let remaining = $derived(total - answered - suppressed)
  let progress = $derived(total === 0 ? 0 : Math.round(((answered + suppressed) / total) * 100))

  // Group occurrences by task
  let groupedOccurrences = $derived(() => {
    const groups = new Map<string, OccurrenceWithDetails[]>()
    for (const o of filteredOccurrences) {
      const key = o.task.id
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(o)
    }
    return Array.from(groups.entries()).map(([taskId, occs]) => ({
      taskId,
      taskName: occs[0].task.name,
      task: occs[0].task,
      occurrences: occs,
      answeredCount: occs.filter((o) => o.answer && !o.occurrence.is_suppressed).length,
      suppressedCount: occs.filter((o) => o.occurrence.is_suppressed).length,
      total: occs.length,
    }))
  })

  // Load data when date changes
  $effect(() => {
    loadData(selectedDate)
  })

  async function loadData(date: string) {
    loading = true
    error = ''
    inactiveDailyLog = null
    try {
      const [occData, logData] = await Promise.all([
        listOccurrences({ date }),
        listDailyLogs({ date }),
      ])
      occurrences = occData.filter((o) => o.task.is_active)
      dailyLog = logData.length > 0 ? logData[0] : null
      dailyLogText = dailyLog?.entry ?? ''

      // If no active log, check for inactive log for this date
      if (!dailyLog) {
        const inactiveLogs = await listInactiveDailyLogs()
        const matchingInactive = inactiveLogs.find((l) => l.log_date.substring(0, 10) === date)
        inactiveDailyLog = matchingInactive ?? null
      }
    } catch (err) {
      error = parseApiError(err).error
    } finally {
      loading = false
    }
  }

  function goToPrevious() {
    selectedDate = addDays(selectedDate, -1)
  }

  function goToNext() {
    selectedDate = addDays(selectedDate, 1)
  }

  function goToToday() {
    selectedDate = todayISO()
  }

  async function handleAnswer(occ: OccurrenceWithDetails, value: string | number | boolean) {
    const data: AnswerRequest = {}
    switch (occ.task.answer_type) {
      case 'string':
        data.answer_string = String(value)
        break
      case 'integer':
        data.answer_integer = Number(value)
        break
      case 'boolean':
        data.answer_boolean = value === true || value === 'true'
        break
      case 'select':
        data.answer_select = String(value)
        break
    }

    try {
      const answer = await submitAnswer(occ.occurrence.id, data)
      occurrences = occurrences.map((o) =>
        o.occurrence.id === occ.occurrence.id ? { ...o, answer } : o
      )
    } catch (err) {
      error = parseApiError(err).error
    }
  }

  async function handleSuppress(occ: OccurrenceWithDetails) {
    try {
      await suppressOccurrence(occ.occurrence.id)
      occurrences = occurrences.map((o) =>
        o.occurrence.id === occ.occurrence.id
          ? { ...o, occurrence: { ...o.occurrence, is_suppressed: true } }
          : o
      )
    } catch (err) {
      error = parseApiError(err).error
    }
  }

  async function handleUnsuppress(occ: OccurrenceWithDetails) {
    try {
      await unsuppressOccurrence(occ.occurrence.id)
      occurrences = occurrences.map((o) =>
        o.occurrence.id === occ.occurrence.id
          ? { ...o, occurrence: { ...o.occurrence, is_suppressed: false } }
          : o
      )
    } catch (err) {
      error = parseApiError(err).error
    }
  }

  async function handleResetAnswer(occ: OccurrenceWithDetails) {
    try {
      await bulkDeleteAnswers([occ.occurrence.id])
      occurrences = occurrences.map((o) =>
        o.occurrence.id === occ.occurrence.id ? { ...o, answer: undefined } : o
      )
    } catch (err) {
      error = parseApiError(err).error
    }
  }

  async function handleDailyLogSave() {
    if (!dailyLogText.trim()) return
    savingLog = true
    try {
      if (dailyLog) {
        dailyLog = await updateDailyLog(dailyLog.id, { entry: dailyLogText })
      } else {
        dailyLog = await createDailyLog({ log_date: selectedDate, entry: dailyLogText })
      }
    } catch (err) {
      error = parseApiError(err).error
    } finally {
      savingLog = false
    }
  }

  async function handleReactivateLog() {
    if (!inactiveDailyLog) return
    reactivatingLog = true
    try {
      dailyLog = await reactivateDailyLog(inactiveDailyLog.id)
      dailyLogText = dailyLog.entry
      inactiveDailyLog = null
    } catch (err) {
      error = parseApiError(err).error
    } finally {
      reactivatingLog = false
    }
  }

  function toggleExpand(taskId: string) {
    const next = new Set(expandedTasks)
    if (next.has(taskId)) {
      next.delete(taskId)
    } else {
      next.add(taskId)
    }
    expandedTasks = next
  }

  function openAnswerModal(occ: OccurrenceWithDetails) {
    answerModalOccurrence = occ
    answerModalValue = occ.answer
      ? (occ.answer.answer_string ??
        occ.answer.answer_integer?.toString() ??
        occ.answer.answer_boolean?.toString() ??
        occ.answer.answer_select ??
        '')
      : ''
    answerModalError = ''
    answerModalOpen = true
  }

  function closeAnswerModal() {
    answerModalOpen = false
    answerModalOccurrence = null
    answerModalValue = ''
    answerModalError = ''
  }

  async function submitAnswerModal() {
    if (!answerModalOccurrence) return
    answerModalSaving = true
    answerModalError = ''
    try {
      await handleAnswer(answerModalOccurrence, answerModalValue)
      closeAnswerModal()
    } catch (err) {
      const parsed = parseApiError(err).error
      if (parsed.toLowerCase().includes('cannot answer a suppressed occurrence')) {
        answerModalError = 'This occurrence is skipped. Unskip it before submitting an answer.'
      } else {
        answerModalError = parsed
      }
    } finally {
      answerModalSaving = false
    }
  }
</script>

<TopBar activePage="today" />

<main class="page-content">
  <header class="page-header">
    <div class="header-left">
      <h1>Today</h1>
      <DateNav
        date={formatDate(selectedDate)}
        isToday={selectedDate === todayISO()}
        onprevious={goToPrevious}
        onnext={goToNext}
        ontoday={goToToday}
      />
    </div>
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-label">Due today</div>
        <div class="stat-value">{total}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Answered</div>
        <div class="stat-value">{answered}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Skipped</div>
        <div class="stat-value">{suppressed}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Remaining</div>
        <div class="stat-value">{remaining}</div>
      </div>
    </div>
  </header>

  <div class="progress-wrapper">
    <ProgressBar value={progress} max={100} showLabel />
  </div>

  {#if error}
    <div class="error-banner">{error}</div>
  {/if}

  {#if loading}
    <div class="loading-state">Loading...</div>
  {:else}
    <section class="occurrences-section">
      <div class="section-header">
        <h2>Tasks</h2>
        <select class="category-filter" bind:value={categoryFilter}>
          <option value="">All categories</option>
          {#each $categories as cat (cat.id)}
            <option value={cat.id}>{cat.name}</option>
          {/each}
        </select>
      </div>
      {#if filteredOccurrences.length === 0}
        <p class="empty-state">No tasks scheduled for this day.</p>
      {:else}
        <table class="occurrences-table">
          <thead>
            <tr>
              <th style="width: 32px;"></th>
              <th>Task</th>
              <th>Category</th>
              <th>Progress</th>
              <th>Answer Type</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {#each groupedOccurrences() as group (group.taskId)}
              <tr class="group-row" onclick={() => group.total > 1 && toggleExpand(group.taskId)}>
                <td class="expand-cell">
                  {#if group.total > 1}
                    <button
                      class="expand-btn"
                      onclick={(e) => {
                        e.stopPropagation()
                        toggleExpand(group.taskId)
                      }}
                    >
                      {#if expandedTasks.has(group.taskId)}
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M4 6l4 4 4-4"
                            stroke="currentColor"
                            stroke-width="1.5"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                          />
                        </svg>
                      {:else}
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M6 4l4 4-4 4"
                            stroke="currentColor"
                            stroke-width="1.5"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                          />
                        </svg>
                      {/if}
                    </button>
                  {/if}
                </td>
                <td class="task-name-cell">
                  {group.taskName}
                  {#if group.total === 1 && group.occurrences[0].occurrence.scheduled_time}
                    <span class="task-time-inline">
                      {group.occurrences[0].occurrence.scheduled_time.substring(11, 16)}
                    </span>
                  {/if}
                </td>
                <td class="category-cell">
                  {#if $categoriesMap[group.task.category_id ?? '']}
                    <span
                      class="category-swatch"
                      style="background: {$categoriesMap[group.task.category_id ?? ''].colour}"
                    ></span>
                  {/if}
                  {$categoriesMap[group.task.category_id ?? '']?.name ?? '—'}
                </td>
                <td class="progress-cell">
                  {#if group.total === 1}
                    {#if group.occurrences[0].occurrence.is_suppressed}
                      <span class="status-badge skipped">Skipped</span>
                    {:else if group.occurrences[0].answer}
                      <span class="status-badge done">Done</span>
                    {:else}
                      <span class="status-badge pending">Pending</span>
                    {/if}
                  {:else}
                    <span class="progress-text"
                      >{group.answeredCount + group.suppressedCount}/{group.total}</span
                    >
                  {/if}
                </td>
                <td class="type-cell">
                  <span class="answer-type-badge">{group.task.answer_type.toUpperCase()}</span>
                </td>
                <td class="actions-cell">
                  {#if group.total === 1}
                    {#if group.occurrences[0].occurrence.is_suppressed}
                      <div class="action-buttons">
                        <button
                          class="btn-undo-enabled"
                          onclick={(e) => {
                            e.stopPropagation()
                            handleUnsuppress(group.occurrences[0])
                          }}>Undo skip</button
                        >
                      </div>
                    {:else if group.occurrences[0].answer}
                      <div class="action-buttons">
                        <button
                          class="btn-edit"
                          onclick={(e) => {
                            e.stopPropagation()
                            openAnswerModal(group.occurrences[0])
                          }}>Edit</button
                        >
                      </div>
                    {:else}
                      <div class="action-buttons">
                        <button
                          class="btn-answer"
                          onclick={(e) => {
                            e.stopPropagation()
                            openAnswerModal(group.occurrences[0])
                          }}>Answer</button
                        >
                        <button
                          class="btn-skip"
                          onclick={(e) => {
                            e.stopPropagation()
                            handleSuppress(group.occurrences[0])
                          }}>Skip</button
                        >
                      </div>
                    {/if}
                  {/if}
                </td>
              </tr>

              {#if expandedTasks.has(group.taskId)}
                {#each group.occurrences as occ (occ.occurrence.id)}
                  <tr class="child-row" class:suppressed={occ.occurrence.is_suppressed}>
                    <td></td>
                    <td class="child-time"
                      >{occ.occurrence.scheduled_time
                        ? occ.occurrence.scheduled_time.substring(11, 16)
                        : '—'}</td
                    >
                    <td></td>
                    <td>
                      {#if occ.occurrence.is_suppressed}
                        <span class="status-badge skipped">Skipped</span>
                      {:else if occ.answer}
                        <span class="status-badge done">Done</span>
                      {:else}
                        <span class="status-badge pending">Pending</span>
                      {/if}
                    </td>
                    <td></td>
                    <td class="actions-cell">
                      {#if occ.occurrence.is_suppressed}
                        <div class="action-buttons">
                          <button class="btn-undo-enabled" onclick={() => handleUnsuppress(occ)}
                            >Undo skip</button
                          >
                        </div>
                      {:else if occ.answer}
                        <div class="action-buttons">
                          <button class="btn-edit" onclick={() => openAnswerModal(occ)}>Edit</button
                          >
                        </div>
                      {:else}
                        <div class="action-buttons">
                          <button class="btn-answer" onclick={() => openAnswerModal(occ)}
                            >Answer</button
                          >
                          <button class="btn-skip" onclick={() => handleSuppress(occ)}>Skip</button>
                        </div>
                      {/if}
                    </td>
                  </tr>
                {/each}
              {/if}
            {/each}
          </tbody>
        </table>
      {/if}
    </section>

    <Modal
      open={answerModalOpen}
      title="Answer — {answerModalOccurrence?.task.name ?? ''}"
      onclose={closeAnswerModal}
    >
      {#if answerModalOccurrence}
        <div class="answer-modal-body">
          {#if answerModalOccurrence.occurrence.scheduled_time}
            <p class="answer-modal-time">
              Scheduled: {answerModalOccurrence.occurrence.scheduled_time.substring(11, 16)}
            </p>
          {/if}

          {#if answerModalOccurrence.task.answer_type === 'boolean'}
            <div class="boolean-choice">
              <label class="bool-option">
                <input type="radio" bind:group={answerModalValue} value="true" />
                <span class="bool-label" class:selected={answerModalValue === 'true'}>Yes</span>
              </label>
              <label class="bool-option">
                <input type="radio" bind:group={answerModalValue} value="false" />
                <span class="bool-label" class:selected={answerModalValue === 'false'}>No</span>
              </label>
            </div>
          {:else if answerModalOccurrence.task.answer_type === 'integer'}
            <input
              class="answer-modal-input"
              type="number"
              bind:value={answerModalValue}
              placeholder="Enter a number"
            />
          {:else if answerModalOccurrence.task.answer_type === 'string'}
            <textarea
              class="answer-modal-input answer-modal-textarea"
              bind:value={answerModalValue}
              placeholder="Enter your answer"
              rows="4"
            ></textarea>
          {:else if answerModalOccurrence.task.answer_type === 'select'}
            <select class="answer-modal-input" bind:value={answerModalValue}>
              <option value="">Select an option</option>
              {#each answerModalOccurrence.select_options ?? [] as opt (opt.id)}
                <option value={opt.id}>{opt.value}</option>
              {/each}
            </select>
          {/if}

          {#if answerModalError}
            <p class="answer-modal-error">{answerModalError}</p>
          {/if}

          <div class="answer-modal-actions">
            {#if answerModalOccurrence?.answer}
              <button
                class="btn-reset-answer"
                onclick={async () => {
                  await handleResetAnswer(answerModalOccurrence!)
                  closeAnswerModal()
                }}
              >
                Reset
              </button>
            {/if}
            <div class="answer-modal-actions-right">
              <button class="btn-cancel" onclick={closeAnswerModal}>Cancel</button>
              <button
                class="btn-save"
                onclick={submitAnswerModal}
                disabled={answerModalSaving || answerModalValue === ''}
              >
                {answerModalSaving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      {/if}
    </Modal>

    <section class="daily-log-section">
      <h2>Daily Log</h2>
      {#if inactiveDailyLog}
        <div class="deactivated-log-notice">
          <p class="deactivated-message">This log has been deactivated and cannot be edited.</p>
          <p class="deactivated-reason">
            The log was deactivated on {new Date(inactiveDailyLog.updated_at).toLocaleDateString(
              'en-AU',
              { day: 'numeric', month: 'short', year: 'numeric' }
            )}. You can reactivate it to continue editing.
          </p>
          <button class="btn-reactivate" onclick={handleReactivateLog} disabled={reactivatingLog}>
            {reactivatingLog ? 'Reactivating...' : 'Reactivate Log'}
          </button>
        </div>
      {:else}
        <textarea
          class="daily-log-input"
          placeholder="Write about your day..."
          bind:value={dailyLogText}
          rows="6"
        ></textarea>
        <div class="daily-log-actions">
          <button class="btn-save" onclick={handleDailyLogSave} disabled={savingLog}>
            {savingLog ? 'Saving...' : dailyLog ? 'Update Log' : 'Save Log'}
          </button>
          {#if dailyLog}
            <span class="last-saved"
              >Last saved: {new Date(dailyLog.updated_at).toLocaleTimeString()}</span
            >
          {/if}
        </div>
      {/if}
    </section>
  {/if}
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
    flex-wrap: wrap;
    gap: 1rem;
    margin-bottom: 2rem;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 1.5rem;
  }

  h1 {
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0;
  }

  h2 {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 1rem 0;
  }

  .stats-row {
    display: flex;
    gap: 8px;
    margin-bottom: 1rem;
  }

  .stat-card {
    background: var(--bg-secondary);
    border-radius: 6px;
    padding: 10px 16px;
    min-width: 90px;
  }

  .stat-label {
    font-size: 0.6875rem;
    color: var(--text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 4px;
  }

  .stat-value {
    font-size: 1.5rem;
    font-weight: 500;
    color: var(--text-primary);
    line-height: 1;
  }

  .progress-wrapper {
    margin-bottom: 1.5rem;
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

  .occurrences-section {
    margin-bottom: 2rem;
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .section-header h2 {
    margin: 0;
  }

  .category-filter {
    padding: 0.375rem 0.75rem;
    border: 1px solid var(--border-primary);
    border-radius: 6px;
    background: var(--bg-primary);
    color: var(--text-primary);
    font-size: inherit;
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

  .occurrences-table {
    width: 100%;
    border-collapse: collapse;
    background: var(--bg-primary);
    border: 1px solid var(--border-primary);
    border-radius: 8px;
    overflow: hidden;
  }

  .occurrences-table th,
  .occurrences-table td {
    padding: 0.75rem 1rem;
    text-align: left;
    border-bottom: 1px solid var(--border-primary);
  }

  .occurrences-table th {
    background: var(--bg-secondary);
    font-weight: 500;
    font-size: 0.875rem;
    color: var(--text-secondary);
  }

  .occurrences-table tbody tr:last-child td {
    border-bottom: none;
  }

  .group-row:hover td {
    background: var(--bg-secondary);
  }

  .expand-cell {
    width: 32px;
    text-align: center;
  }

  .expand-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border: 1px solid var(--border-secondary);
    border-radius: 4px;
    background: var(--bg-secondary);
    color: var(--text-secondary);
    cursor: pointer;
    transition:
      background-color 0.15s,
      border-color 0.15s;
    flex-shrink: 0;
  }

  .expand-btn:hover {
    background: var(--bg-tertiary);
    border-color: var(--accent);
    color: var(--accent);
  }

  .task-name-cell {
    font-weight: 500;
    color: var(--text-primary);
  }

  .task-time-inline {
    font-size: 0.75rem;
    color: var(--text-tertiary);
    font-weight: 400;
    margin-left: 0.5rem;
  }

  .child-row td {
    background: var(--bg-secondary);
    font-size: 0.875rem;
  }

  .child-row.suppressed td {
    opacity: 0.5;
  }

  .child-time {
    color: var(--text-tertiary);
    padding-left: 1.5rem;
  }

  .progress-text {
    font-size: 0.875rem;
    color: var(--text-secondary);
    font-weight: 500;
  }

  .answer-type-badge {
    font-size: 0.75rem;
    text-transform: uppercase;
    color: var(--text-tertiary);
  }

  .status-badge {
    display: inline-block;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 500;
  }

  .status-badge.done {
    background: #dcfce7;
    color: #166534;
  }

  .status-badge.pending {
    background: #fef3c7;
    color: #92400e;
  }

  .status-badge.skipped {
    background: var(--bg-tertiary);
    color: var(--text-tertiary);
  }

  .btn-answer,
  .btn-skip,
  .btn-edit,
  .btn-undo {
    width: 100%;
    padding: 0.25rem 0.625rem;
    border-radius: 4px;
    font-size: 0.8125rem;
    cursor: pointer;
    text-align: center;
  }

  .btn-answer {
    border: 1px solid var(--accent);
    background: transparent;
    color: var(--accent);
  }

  .btn-answer:hover {
    background: var(--bg-secondary);
  }

  .btn-skip {
    border: 1px solid var(--border-primary);
    background: var(--bg-primary);
    color: var(--text-secondary);
  }

  .btn-skip:hover {
    background: var(--bg-secondary);
  }

  .btn-edit {
    border: 1px solid var(--border-primary);
    background: var(--bg-primary);
    color: var(--text-secondary);
  }

  .btn-edit:hover {
    background: var(--bg-secondary);
  }

  .btn-undo {
    border: 1px solid var(--border-primary);
    background: var(--bg-primary);
    color: var(--text-tertiary);
    opacity: 0.6;
    cursor: not-allowed;
  }

  .btn-undo-enabled {
    width: 100%;
    padding: 0.25rem 0.625rem;
    border-radius: 4px;
    font-size: 0.8125rem;
    cursor: pointer;
    text-align: center;
    border: 1px solid var(--accent);
    background: transparent;
    color: var(--accent);
  }

  .btn-undo-enabled:hover {
    background: var(--bg-secondary);
  }

  .action-buttons {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .answer-modal-body {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    min-width: 280px;
  }

  .answer-modal-time {
    font-size: 0.875rem;
    color: var(--text-tertiary);
    margin: 0;
  }

  .boolean-choice {
    display: flex;
    gap: 0.75rem;
  }

  .bool-option {
    flex: 1;
    cursor: pointer;
  }

  .bool-option input[type='radio'] {
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
  }

  .bool-label {
    display: block;
    padding: 0.625rem;
    border: 1px solid var(--border-primary);
    border-radius: 6px;
    background: var(--bg-primary);
    color: var(--text-secondary);
    font-size: 0.9375rem;
    font-weight: 500;
    text-align: center;
    transition: all 0.15s;
  }

  .bool-label.selected {
    border-color: var(--accent);
    background: var(--bg-secondary);
    color: var(--accent);
  }

  .answer-modal-input {
    width: 100%;
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--border-primary);
    border-radius: 6px;
    background: var(--bg-primary);
    color: var(--text-primary);
    font-size: inherit;
  }

  .answer-modal-input:focus {
    outline: none;
    border-color: var(--accent);
  }

  .answer-modal-textarea {
    resize: vertical;
    min-height: 100px;
    font-family: inherit;
    line-height: 1.6;
  }

  .answer-modal-error {
    font-size: 0.875rem;
    color: var(--danger);
    margin: 0;
  }

  .answer-modal-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 0.75rem;
    border-top: 1px solid var(--border-primary);
  }

  .answer-modal-actions-right {
    display: flex;
    gap: 0.75rem;
  }

  .btn-reset-answer {
    padding: 0.5rem 1rem;
    border: 1px solid var(--danger-border);
    border-radius: 6px;
    background: var(--bg-primary);
    color: var(--danger);
    font-size: 0.875rem;
    cursor: pointer;
  }

  .btn-reset-answer:hover {
    background: var(--danger-light);
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

  .daily-log-section {
    background: var(--bg-primary);
    border: 1px solid var(--border-primary);
    border-radius: 8px;
    padding: 1.5rem;
  }

  .daily-log-input {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid var(--border-primary);
    border-radius: 6px;
    background: var(--bg-primary);
    color: var(--text-primary);
    font-family: inherit;
    font-size: inherit;
    resize: vertical;
    min-height: 120px;
  }

  .daily-log-input:focus {
    outline: none;
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-light);
  }

  .daily-log-actions {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-top: 1rem;
  }

  .btn-save {
    padding: 0.5rem 1rem;
    background: var(--accent);
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 500;
  }

  .btn-save:hover {
    background: var(--accent-dark);
  }

  .btn-save:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .last-saved {
    font-size: 0.75rem;
    color: var(--text-tertiary);
  }

  .deactivated-log-notice {
    background: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: 8px;
    padding: 1.5rem;
    text-align: center;
  }

  .deactivated-message {
    font-size: 1rem;
    font-weight: 500;
    color: var(--text-primary);
    margin: 0 0 0.5rem 0;
  }

  .deactivated-reason {
    font-size: 0.875rem;
    color: var(--text-secondary);
    margin: 0 0 1rem 0;
  }

  .btn-reactivate {
    padding: 0.5rem 1rem;
    background: var(--accent);
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 500;
    font-size: 0.875rem;
  }

  .btn-reactivate:hover {
    background: var(--accent-dark);
  }

  .btn-reactivate:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
</style>
