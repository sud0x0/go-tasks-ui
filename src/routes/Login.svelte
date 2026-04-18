<script lang="ts">
  import { login } from '../lib/api/auth'
  import { setSession } from '../lib/stores/auth'
  import { navigate } from '../lib/stores/router'
  import { parseApiError } from '../lib/utils/errors'

  let username = $state('')
  let password = $state('')
  let loading = $state(false)
  let error = $state('')

  async function handleSubmit(e: Event) {
    e.preventDefault()
    loading = true
    error = ''

    try {
      const data = await login({ username, password })
      setSession(data.access_token, data.refresh_token, data.expires_at, data.user)
      navigate('today')
    } catch (err) {
      error = parseApiError(err).error
    } finally {
      loading = false
    }
  }
</script>

<div class="auth-page">
  <div class="auth-container">
    <div class="auth-header">
      <div class="logo-mark">T</div>
      <h1>Go Tasks</h1>
    </div>
    <h2>Sign in to your account</h2>
    <form class="auth-form" onsubmit={handleSubmit}>
      <div class="form-group">
        <label for="username">Username</label>
        <input type="text" id="username" placeholder="your username" bind:value={username} />
      </div>
      <div class="form-group">
        <label for="password">Password</label>
        <input type="password" id="password" placeholder="Your password" bind:value={password} />
      </div>
      {#if error}
        <div class="error-msg">{error}</div>
      {/if}
      <button type="submit" class="btn-primary" disabled={loading}>
        {loading ? 'Signing in...' : 'Sign in'}
      </button>
    </form>
    <p class="auth-footer">
      Don't have an account?
      <button class="link-btn" onclick={() => navigate('register')}>Register</button>
    </p>
  </div>
</div>

<style>
  .auth-page {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-secondary);
    padding: 1rem;
  }

  .auth-container {
    width: 100%;
    max-width: 400px;
    background: var(--bg-primary);
    border-radius: 8px;
    padding: 2rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .auth-header {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    margin-bottom: 1.5rem;
  }

  .logo-mark {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    background: var(--accent);
    color: white;
    font-weight: 700;
    font-size: 1.25rem;
    border-radius: 8px;
  }

  .auth-header h1 {
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  h2 {
    text-align: center;
    font-size: 1.125rem;
    font-weight: 500;
    color: var(--text-secondary);
    margin-bottom: 1.5rem;
  }

  .auth-form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  .form-group label {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-primary);
  }

  .form-group input {
    padding: 0.625rem 0.75rem;
    border: 1px solid var(--border-primary);
    border-radius: 6px;
    background: var(--bg-primary);
    color: var(--text-primary);
  }

  .form-group input:focus {
    outline: none;
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-light);
  }

  .btn-primary {
    padding: 0.625rem 1rem;
    background: var(--accent);
    color: white;
    border: none;
    border-radius: 6px;
    font-weight: 500;
    cursor: pointer;
    margin-top: 0.5rem;
  }

  .btn-primary:hover {
    background: var(--accent-dark);
  }

  .auth-footer {
    text-align: center;
    margin-top: 1.5rem;
    font-size: 0.875rem;
    color: var(--text-secondary);
  }

  .link-btn {
    background: none;
    border: none;
    color: var(--accent);
    cursor: pointer;
    font-weight: 500;
  }

  .link-btn:hover {
    text-decoration: underline;
  }

  .error-msg {
    color: var(--danger);
    font-size: 0.875rem;
    text-align: center;
  }

  .btn-primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
</style>
