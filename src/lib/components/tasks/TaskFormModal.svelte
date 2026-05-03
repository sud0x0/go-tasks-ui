<script lang="ts">
  import Modal from '../ui/Modal.svelte'
  import RecurrenceFields, { type ScheduleFormState } from './RecurrenceFields.svelte'
  import { categories } from '../../stores/categories'
  import { createTask, updateTask } from '../../api/tasks'
  import { parseApiError } from '../../utils/errors'
  import { todayISO } from '../../utils/dates'
  import type { Task, TaskWithDetails, AnswerType, CreateTaskRequest } from '../../types/api'

  export type FormResult =
    | { type: 'create'; task: TaskWithDetails }
    | { type: 'update'; task: Task }

  interface Props {
    open: boolean
    editingTask?: Task | null
    onclose: () => void
    onsuccess: (result: FormResult) => void
  }

  let { open, editingTask = null, onclose, onsuccess }: Props = $props()

  function makeDefaultSchedule(): ScheduleFormState {
    return {
      recurrenceType: 'daily',
      startDate: todayISO(),
      scheduledTimes: [''],
      interval: 1,
      daysOfWeek: [],
      monthDay: 1,
      monthWeek: 1,
      monthWeekday: 0,
      monthOfYear: 1,
      endType: 'never',
      endDate: '',
      endAfterN: 1,
    }
  }

  let step = $state<1 | 2>(1)
  let saving = $state(false)
  let errorMsg = $state('')

  let name = $state('')
  let description = $state('')
  let categoryId = $state('')
  let answerType = $state<AnswerType>('boolean')
  let selectOptions = $state<string[]>(['', ''])

  let schedule = $state<ScheduleFormState>(makeDefaultSchedule())

  // Re-initialize fields whenever the modal transitions to open. The effect
  // also picks up changes to editingTask while open is true (e.g. switching
  // from one Edit click to another), which is fine — parent always closes
  // between such transitions in practice.
  $effect(() => {
    if (!open) return
    step = 1
    errorMsg = ''
    if (editingTask) {
      name = editingTask.name
      description = editingTask.description ?? ''
    } else {
      name = ''
      description = ''
      categoryId = ''
      answerType = 'boolean'
      selectOptions = ['', '']
      schedule = makeDefaultSchedule()
    }
  })

  let scheduledTimeErrors = $derived(
    schedule.scheduledTimes.map((time, i) => {
      if (!time) return ''
      const isDuplicate = schedule.scheduledTimes.findIndex((t, j) => t === time && j !== i) !== -1
      return isDuplicate ? 'Duplicate time' : ''
    })
  )
  let hasScheduledTimeErrors = $derived(scheduledTimeErrors.some((e) => e !== ''))

  function goToStep2() {
    if (!name.trim()) {
      errorMsg = 'Name is required'
      return
    }
    if (!categoryId) {
      errorMsg = 'Category is required'
      return
    }
    errorMsg = ''
    step = 2
  }

  function goToStep1() {
    step = 1
  }

  function addSelectOption() {
    if (selectOptions.length < 10) selectOptions = [...selectOptions, '']
  }

  function removeSelectOption(index: number) {
    if (selectOptions.length > 2) selectOptions = selectOptions.filter((_, i) => i !== index)
  }

  function updateSelectOption(index: number, value: string) {
    selectOptions = selectOptions.map((o, i) => (i === index ? value : o))
  }

  async function handleSave(e: Event) {
    e.preventDefault()
    saving = true
    errorMsg = ''

    if (!editingTask && hasScheduledTimeErrors) {
      errorMsg = 'Please fix duplicate scheduled times before saving.'
      saving = false
      return
    }

    try {
      if (editingTask) {
        const result = await updateTask(editingTask.id, {
          name,
          description: description || undefined,
        })
        onsuccess({ type: 'update', task: result })
      } else {
        const filledTimes = schedule.scheduledTimes.filter((t) => t.trim() !== '')
        const opts = selectOptions.filter((o) => o.trim() !== '')
        const isMonthly = schedule.recurrenceType === 'monthly_weekday'
        const isYearly = schedule.recurrenceType === 'yearly'
        const data: CreateTaskRequest = {
          category_id: categoryId,
          name,
          description: description || undefined,
          answer_type: answerType,
          schedule: {
            recurrence_type: schedule.recurrenceType,
            start_date: schedule.startDate,
            end_type: schedule.endType,
            recurrence_interval:
              schedule.recurrenceType === 'every_n_days' ||
              schedule.recurrenceType === 'every_n_weeks'
                ? schedule.interval
                : undefined,
            days_of_week: schedule.recurrenceType === 'weekly' ? schedule.daysOfWeek : undefined,
            month_day:
              schedule.recurrenceType === 'monthly_date' || isYearly
                ? schedule.monthDay
                : undefined,
            month_week: isMonthly ? schedule.monthWeek : undefined,
            month_weekday: isMonthly ? schedule.monthWeekday : undefined,
            month_of_year: isYearly ? schedule.monthOfYear : undefined,
            scheduled_times: filledTimes.length > 0 ? filledTimes : undefined,
            end_date: schedule.endType === 'on_date' ? schedule.endDate : undefined,
            end_after_n: schedule.endType === 'after_n' ? schedule.endAfterN : undefined,
          },
          select_options:
            answerType === 'select' && opts.length > 0
              ? opts.map((v) => ({ value: v }))
              : undefined,
        }
        const result = await createTask(data)
        onsuccess({ type: 'create', task: result })
      }
    } catch (err) {
      errorMsg = parseApiError(err).error
    } finally {
      saving = false
    }
  }
</script>

<Modal
  {open}
  title={editingTask ? 'Edit task' : step === 1 ? 'New task — details' : 'New task — schedule'}
  {onclose}
>
  <form class="modal-form" onsubmit={handleSave}>
    {#if !editingTask}
      <p class="step-indicator">Step {step} of 2</p>
    {/if}

    {#if step === 1}
      <div class="form-group">
        <label for="task-name">Name</label>
        <input
          type="text"
          id="task-name"
          bind:value={name}
          required
          maxlength="200"
          placeholder="Task name"
        />
      </div>
      <div class="form-group">
        <label for="task-description">Description</label>
        <textarea
          id="task-description"
          bind:value={description}
          maxlength="1000"
          placeholder="Optional description"
          rows="3"
        ></textarea>
      </div>
      {#if !editingTask}
        <div class="form-group">
          <label for="task-category">Category</label>
          <select id="task-category" bind:value={categoryId} required>
            <option value="">Select a category</option>
            {#each $categories as cat (cat.id)}
              <option value={cat.id}>{cat.name}</option>
            {/each}
          </select>
        </div>
        <div class="form-group">
          <label for="task-answer-type">Answer type</label>
          <select id="task-answer-type" bind:value={answerType}>
            <option value="boolean">Boolean (Yes/No)</option>
            <option value="integer">Integer</option>
            <option value="string">String</option>
            <option value="select">Select (multiple choice)</option>
          </select>
        </div>
        {#if answerType === 'select'}
          <div class="form-group">
            <span class="form-label">Options (min 2, max 10)</span>
            <div class="select-options">
              {#each selectOptions as opt, i (i)}
                <div class="select-option-row">
                  <input
                    type="text"
                    value={opt}
                    oninput={(e) => updateSelectOption(i, e.currentTarget.value)}
                    placeholder={`Option ${i + 1}`}
                  />
                  {#if selectOptions.length > 2}
                    <button type="button" class="btn-icon" onclick={() => removeSelectOption(i)}
                      >×</button
                    >
                  {/if}
                </div>
              {/each}
              {#if selectOptions.length < 10}
                <button type="button" class="btn-link" onclick={addSelectOption}
                  >+ Add option</button
                >
              {/if}
            </div>
          </div>
        {/if}
      {/if}
    {:else}
      <RecurrenceFields bind:schedule {scheduledTimeErrors} />
    {/if}

    {#if errorMsg}
      <div class="modal-error">{errorMsg}</div>
    {/if}

    <div class="modal-actions">
      {#if editingTask}
        <button type="button" class="btn-secondary" onclick={onclose}>Cancel</button>
        <button type="submit" class="btn-primary" disabled={saving}>
          {saving ? 'Saving...' : 'Save'}
        </button>
      {:else if step === 1}
        <button type="button" class="btn-secondary" onclick={onclose}>Cancel</button>
        <button type="button" class="btn-primary" onclick={goToStep2}>Next: Schedule →</button>
      {:else}
        <button type="button" class="btn-secondary" onclick={goToStep1}>← Back</button>
        <button type="submit" class="btn-primary" disabled={saving}>
          {saving ? 'Saving...' : 'Save'}
        </button>
      {/if}
    </div>
  </form>
</Modal>

<style>
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

  .form-group label,
  .form-label {
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

  .select-options {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .select-option-row {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .select-option-row input {
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
</style>
