<script lang="ts">
  interface Props {
    name: string
    size?: 'sm' | 'md' | 'lg'
    src?: string
  }

  let { name, size = 'md', src }: Props = $props()

  let initials = $derived(
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  )

  const sizeMap = {
    sm: 24,
    md: 32,
    lg: 40,
  }
</script>

<div
  class="avatar avatar-{size}"
  style="width: {sizeMap[size]}px; height: {sizeMap[size]}px"
  role="img"
  aria-label={name}
>
  {#if src}
    <img {src} alt={name} />
  {:else}
    <span class="avatar-initials">{initials}</span>
  {/if}
</div>

<style>
  .avatar {
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: var(--accent);
    color: white;
    font-weight: 600;
    overflow: hidden;
    flex-shrink: 0;
  }

  .avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .avatar-sm .avatar-initials {
    font-size: 0.625rem;
  }

  .avatar-md .avatar-initials {
    font-size: 0.75rem;
  }

  .avatar-lg .avatar-initials {
    font-size: 0.875rem;
  }
</style>
