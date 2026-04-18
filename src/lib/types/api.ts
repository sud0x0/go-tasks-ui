export interface ApiError {
  error: string
}

// Auth
export interface RegisterRequest {
  username: string
  password: string
}

export interface LoginRequest {
  username: string
  password: string
}

export interface UserResponse {
  id: string
  username: string
  created_at: string
  updated_at: string
}

export interface LoginResponse {
  user: UserResponse
  access_token: string
  refresh_token: string
  expires_at: string
  token_type: string
}

export interface RefreshResponse {
  access_token: string
  refresh_token: string
  expires_at: string
  token_type: string
}

// Category
export interface Category {
  id: string
  user_id: string
  name: string
  description?: string
  colour: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CategoryRequest {
  name: string
  description?: string
  colour?: string
}

// Bulk operations
export interface BulkDeleteIdsRequest {
  ids: string[]
}

export interface BulkSoftDeleteResponse {
  requested: number
  soft_deleted: number
}

export interface BulkPermanentDeleteResponse {
  requested: number
  permanently_deleted: number
}

// Task
export type AnswerType = 'string' | 'integer' | 'boolean' | 'select'
export type RecurrenceType =
  | 'once'
  | 'daily'
  | 'every_n_days'
  | 'weekly'
  | 'every_n_weeks'
  | 'monthly_date'
  | 'monthly_weekday'
  | 'yearly'
export type EndType = 'never' | 'on_date' | 'after_n'

export interface Task {
  id: string
  user_id: string
  category_id?: string
  name: string
  description?: string
  answer_type: AnswerType
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface TaskSchedule {
  id: string
  task_id: string
  recurrence_type: RecurrenceType
  recurrence_interval?: number
  days_of_week?: number[]
  month_day?: number
  month_week?: number
  month_weekday?: number
  month_of_year?: number
  scheduled_times?: string[]
  start_date: string
  end_type: EndType
  end_date?: string
  end_after_n?: number
  created_at: string
}

export interface TaskSelectOption {
  id: string
  task_id: string
  value: string
  position: number
  created_at: string
}

export interface TaskWithDetails {
  task: Task
  schedule?: TaskSchedule
  select_options?: TaskSelectOption[]
}

export interface CreateTaskRequest {
  category_id: string
  name: string
  description?: string
  answer_type: AnswerType
  schedule: ScheduleRequest
  select_options?: { value: string }[]
}

export interface UpdateTaskRequest {
  name: string
  description?: string
}

export interface ScheduleRequest {
  recurrence_type: RecurrenceType
  recurrence_interval?: number
  days_of_week?: number[]
  month_day?: number
  month_week?: number
  month_weekday?: number
  month_of_year?: number
  scheduled_times?: string[]
  start_date: string
  end_type?: EndType
  end_date?: string
  end_after_n?: number
}

// Occurrence
export interface TaskOccurrence {
  id: string
  task_id: string
  schedule_id: string
  user_id: string
  occurrence_date: string
  scheduled_time?: string
  is_suppressed: boolean
  created_at: string
}

export interface TaskAnswer {
  id: string
  occurrence_id: string
  user_id: string
  answer_string?: string
  answer_integer?: number
  answer_boolean?: boolean
  answer_select?: string
  answered_at: string
  created_at: string
  updated_at: string
}

export interface OccurrenceWithDetails {
  occurrence: TaskOccurrence
  task: Task
  select_options?: TaskSelectOption[]
  answer?: TaskAnswer
}

export interface AnswerRequest {
  answer_string?: string
  answer_integer?: number
  answer_boolean?: boolean
  answer_select?: string
}

// Daily log
export interface DailyLog {
  id: string
  user_id: string
  log_date: string
  entry: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreateDailyLogRequest {
  log_date: string
  entry: string
}

export interface UpdateDailyLogRequest {
  entry: string
}
