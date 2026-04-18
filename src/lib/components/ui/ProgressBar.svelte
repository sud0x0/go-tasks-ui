<script lang="ts">
  interface Props {
    value: number
    max?: number
    showLabel?: boolean
  }

  let { value, max = 100, showLabel = false }: Props = $props()

  let percentage = $derived(Math.min(100, Math.max(0, (value / max) * 100)))
</script>

<div class="progress-container">
  <div
    class="progress-bar"
    role="progressbar"
    aria-valuenow={value}
    aria-valuemin={0}
    aria-valuemax={max}
  >
    <div class="progress-fill" style="width: {percentage}%"></div>
  </div>
  {#if showLabel}
    <span class="progress-label">{Math.round(percentage)}%</span>
  {/if}
</div>

<style>
  .progress-container {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .progress-bar {
    flex: 1;
    height: 8px;
    background: var(--bg-tertiary);
    border-radius: 4px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: var(--accent);
    border-radius: 4px;
    transition: width 0.3s ease;
  }

  .progress-label {
    font-size: 0.75rem;
    color: var(--text-secondary);
    min-width: 3ch;
  }
</style>
