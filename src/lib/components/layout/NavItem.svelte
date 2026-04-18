<script lang="ts">
  interface Props {
    href: string
    active?: boolean
    disabled?: boolean
    children: import('svelte').Snippet
  }

  let { href, active = false, disabled = false, children }: Props = $props()
</script>

<a
  {href}
  class="nav-item"
  class:active
  class:disabled
  aria-current={active ? 'page' : undefined}
  aria-disabled={disabled}
>
  {@render children()}
</a>

<style>
  .nav-item {
    padding: 0.5rem 1rem;
    text-decoration: none;
    color: var(--text-secondary);
    border-radius: 4px;
    transition:
      background-color 0.15s,
      color 0.15s;
  }

  .nav-item:hover:not(.disabled) {
    background: var(--bg-tertiary);
  }

  .nav-item.active {
    color: var(--accent);
    font-weight: 500;
  }

  .nav-item.disabled {
    opacity: 0.5;
    cursor: not-allowed;
    pointer-events: none;
  }
</style>
