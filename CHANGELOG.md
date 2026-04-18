# Changelog

## [1.0.0] - 2026-04-18

### Features

#### Authentication

- User registration and login
- JWT-based authentication with automatic token refresh
- Secure logout

#### Today Page

- View daily task occurrences with progress tracking
- Answer tasks with multiple answer types: boolean, integer, string, select
- Skip occurrences and undo skip
- Edit existing answers
- Reset answers to clear responses
- Category filtering
- Progress bar showing completion status
- Daily log entry with save/update functionality
- Deactivated log detection with reactivate option

#### Tasks Page

- Create, edit, and delete tasks
- Assign tasks to categories
- Configure answer types with select options
- Schedule tasks on specific days of the week
- Set multiple scheduled times per task
- Activate/deactivate tasks
- View task details in modal

#### Categories Page

- Create, edit, and delete categories
- Assign custom colours to categories
- Soft delete with option to permanently delete
- Reactivate deleted categories

#### Logs Page

- View daily log entries with date range filtering
- Quick date filters: Last 30 days, This month, This year
- Edit log entries
- Soft delete and permanent delete logs
- Bulk delete operations
- View and reactivate inactive logs
- Type-to-confirm for permanent deletions

#### Answers Page

- View all answered occurrences
- Filter by date range and category
- View answer details
- Multi-select for bulk operations
- Bulk delete answers with type-to-confirm safety

#### Charts Page

- Data visualisation for task completion
- Interactive charts using ECharts

#### Preferences

- Theme selection: Light, Dark, Sepia
- Accent colour selection: Blue, Green, Red, Orange, Pink, Purple
- Font size options: Medium, Large, Extra Large
- Preferences persist in local storage

#### UI/UX

- Responsive layout
- Consistent design system with CSS variables
- Theme-aware danger/error colours
- Accessible navigation
- Loading states and error handling
