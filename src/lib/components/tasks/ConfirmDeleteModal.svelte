<script lang="ts">
  import Modal from '../ui/Modal.svelte'

  interface Props {
    open: boolean
    taskName: string
    isPermanent: boolean
    onclose: () => void
    onconfirm: () => void | Promise<void>
  }

  let { open, taskName, isPermanent, onclose, onconfirm }: Props = $props()

  let input = $state('')
  let errorMsg = $state('')

  $effect(() => {
    if (open) {
      input = ''
      errorMsg = ''
    }
  })

  async function handleConfirm() {
    if (input !== taskName) {
      errorMsg = 'Task name does not match.'
      return
    }
    await onconfirm()
  }
</script>

<Modal {open} title={isPermanent ? 'Permanently delete task' : 'Deactivate task'} {onclose}>
  <div class="confirm-body">
    <p class="confirm-message">
      {#if isPermanent}
        This will permanently delete <strong>{taskName}</strong> and cannot be recovered.
      {:else}
        This will deactivate <strong>{taskName}</strong>. It will no longer appear in Today.
      {/if}
    </p>
    <p class="confirm-instruction">Type the task name to confirm:</p>
    <p class="confirm-task-name">{taskName}</p>
    <input
      class="confirm-input"
      type="text"
      bind:value={input}
      placeholder="Type task name here"
      onkeydown={(e) => {
        if (e.key === 'Enter') handleConfirm()
      }}
    />
    {#if errorMsg}
      <p class="confirm-error">{errorMsg}</p>
    {/if}
    <div class="confirm-actions">
      <button class="btn-cancel" onclick={onclose}>Cancel</button>
      <button class="btn-deactivate-confirm" onclick={handleConfirm} disabled={input !== taskName}>
        {isPermanent ? 'Delete permanently' : 'Deactivate'}
      </button>
    </div>
  </div>
</Modal>

<style>
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
</style>
