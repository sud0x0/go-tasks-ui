# go-tasks-ui

A task and habit tracking web application built with Svelte 5 and TypeScript. Users manage recurring tasks, log daily answers, view analytics, and keep a personal journal. Connects to the go-tasks-api backend.

## Contents

- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [Features](#features)
- [Routing](#routing)
- [State Management](#state-management)
- [API Integration](#api-integration)
- [Theming](#theming)
- [Code Quality](#code-quality)
- [Make Commands](#make-commands)
- [TODO](#todo)

---

## Architecture

The project follows a feature-based structure with shared components, stores, and utilities. Routes are top-level page components. All API calls go through a central client with automatic token refresh.

```
src/
  App.svelte                    — root component, routing, theme setup
  main.ts                       — application entry point
  app.css                       — global styles, CSS variables
  lib/
    api/                        — API integration layer
      client.ts                 — HTTP client with token refresh
      auth.ts                   — login, register, refresh, logout
      tasks.ts                  — task CRUD operations
      categories.ts             — category CRUD operations
      occurrences.ts            — occurrence listing and answers
      dailyLogs.ts              — daily journal entries
    stores/                     — Svelte stores (state management)
      auth.ts                   — access token, refresh token, current user
      preferences.ts            — theme, accent colour, font size
      categories.ts             — categories cache
      router.ts                 — client-side routing state
    components/                 — reusable UI components
      layout/
        TopBar.svelte           — navigation header, theme picker, user menu
        NavItem.svelte          — navigation button with active state
      ui/
        Button.svelte           — themed button
        Modal.svelte            — dialog with title and close
        Table.svelte            — data table
        Badge.svelte            — status labels
        ProgressBar.svelte      — visual progress indicator
        DateNav.svelte          — date navigation (prev/next/today)
        Avatar.svelte           — user avatar with initials
      charts/
        EChart.svelte           — ECharts wrapper component
    types/
      api.ts                    — TypeScript interfaces for API
    utils/
      dates.ts                  — date formatting and manipulation
      errors.ts                 — error message parsing
      accent.ts                 — accent colour CSS variable generation
      chartData.ts              — chart data transformations
      echarts.ts                — ECharts configuration helpers
  routes/                       — page components
    Login.svelte                — authentication page
    Register.svelte             — user registration
    Today.svelte                — daily task execution view
    Tasks.svelte                — task management (CRUD)
    Categories.svelte           — category management
    Logs.svelte                 — daily journal log entries
    Answers.svelte              — historical task answers
    Charts.svelte               — analytics dashboard
```

**Component flow:** User interaction → route component → API call (via client) → store update → reactive UI update.

---

## Tech Stack

| Component       | Choice                            |
| --------------- | --------------------------------- |
| Framework       | Svelte 5 (Runes-based reactivity) |
| Language        | TypeScript                        |
| Build tool      | Vite                              |
| Charts          | ECharts                           |
| Package manager | pnpm                              |
| Containers      | Podman + podman-compose           |
| Linting         | ESLint                            |
| Formatting      | Prettier                          |
| Type checking   | svelte-check                      |

---

## Getting Started

**Prerequisites:** Podman, podman-compose, pnpm, pre-commit, semgrep.

**First time:**

```bash
cp .env.example .env
# Edit .env and fill in your values
make setup
```

`make setup` installs local dependencies, installs pre-commit hooks, builds the container, and starts it. The app is available at `http://localhost:3000` when complete.

**Daily use:**

```bash
make run      # start container
make logs     # tail application logs
```

The app is available at `http://localhost:3000`.

**Clean slate:**

```bash
make destroy  # remove all containers, volumes, and images
make build    # rebuild from scratch
```

---

## Configuration

All configuration is read from environment variables. Copy `.env.example` to `.env` and fill in values before running.

| Variable            | Required | Default                 | Description          |
| ------------------- | -------- | ----------------------- | -------------------- |
| `VITE_API_BASE_URL` | No       | `http://localhost:8080` | Backend API base URL |

Never commit `.env` — it is in `.gitignore`.

---

## Features

### Task Management

- Create, read, update, and delete tasks
- Eight recurrence types: once, daily, every N days, weekly, every N weeks, monthly (by date), monthly (by weekday), yearly
- Four answer types: boolean (yes/no), integer, string, select (multiple choice)
- Optional scheduled times for task occurrences
- Category assignment
- Activity filtering (active/inactive)

### Daily Task Execution (Today)

- View all tasks scheduled for the selected date
- Answer tasks with appropriate input types
- Task status tracking: answered, pending, skipped
- Progress bar showing completion percentage
- Daily journal/log for reflection
- Date navigation (previous/next/today)
- Category filtering

### Categories

- Create, edit, delete categories
- Organise tasks by category
- Colour coding for visual distinction

### Analytics (Charts)

- **Boolean tasks:** completion rate, streaks (current/longest), daily bar chart, activity heatmap
- **Integer tasks:** trend analysis with average line, min/max/average statistics, activity heatmap
- **String tasks:** completion rate and answer count
- **Select tasks:** distribution donut chart, frequency bar chart
- **Category view:** per-task completion rates
- Date range selection: 7, 30, 90 days
- Theme-aware chart styling

### Preferences

- Three themes: light, dark, sepia
- Six accent colours: blue, green, red, orange, pink, purple
- Three font sizes: medium, large, xlarge
- All preferences persisted in localStorage

---

## Routing

Client-side routing via a simple store. No URL history — state is managed in memory.

| Route        | Component         | Description                                |
| ------------ | ----------------- | ------------------------------------------ |
| `login`      | Login.svelte      | Username/password authentication           |
| `register`   | Register.svelte   | New user registration                      |
| `today`      | Today.svelte      | Daily task execution (default after login) |
| `tasks`      | Tasks.svelte      | Task CRUD interface                        |
| `categories` | Categories.svelte | Category management                        |
| `logs`       | Logs.svelte       | Daily journal log entries                  |
| `answers`    | Answers.svelte    | Historical task answers                    |
| `charts`     | Charts.svelte     | Analytics dashboard                        |

Unauthenticated users are redirected to `login`. After login, users land on `today`.

---

## State Management

Svelte stores manage global state with localStorage persistence where appropriate.

### Auth Store (`stores/auth.ts`)

- `accessToken` — JWT access token (persisted)
- `refreshToken` — JWT refresh token (persisted)
- `currentUser` — logged-in user info
- `isAuthenticated` — derived boolean

### Preferences Store (`stores/preferences.ts`)

- `theme` — light / dark / sepia (persisted)
- `accentColour` — primary accent colour (persisted)
- `fontSize` — small / medium / large (persisted)

### Categories Store (`stores/categories.ts`)

- `categories` — array of user categories
- `categoriesMap` — derived map for quick lookups
- Loaded from API on authentication

### Router Store (`stores/router.ts`)

- `currentRoute` — active route name

---

## API Integration

The HTTP client (`lib/api/client.ts`) handles all backend communication:

- Base URL from `VITE_API_BASE_URL` environment variable
- Automatic `Authorization: Bearer <token>` header injection
- Automatic token refresh on 401 responses
- JSON parsing and error handling

### Endpoints Used

| Module      | Endpoints                                                                                                   |
| ----------- | ----------------------------------------------------------------------------------------------------------- |
| Auth        | `/api/v1/auth/login`, `/api/v1/auth/register`, `/api/v1/auth/refresh`                                       |
| Tasks       | `GET/POST /api/v1/tasks`, `PUT/DELETE /api/v1/tasks/{id}`                                                   |
| Categories  | `GET/POST/PUT/DELETE /api/v1/categories`                                                                    |
| Occurrences | `GET /api/v1/occurrences`, `POST /api/v1/occurrences/{id}/answer`, `POST /api/v1/occurrences/{id}/suppress` |
| Daily Logs  | `GET/POST/PUT /api/v1/daily-logs`                                                                           |

---

## Theming

CSS variables control all colours. Theme classes (`light`, `dark`, `sepia`) are applied to the root element.

### Theme Variables

- `--bg-primary`, `--bg-secondary`, `--bg-tertiary` — background colours
- `--text-primary`, `--text-secondary`, `--text-tertiary` — text colours
- `--border-primary`, `--border-secondary` — border colours
- `--accent`, `--accent-dark`, `--accent-light` — accent colour variants

Accent colours are dynamically generated by `accentToCssVars()` which creates light/dark variants from the base colour.

---

## Code Quality

Pre-commit hooks run automatically on every commit:

- `trailing-whitespace` — removes trailing whitespace
- `end-of-file-fixer` — ensures files end with a newline
- `check-yaml` — validates YAML files
- `check-added-large-files` — blocks large file commits
- `gitleaks` — secrets detection
- `semgrep` — static security analysis

Run all hooks manually:

```bash
make pre-commit-run
```

Run individual tools:

```bash
make lint      # ESLint
make fmt       # Prettier
make check     # svelte-check
make semgrep   # semgrep
make socket    # Socket.dev supply chain scan (requires socket CLI)
```

---

## Make Commands

```
Development
  setup            First-time setup: copies .env, installs deps, installs hooks, builds container
  install          Install local dependencies
  build            Build container and start
  run              Start container
  stop             Stop container
  logs             View application logs
  destroy          Destroy all containers, volumes, and images
  clean            Delete all temp, build, and dist folders

Code Quality
  lint             Run ESLint on .ts and .svelte files
  fmt              Format all files with Prettier
  check            Run svelte-check for type errors
  pre-commit-run   Run all pre-commit hooks against all files
  semgrep          Run semgrep security scan
  socket           Run Socket.dev supply chain scan

Typical workflow
  First time:  make setup
  Daily:       make run → make logs
  Fresh start: make destroy → make build
  Tidy up:     make clean
```

---

## TODO

- URL-based routing with browser history
- Task reordering / drag-and-drop
- Keyboard shortcuts
- Offline support with service worker
- Export data to CSV/JSON
- Mobile-responsive improvements
- Accessibility audit (ARIA labels, focus management)
