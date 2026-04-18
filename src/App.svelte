<script lang="ts">
  import { onMount } from 'svelte'
  import { theme, accentColour, fontSize } from './lib/stores/preferences'
  import { isAuthenticated, clearAuth } from './lib/stores/auth'
  import { currentRoute, navigate } from './lib/stores/router'
  import { accentToCssVars } from './lib/utils/accent'
  import { listCategories } from './lib/api/categories'
  import { setCategories } from './lib/stores/categories'
  import { parseApiError } from './lib/utils/errors'

  import Login from './routes/Login.svelte'
  import Register from './routes/Register.svelte'
  import Today from './routes/Today.svelte'
  import Tasks from './routes/Tasks.svelte'
  import Categories from './routes/Categories.svelte'
  import Charts from './routes/Charts.svelte'
  import Logs from './routes/Logs.svelte'
  import Answers from './routes/Answers.svelte'

  // Apply theme to document
  $effect(() => {
    document.documentElement.setAttribute('data-theme', $theme)
  })

  // Apply accent colour CSS variables to document root
  $effect(() => {
    const vars = accentToCssVars($accentColour)
    const root = document.documentElement
    Object.entries(vars).forEach(([key, value]) => {
      root.style.setProperty(key, value)
    })
  })

  // Apply font size to document root
  $effect(() => {
    const sizeMap = {
      medium: '16px',
      large: '18px',
      xlarge: '20px',
    }
    document.documentElement.style.setProperty('font-size', sizeMap[$fontSize])
  })

  // Load categories when authenticated
  $effect(() => {
    if ($isAuthenticated) {
      listCategories()
        .then((data) => setCategories(data))
        .catch((err) => {
          const parsed = parseApiError(err)
          if (
            parsed.error.toLowerCase().includes('authentication failed') ||
            parsed.error === 'unauthorized'
          ) {
            clearAuth()
            navigate('login')
          }
        })
    } else {
      setCategories([])
    }
  })

  // Redirect to login if not authenticated
  $effect(() => {
    if (!$isAuthenticated && $currentRoute !== 'login' && $currentRoute !== 'register') {
      navigate('login')
    }
  })

  onMount(() => {
    // Initial auth check
    if (!$isAuthenticated) {
      navigate('login')
    }
  })
</script>

<div id="app">
  {#if $currentRoute === 'login'}
    <Login />
  {:else if $currentRoute === 'register'}
    <Register />
  {:else if $isAuthenticated}
    {#if $currentRoute === 'today'}
      <Today />
    {:else if $currentRoute === 'tasks'}
      <Tasks />
    {:else if $currentRoute === 'categories'}
      <Categories />
    {:else if $currentRoute === 'logs'}
      <Logs />
    {:else if $currentRoute === 'answers'}
      <Answers />
    {:else if $currentRoute === 'charts'}
      <Charts />
    {/if}
  {:else}
    <Login />
  {/if}
</div>

<style>
  #app {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }
</style>
