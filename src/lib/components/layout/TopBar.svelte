<script lang="ts">
  import { navigate, type Route } from '../../stores/router'
  import { currentUser, clearAuth } from '../../stores/auth'
  import { logout } from '../../api/auth'
  import { theme, accentColour, fontSize, type AccentColour } from '../../stores/preferences'
  import Avatar from '../ui/Avatar.svelte'

  interface Props {
    activePage: string
  }

  let { activePage }: Props = $props()

  let showProfilePanel = $state(false)

  const navItems: { label: string; route: Route }[] = [
    { label: 'Today', route: 'today' },
    { label: 'Tasks', route: 'tasks' },
    { label: 'Categories', route: 'categories' },
    { label: 'Logs', route: 'logs' },
    { label: 'Answers', route: 'answers' },
    { label: 'Charts', route: 'charts' },
  ]

  const accentOptions: AccentColour[] = ['blue', 'green', 'red', 'orange', 'pink', 'purple']

  let userName = $derived($currentUser?.username ?? 'User')

  function handleNavClick(route: Route) {
    navigate(route)
  }

  function toggleProfilePanel() {
    showProfilePanel = !showProfilePanel
  }

  function selectAccent(colour: AccentColour) {
    accentColour.set(colour)
  }

  async function handleLogout() {
    try {
      await logout()
    } catch {
      // Best-effort. Even if server call fails, we still clear local state.
    }
    clearAuth()
    navigate('login')
    showProfilePanel = false
  }

  function handleClickOutside(event: MouseEvent) {
    const target = event.target as HTMLElement
    if (!target.closest('.profile-container')) {
      showProfilePanel = false
    }
  }
</script>

<svelte:window onclick={handleClickOutside} />

<header class="topbar">
  <div class="topbar-logo">
    <span class="logo-mark">T</span>
    <span class="logo-text">Go Tasks</span>
  </div>

  <nav class="topbar-nav">
    {#each navItems as item}
      <button
        class="nav-item"
        class:active={activePage === item.route}
        onclick={() => handleNavClick(item.route)}
      >
        {item.label}
      </button>
    {/each}
  </nav>

  <div class="profile-container">
    <button class="avatar-btn" onclick={toggleProfilePanel} aria-label="Open profile menu">
      <Avatar name={userName} size="md" />
    </button>

    {#if showProfilePanel}
      <div class="profile-panel" onclick={(e) => e.stopPropagation()}>
        <div class="profile-header">
          <Avatar name={userName} size="lg" />
          <span class="profile-name">{userName}</span>
        </div>

        <div class="profile-section">
          <span class="section-label">Theme</span>
          <button class="theme-toggle">
            <span
              class="theme-option"
              class:active={$theme === 'light'}
              onclick={() => theme.set('light')}>Light</span
            >
            <span
              class="theme-option"
              class:active={$theme === 'dark'}
              onclick={() => theme.set('dark')}>Dark</span
            >
            <span
              class="theme-option"
              class:active={$theme === 'sepia'}
              onclick={() => theme.set('sepia')}>Sepia</span
            >
          </button>
        </div>

        <div class="profile-section">
          <span class="section-label">Accent Colour</span>
          <div class="accent-picker">
            {#each accentOptions as colour}
              <button
                class="accent-swatch accent-{colour}"
                class:selected={$accentColour === colour}
                onclick={() => selectAccent(colour)}
                aria-label="Select {colour} accent colour"
              ></button>
            {/each}
          </div>
        </div>

        <div class="profile-section">
          <span class="section-label">Font size</span>
          <div class="font-size-picker">
            <button
              class="font-size-btn"
              class:active={$fontSize === 'medium'}
              onclick={() => fontSize.set('medium')}>A</button
            >
            <button
              class="font-size-btn"
              class:active={$fontSize === 'large'}
              onclick={() => fontSize.set('large')}>A</button
            >
            <button
              class="font-size-btn"
              class:active={$fontSize === 'xlarge'}
              onclick={() => fontSize.set('xlarge')}>A</button
            >
          </div>
        </div>

        <button class="logout-btn" onclick={handleLogout}> Sign out </button>
      </div>
    {/if}
  </div>
</header>

<style>
  .topbar {
    position: sticky;
    top: 0;
    z-index: 50;
    display: flex;
    align-items: center;
    padding: 0 1.5rem;
    height: 56px;
    background: var(--bg-secondary);
    border-bottom: 1px solid var(--border-primary);
  }

  .topbar-logo {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .logo-mark {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    background: var(--accent);
    color: white;
    font-weight: 700;
    border-radius: 4px;
  }

  .logo-text {
    font-weight: 600;
    color: var(--text-primary);
  }

  .topbar-nav {
    display: flex;
    gap: 0.25rem;
    margin-left: 2rem;
  }

  .nav-item {
    padding: 0.5rem 1rem;
    background: none;
    border: none;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-secondary);
    cursor: pointer;
    transition:
      background-color 0.15s,
      color 0.15s;
  }

  .nav-item:hover:not(.disabled) {
    background: var(--bg-tertiary);
    color: var(--text-primary);
  }

  .nav-item.active {
    color: var(--accent);
    background: var(--bg-tertiary);
  }

  .nav-item.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .profile-container {
    margin-left: auto;
    position: relative;
  }

  .avatar-btn {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    border-radius: 50%;
  }

  .avatar-btn:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }

  .profile-panel {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    width: 240px;
    background: var(--bg-primary);
    border: 1px solid var(--border-primary);
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    z-index: 100;
    padding: 1rem;
  }

  .profile-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid var(--border-primary);
    margin-bottom: 0.75rem;
  }

  .profile-name {
    font-weight: 500;
    color: var(--text-primary);
  }

  .profile-section {
    margin-bottom: 1rem;
  }

  .section-label {
    display: block;
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 0.5rem;
  }

  .theme-toggle {
    display: flex;
    width: 100%;
    background: var(--bg-tertiary);
    border: none;
    border-radius: 6px;
    padding: 2px;
    cursor: pointer;
  }

  .theme-option {
    flex: 1;
    padding: 0.375rem 0.75rem;
    font-size: 0.8125rem;
    font-weight: 500;
    color: var(--text-secondary);
    border-radius: 4px;
    transition:
      background-color 0.15s,
      color 0.15s;
  }

  .theme-option.active {
    background: var(--bg-primary);
    color: var(--text-primary);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  }

  .accent-picker {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .accent-swatch {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    border: 2px solid transparent;
    cursor: pointer;
    box-sizing: border-box;
    transition:
      transform 0.15s,
      border-color 0.15s;
  }

  .accent-swatch:hover {
    transform: scale(1.1);
  }

  .accent-swatch.selected {
    border-color: var(--text-primary);
  }

  .accent-blue {
    background: #2196f3;
  }
  .accent-green {
    background: #4caf50;
  }
  .accent-red {
    background: #f44336;
  }
  .accent-orange {
    background: #ff9800;
  }
  .accent-pink {
    background: #e91e63;
  }
  .accent-purple {
    background: #9c27b0;
  }

  .font-size-picker {
    display: flex;
    gap: 0.5rem;
    align-items: baseline;
  }

  .font-size-btn {
    background: var(--bg-tertiary);
    border: 1px solid var(--border-primary);
    border-radius: 4px;
    color: var(--text-secondary);
    cursor: pointer;
    line-height: 1;
    padding: 0.25rem 0.5rem;
    transition:
      background-color 0.15s,
      border-color 0.15s,
      color 0.15s;
  }

  .font-size-btn:nth-child(1) {
    font-size: 0.875rem;
  }
  .font-size-btn:nth-child(2) {
    font-size: 1.125rem;
  }
  .font-size-btn:nth-child(3) {
    font-size: 1.375rem;
  }

  .font-size-btn.active {
    background: var(--bg-primary);
    border-color: var(--accent);
    color: var(--accent);
  }

  .font-size-btn:hover:not(.active) {
    background: var(--bg-secondary);
    color: var(--text-primary);
  }

  .logout-btn {
    width: 100%;
    padding: 0.5rem;
    background: none;
    border: 1px solid var(--border-primary);
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-secondary);
    cursor: pointer;
    transition:
      background-color 0.15s,
      color 0.15s;
  }

  .logout-btn:hover {
    background: var(--bg-tertiary);
    color: var(--text-primary);
  }
</style>
