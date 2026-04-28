// Advanced TypeScript types for task management system

// ============================================================================
// Core Domain Types
// ============================================================================

export type TaskPriority = 'none' | 'low' | 'medium' | 'high';
export type TaskCategory = 'work' | 'personal' | 'shopping' | 'health' | 'other' | '';
export type TaskDueDate = 'today' | 'tomorrow';

export interface Task {
  readonly id: string;
  text: string;
  completed: boolean;
  priority: TaskPriority;
  category: TaskCategory;
  dueDate: TaskDueDate;
  createdAt: string;
  completedAt: string | null;
}

export interface Note {
  readonly id: string;
  title: string;
  content: string;
  createdAt: string;
}

// ============================================================================
// Utility Types
// ============================================================================

// Make specific properties required
export type RequireFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

// Make specific properties optional
export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// Deep readonly type
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object
    ? T[P] extends Function
      ? T[P]
      : DeepReadonly<T[P]>
    : T[P];
};

// Extract keys of specific type
export type KeysOfType<T, U> = {
  [K in keyof T]: T[K] extends U ? K : never;
}[keyof T];

// ============================================================================
// Task Operations
// ============================================================================

export type TaskInput = Omit<Task, 'id' | 'createdAt' | 'completedAt'> & {
  id?: string;
  createdAt?: string;
  completedAt?: string | null;
};

export type TaskUpdate = Partial<Omit<Task, 'id' | 'createdAt'>>;

export type CompletedTask = RequireFields<Task, 'completedAt'> & {
  completed: true;
  completedAt: string;
};

export type ActiveTask = Task & {
  completed: false;
  completedAt: null;
};

// Type guard for completed tasks
export function isCompletedTask(task: Task): task is CompletedTask {
  return task.completed && task.completedAt !== null;
}

// Type guard for active tasks
export function isActiveTask(task: Task): task is ActiveTask {
  return !task.completed && task.completedAt === null;
}

// ============================================================================
// Filter & Sort Types
// ============================================================================

export type TaskFilter = 
  | { type: 'all' }
  | { type: 'priority'; priority: Exclude<TaskPriority, 'none'> }
  | { type: 'category'; category: Exclude<TaskCategory, ''> }
  | { type: 'completed'; completed: boolean }
  | { type: 'dueDate'; dueDate: TaskDueDate }
  | { type: 'search'; query: string };

export type TaskSortKey = KeysOfType<Task, string | number | boolean>;

export type TaskSortOrder = 'asc' | 'desc';

export interface TaskSort {
  key: TaskSortKey;
  order: TaskSortOrder;
}

// ============================================================================
// State Management
// ============================================================================

export interface TaskState {
  tasks: readonly Task[];
  filter: TaskFilter;
  sort: TaskSort | null;
  searchQuery: string;
}

export interface NoteState {
  notes: readonly Note[];
}

// ============================================================================
// History & Undo/Redo
// ============================================================================

export interface HistoryState<T> {
  past: readonly T[];
  present: T;
  future: readonly T[];
}

export type HistoryAction<T> =
  | { type: 'SET'; state: T }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'CLEAR' };

// ============================================================================
// Export/Import
// ============================================================================

export interface ExportData {
  readonly version: string;
  readonly exportDate: string;
  readonly tasks: readonly Task[];
  readonly notes: readonly Note[];
}

export type ImportResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// ============================================================================
// Event System
// ============================================================================

export type TaskEventMap = {
  'task:created': { task: Task };
  'task:updated': { task: Task; changes: TaskUpdate };
  'task:deleted': { taskId: string };
  'task:completed': { task: CompletedTask };
  'task:uncompleted': { task: ActiveTask };
  'tasks:cleared': { count: number };
  'tasks:imported': { tasks: readonly Task[] };
  'tasks:exported': { data: ExportData };
};

export type TaskEventType = keyof TaskEventMap;

export type TaskEventHandler<T extends TaskEventType> = (
  data: TaskEventMap[T]
) => void;

// ============================================================================
// Statistics
// ============================================================================

export interface TaskStatistics {
  total: number;
  completed: number;
  active: number;
  completionRate: number;
  byPriority: Record<TaskPriority, number>;
  byCategory: Record<string, number>;
  byDueDate: Record<TaskDueDate, number>;
}

// ============================================================================
// UI State
// ============================================================================

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  readonly id: string;
  type: ToastType;
  message: string;
  duration: number;
}

export interface UIState {
  showCompleted: boolean;
  reorderMode: boolean;
  editingTaskId: string | null;
  toasts: readonly ToastMessage[];
}

// ============================================================================
// Form Types
// ============================================================================

export interface TaskFormData {
  text: string;
  priority: TaskPriority;
  category: TaskCategory;
  dueDate: TaskDueDate;
}

export type TaskFormErrors = Partial<Record<keyof TaskFormData, string>>;

export interface NoteFormData {
  title: string;
  content: string;
}

export type NoteFormErrors = Partial<Record<keyof NoteFormData, string>>;

// ============================================================================
// Validation
// ============================================================================

export interface ValidationRule<T> {
  validate: (value: T) => boolean;
  message: string;
}

export type FieldValidation<T> = {
  [K in keyof T]?: ValidationRule<T[K]>[];
};

export type ValidationErrors<T> = {
  [K in keyof T]?: string[];
};

// ============================================================================
// API Types (for future backend integration)
// ============================================================================

export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface APIResponse<T> {
  data: T;
  status: number;
  message?: string;
}

export type APIError = {
  status: number;
  message: string;
  errors?: Record<string, string[]>;
};

export type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: APIError };

// ============================================================================
// Branded Types (for type safety)
// ============================================================================

declare const brand: unique symbol;

export type Brand<T, B> = T & { [brand]: B };

export type TaskId = Brand<string, 'TaskId'>;
export type NoteId = Brand<string, 'NoteId'>;
export type Timestamp = Brand<string, 'Timestamp'>;

// Helper to create branded types
export function createTaskId(id: string): TaskId {
  return id as TaskId;
}

export function createNoteId(id: string): NoteId {
  return id as NoteId;
}

export function createTimestamp(date: string): Timestamp {
  return date as Timestamp;
}

// ============================================================================
// Type Utilities
// ============================================================================

// Extract non-nullable keys
export type NonNullableKeys<T> = {
  [K in keyof T]-?: undefined extends T[K] ? never : K;
}[keyof T];

// Create a type with only non-nullable properties
export type NonNullableProps<T> = Pick<T, NonNullableKeys<T>>;

// Ensure at least one property is present
export type AtLeastOne<T> = {
  [K in keyof T]: Pick<T, K> & Partial<Omit<T, K>>;
}[keyof T];

// Make nested properties optional
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object
    ? T[P] extends Array<infer U>
      ? Array<DeepPartial<U>>
      : DeepPartial<T[P]>
    : T[P];
};
