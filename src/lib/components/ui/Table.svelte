<script lang="ts">
  interface Props {
    children: import('svelte').Snippet
  }

  let { children }: Props = $props()
</script>

<div class="table-wrapper">
  <table class="table">
    {@render children()}
  </table>
</div>

<style>
  .table-wrapper {
    overflow-x: auto;
  }

  .table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
  }

  .table :global(th),
  .table :global(td) {
    padding: 0.75rem 1rem;
    text-align: left;
    border-bottom: 1px solid var(--border-primary);
  }

  .table :global(th) {
    font-weight: 600;
    color: var(--text-secondary);
    background: var(--bg-secondary);
  }

  .table :global(tbody tr:hover) {
    background: var(--bg-secondary);
  }
</style>
