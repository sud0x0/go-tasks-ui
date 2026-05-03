<script lang="ts" module>
  import type { RecurrenceType, EndType } from '../../types/api'

  export interface ScheduleFormState {
    recurrenceType: RecurrenceType
    startDate: string
    scheduledTimes: string[]
    interval: number
    daysOfWeek: number[]
    monthDay: number
    monthWeek: number
    monthWeekday: number
    monthOfYear: number
    endType: EndType
    endDate: string
    endAfterN: number
  }
</script>

<script lang="ts">
  interface Props {
    schedule: ScheduleFormState
    scheduledTimeErrors: string[]
  }

  let { schedule = $bindable(), scheduledTimeErrors }: Props = $props()

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

  function addScheduledTime() {
    schedule.scheduledTimes = [...schedule.scheduledTimes, '']
  }

  function removeScheduledTime(index: number) {
    schedule.scheduledTimes = schedule.scheduledTimes.filter((_, i) => i !== index)
  }

  function updateScheduledTime(index: number, value: string) {
    const updated = [...schedule.scheduledTimes]
    updated[index] = value
    schedule.scheduledTimes = updated
  }

  function toggleDayOfWeek(day: number) {
    if (schedule.daysOfWeek.includes(day)) {
      schedule.daysOfWeek = schedule.daysOfWeek.filter((d) => d !== day)
    } else {
      schedule.daysOfWeek = [...schedule.daysOfWeek, day]
    }
  }
</script>

<div class="form-group">
  <label for="task-recurrence">Recurrence type</label>
  <select id="task-recurrence" bind:value={schedule.recurrenceType}>
    {#each recurrenceTypes as rt (rt.value)}
      <option value={rt.value}>{rt.label}</option>
    {/each}
  </select>
</div>

<div class="form-group">
  <label for="task-start-date">Start date</label>
  <input type="date" id="task-start-date" bind:value={schedule.startDate} required />
</div>

<div class="form-group">
  <label class="form-label" for="scheduled-times-group"
    >Scheduled times <span class="optional">optional</span></label
  >
  <div id="scheduled-times-group">
    {#each schedule.scheduledTimes as time, i (i)}
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
        {#if schedule.scheduledTimes.length > 1}
          <button type="button" class="btn-remove-time" onclick={() => removeScheduledTime(i)}
            >✕</button
          >
        {/if}
      </div>
    {/each}
    <button type="button" class="btn-add-time" onclick={addScheduledTime}>+ Add time</button>
  </div>
</div>

{#if schedule.recurrenceType === 'every_n_days' || schedule.recurrenceType === 'every_n_weeks'}
  <div class="form-group">
    <label for="task-interval">Interval</label>
    <input type="number" id="task-interval" bind:value={schedule.interval} min="1" max="365" />
  </div>
{/if}

{#if schedule.recurrenceType === 'weekly'}
  <div class="form-group">
    <span class="form-label">Days of week</span>
    <div class="days-of-week">
      {#each dayNames as day, i (i)}
        <button
          type="button"
          class="day-btn"
          class:selected={schedule.daysOfWeek.includes(i)}
          onclick={() => toggleDayOfWeek(i)}
        >
          {day}
        </button>
      {/each}
    </div>
  </div>
{/if}

{#if schedule.recurrenceType === 'monthly_date'}
  <div class="form-group">
    <label for="task-month-day">Day of month</label>
    <input type="number" id="task-month-day" bind:value={schedule.monthDay} min="1" max="31" />
  </div>
{/if}

{#if schedule.recurrenceType === 'monthly_weekday'}
  <div class="form-row">
    <div class="form-group">
      <label for="task-month-week">Week of month</label>
      <input type="number" id="task-month-week" bind:value={schedule.monthWeek} min="1" max="5" />
    </div>
    <div class="form-group">
      <label for="task-month-weekday">Day of week</label>
      <select id="task-month-weekday" bind:value={schedule.monthWeekday}>
        {#each dayNames as day, i (i)}
          <option value={i}>{day}</option>
        {/each}
      </select>
    </div>
  </div>
{/if}

{#if schedule.recurrenceType === 'yearly'}
  <div class="form-row">
    <div class="form-group">
      <label for="task-month-of-year">Month</label>
      <input
        type="number"
        id="task-month-of-year"
        bind:value={schedule.monthOfYear}
        min="1"
        max="12"
      />
    </div>
    <div class="form-group">
      <label for="task-yearly-day">Day</label>
      <input type="number" id="task-yearly-day" bind:value={schedule.monthDay} min="1" max="31" />
    </div>
  </div>
{/if}

<div class="form-group">
  <label for="task-end-type">End type</label>
  <select id="task-end-type" bind:value={schedule.endType}>
    <option value="never">Never</option>
    <option value="on_date">On date</option>
    <option value="after_n">After N occurrences</option>
  </select>
</div>

{#if schedule.endType === 'on_date'}
  <div class="form-group">
    <label for="task-end-date">End date</label>
    <input type="date" id="task-end-date" bind:value={schedule.endDate} />
  </div>
{/if}

{#if schedule.endType === 'after_n'}
  <div class="form-group">
    <label for="task-end-after">End after N occurrences</label>
    <input type="number" id="task-end-after" bind:value={schedule.endAfterN} min="1" />
  </div>
{/if}

<style>
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

  .form-group label,
  .form-label {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-primary);
  }

  .form-group input,
  .form-group select {
    padding: 0.625rem 0.75rem;
    border: 1px solid var(--border-primary);
    border-radius: 6px;
    background: var(--bg-primary);
    color: var(--text-primary);
    font-size: inherit;
  }

  .form-group input:focus,
  .form-group select:focus {
    outline: none;
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-light);
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
</style>
