<script lang="ts">
  import Modal from '../ui/Modal.svelte'
  import { getTask } from '../../api/tasks'
  import { categoriesMap } from '../../stores/categories'
  import { parseApiError } from '../../utils/errors'
  import type { TaskWithDetails } from '../../types/api'

  interface Props {
    open: boolean
    taskId: string | null
    onclose: () => void
  }

  let { open, taskId, onclose }: Props = $props()

  let loading = $state(false)
  let errorMsg = $state('')
  let task = $state<TaskWithDetails | null>(null)

  $effect(() => {
    if (open && taskId) {
      load(taskId)
    } else if (!open) {
      task = null
      errorMsg = ''
    }
  })

  async function load(id: string) {
    loading = true
    errorMsg = ''
    task = null
    try {
      task = await getTask(id)
    } catch (err) {
      errorMsg = parseApiError(err).error
    } finally {
      loading = false
    }
  }

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
</script>

<Modal {open} title="Task details" {onclose}>
  {#if loading}
    <p class="loading-text">Loading...</p>
  {:else if errorMsg}
    <p class="error-text">{errorMsg}</p>
  {:else if task}
    <div class="detail-grid">
      <div class="detail-row">
        <span class="detail-label">Name</span>
        <span class="detail-value">{task.task.name}</span>
      </div>
      {#if task.task.description}
        <div class="detail-row">
          <span class="detail-label">Description</span>
          <span class="detail-value">{task.task.description}</span>
        </div>
      {/if}
      <div class="detail-row">
        <span class="detail-label">Category</span>
        <span class="detail-value">{$categoriesMap[task.task.category_id ?? '']?.name ?? '—'}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Answer type</span>
        <span class="detail-value">{task.task.answer_type}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Status</span>
        <span class="detail-value">{task.task.is_active ? 'Active' : 'Inactive'}</span>
      </div>
      {#if task.schedule}
        <hr class="detail-divider" />
        <div class="detail-row">
          <span class="detail-label">Recurrence</span>
          <span class="detail-value">{task.schedule.recurrence_type}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Start date</span>
          <span class="detail-value">{task.schedule.start_date.split('T')[0]}</span>
        </div>
        {#if task.schedule.scheduled_times?.length}
          <div class="detail-row">
            <span class="detail-label">Scheduled times</span>
            <span class="detail-value"
              >{task.schedule.scheduled_times.map((t) => t.substring(0, 5)).join(', ')}</span
            >
          </div>
        {/if}
        {#if task.schedule.end_type !== 'never'}
          <div class="detail-row">
            <span class="detail-label">End</span>
            <span class="detail-value">
              {task.schedule.end_type === 'on_date'
                ? `On ${task.schedule.end_date}`
                : `After ${task.schedule.end_after_n} occurrences`}
            </span>
          </div>
        {/if}
        {#if task.schedule.days_of_week?.length}
          <div class="detail-row">
            <span class="detail-label">Days of week</span>
            <span class="detail-value"
              >{task.schedule.days_of_week.map((d) => dayNames[d]).join(', ')}</span
            >
          </div>
        {/if}
        {#if task.schedule.recurrence_interval}
          <div class="detail-row">
            <span class="detail-label">Interval</span>
            <span class="detail-value">Every {task.schedule.recurrence_interval}</span>
          </div>
        {/if}
      {/if}
      {#if task.select_options?.length}
        <hr class="detail-divider" />
        <div class="detail-row">
          <span class="detail-label">Options</span>
          <span class="detail-value">{task.select_options.map((o) => o.value).join(', ')}</span>
        </div>
      {/if}
    </div>
  {/if}
</Modal>

<style>
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
</style>
