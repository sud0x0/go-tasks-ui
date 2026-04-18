<script lang="ts">
  interface Props {
    variant?: 'default' | 'success' | 'warning' | 'error'
    children: import('svelte').Snippet
  }

  let { variant = 'default', children }: Props = $props()
</script>

<span class="badge badge-{variant}">
  {@render children()}
</span>

<style>
  .badge {
    display: inline-flex;
    align-items: center;
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
    font-weight: 500;
    border-radius: 9999px;
  }

  .badge-default {
    background: var(--bg-tertiary);
    color: var(--text-secondary);
  }

  .badge-success {
    background: #dcfce7;
    color: #166534;
  }

  .badge-warning {
    background: #fef9c3;
    color: #854d0e;
  }

  .badge-error {
    background: #fee2e2;
    color: #991b1b;
  }
</style>
