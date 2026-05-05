<script lang="ts">
  interface Props {
    open: boolean
    title?: string
    onclose?: () => void
    children: import('svelte').Snippet
  }

  let { open, title, onclose, children }: Props = $props()

  let dialog = $state<HTMLDialogElement>()

  // Drive the native dialog from the `open` prop. Native <dialog> has its own
  // open/closed state, and showModal() will throw if called on an already-open
  // dialog (or vice versa for close()), so guard with `dialog.open`.
  $effect(() => {
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    else if (!open && dialog.open) dialog.close()
  })

  // Fires for both Escape and explicit dialog.close() — bubble up so the
  // parent can clear its `open` flag and stay in sync.
  function handleClose() {
    onclose?.()
  }

  // Click on the backdrop (i.e. the dialog element itself outside .modal)
  // closes the modal. Click on .modal stops here.
  function handleBackdropClick(event: MouseEvent) {
    if (event.target === dialog) onclose?.()
  }
</script>

<dialog
  bind:this={dialog}
  class="modal"
  aria-labelledby={title ? 'modal-title' : undefined}
  onclose={handleClose}
  onclick={handleBackdropClick}
>
  {#if title}
    <header class="modal-header">
      <h2 id="modal-title">{title}</h2>
      {#if onclose}
        <button type="button" class="modal-close" onclick={onclose} aria-label="Close modal"
          >×</button
        >
      {/if}
    </header>
  {/if}
  <div class="modal-content">
    {@render children()}
  </div>
</dialog>

<style>
  .modal {
    background: var(--bg-primary);
    color: var(--text-primary);
    border: none;
    border-radius: 8px;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
    max-width: 90vw;
    max-height: 90vh;
    overflow: auto;
    min-width: 320px;
    padding: 0;
  }

  .modal::backdrop {
    background: rgba(0, 0, 0, 0.5);
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
