<script lang="ts">
  interface Props {
    open: boolean
    title?: string
    onclose?: () => void
    children: import('svelte').Snippet
  }

  let { open, title, onclose, children }: Props = $props()
</script>

{#if open}
  <div class="modal-backdrop" role="presentation">
    <div
      class="modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
      onclick={(e) => e.stopPropagation()}
    >
      {#if title}
        <header class="modal-header">
          <h2 id="modal-title">{title}</h2>
          {#if onclose}
            <button class="modal-close" onclick={onclose} aria-label="Close modal">×</button>
          {/if}
        </header>
      {/if}
      <div class="modal-content">
        {@render children()}
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .modal {
    background: var(--bg-primary);
    border-radius: 8px;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
    max-width: 90vw;
    max-height: 90vh;
    overflow: auto;
    min-width: 320px;
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.5rem;
    border-bottom: 1px solid var(--border-primary);
  }

  .modal-header h2 {
    font-size: 1.125rem;
    font-weight: 600;
    margin: 0;
  }

  .modal-close {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: var(--text-secondary);
    line-height: 1;
  }

  .modal-content {
    padding: 1.5rem;
  }
</style>
