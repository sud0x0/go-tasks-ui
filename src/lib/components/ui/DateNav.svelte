<script lang="ts">
  interface Props {
    date: string
    isToday?: boolean
    onprevious?: () => void
    onnext?: () => void
    ontoday?: () => void
  }

  let { date, isToday = false, onprevious, onnext, ontoday }: Props = $props()
</script>

<div class="date-nav">
  <button class="date-nav-btn" onclick={onprevious} aria-label="Previous day">←</button>
  <button class="date-nav-current">{date}</button>
  <button class="date-nav-btn" onclick={onnext} aria-label="Next day">→</button>
  {#if !isToday}
    <button class="date-nav-today" onclick={ontoday}>Go To Today</button>
  {/if}
</div>

<style>
  .date-nav {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .date-nav-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: 1px solid var(--border-primary);
    background: var(--bg-primary);
    border-radius: 6px;
    cursor: pointer;
    color: var(--text-secondary);
  }

  .date-nav-btn:hover {
    background: var(--bg-secondary);
  }

  .date-nav-current {
    padding: 0.5rem 1rem;
    border: 1px solid var(--border-primary);
    background: var(--bg-primary);
    border-radius: 6px;
    cursor: pointer;
    font-weight: 500;
    color: var(--text-primary);
  }

  .date-nav-current:hover {
    background: var(--bg-secondary);
  }

  .date-nav-today {
    padding: 0.375rem 0.75rem;
    border: 1px solid var(--accent);
    background: transparent;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.8125rem;
    font-weight: 500;
    color: var(--accent);
    transition: background-color 0.15s;
  }

  .date-nav-today:hover {
    background: var(--accent-light);
  }
</style>
