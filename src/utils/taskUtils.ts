// Type-safe utility functions for task management

import type {
  Task,
  TaskInput,
  TaskUpdate,
  TaskFilter,
  TaskSort,
  TaskStatistics,
  CompletedTask,
  ActiveTask,
  TaskPriority,
  TaskCategory,
  isCompletedTask,
  isActiveTask,
} from '../types/tasks';

// ============================================================================
// Task Creation & Validation
// ============================================================================

export function createTask(input: TaskInput): Task {
  const now = new Date().toISOString();
  
  return {
    id: input.id || Date.now().toString(),
    text: input.text,
    completed: input.completed || false,
    priority: input.priority || 'none',
    category: input.category || '',
    dueDate: input.dueDate || 'today',
    createdAt: input.createdAt || now,
    completedAt: input.completedAt || null,
  };
}

export function updateTask(task: Task, updates: TaskUpdate): Task {
  return {
    ...task,
    ...updates,
  };
}

export function toggleTaskCompletion(task: Task): Task {
  return {
    ...task,
    completed: !task.completed,
    completedAt: !task.completed ? new Date().toISOString() : null,
  };
}

// ============================================================================
// Task Filtering
// ============================================================================

export function filterTasks(tasks: readonly Task[], filter: TaskFilter): Task[] {
  switch (filter.type) {
    case 'all':
      return [...tasks];
      
    case 'priority':
      return tasks.filter(t => t.priority === filter.priority);
      
    case 'category':
      return tasks.filter(t => t.category === filter.category);
      
    case 'completed':
      return tasks.filter(t => t.completed === filter.completed);
      
    case 'dueDate':
      return tasks.filter(t => t.dueDate === filter.dueDate);
      
    case 'search':
      const query = filter.query.toLowerCase();
      return tasks.filter(t => 
        t.text.toLowerCase().includes(query) ||
        t.category.toLowerCase().includes(query)
      );
      
    default:
      // Exhaustive check
      const _exhaustive: never = filter;
      return [...tasks];
  }
}

// ============================================================================
// Task Sorting
// ============================================================================

export function sortTasks(tasks: readonly Task[], sort: TaskSort | null): Task[] {
  if (!sort) return [...tasks];
  
  const sorted = [...tasks].sort((a, b) => {
    const aVal = a[sort.key];
    const bVal = b[sort.key];
    
    if (aVal === bVal) return 0;
    
    const comparison = aVal < bVal ? -1 : 1;
    return sort.order === 'asc' ? comparison : -comparison;
  });
  
  return sorted;
}

// ============================================================================
// Task Categorization
// ============================================================================

export interface CategorizedTasks {
  active: ActiveTask[];
  completed: CompletedTask[];
}

export function categorizeTasks(tasks: readonly Task[]): CategorizedTasks {
  const active: ActiveTask[] = [];
  const completed: CompletedTask[] = [];
  
  for (const task of tasks) {
    if (isCompletedTask(task)) {
      completed.push(task);
    } else if (isActiveTask(task)) {
      active.push(task);
    }
  }
  
  // Sort completed by completion time (newest first)
  completed.sort((a, b) => {
    const timeA = new Date(a.completedAt).getTime();
    const timeB = new Date(b.completedAt).getTime();
    return timeB - timeA;
  });
  
  return { active, completed };
}

// ============================================================================
// Task Statistics
// ============================================================================

export function calculateStatistics(tasks: readonly Task[]): TaskStatistics {
  const total = tasks.length;
  const completed = tasks.filter(t => t.completed).length;
  const active = total - completed;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
  
  // Priority breakdown
  const byPriority: Record<TaskPriority, number> = {
    none: 0,
    low: 0,
    medium: 0,
    high: 0,
  };
  
  // Category breakdown
  const byCategory: Record<string, number> = {};
  
  // Due date breakdown
  const byDueDate: Record<'today' | 'tomorrow', number> = {
    today: 0,
    tomorrow: 0,
  };
  
  for (const task of tasks) {
    byPriority[task.priority]++;
    
    if (task.category) {
      byCategory[task.category] = (byCategory[task.category] || 0) + 1;
    }
    
    byDueDate[task.dueDate]++;
  }
  
  return {
    total,
    completed,
    active,
    completionRate,
    byPriority,
    byCategory,
    byDueDate,
  };
}

// ============================================================================
// Task Search
// ============================================================================

export function searchTasks(
  tasks: readonly Task[],
  query: string
): Task[] {
  if (!query.trim()) return [...tasks];
  
  const lowerQuery = query.toLowerCase();
  
  return tasks.filter(task =>
    task.text.toLowerCase().includes(lowerQuery) ||
    task.category.toLowerCase().includes(lowerQuery) ||
    task.priority.toLowerCase().includes(lowerQuery)
  );
}

// ============================================================================
// Task Validation
// ============================================================================

export interface TaskValidationResult {
  valid: boolean;
  errors: Partial<Record<keyof Task, string>>;
}

export function validateTask(task: Partial<Task>): TaskValidationResult {
  const errors: Partial<Record<keyof Task, string>> = {};
  
  if (!task.text || task.text.trim().length === 0) {
    errors.text = 'Task text is required';
  }
  
  if (task.text && task.text.length > 500) {
    errors.text = 'Task text must be less than 500 characters';
  }
  
  const validPriorities: TaskPriority[] = ['none', 'low', 'medium', 'high'];
  if (task.priority && !validPriorities.includes(task.priority)) {
    errors.priority = 'Invalid priority';
  }
  
  const validCategories: TaskCategory[] = ['', 'work', 'personal', 'shopping', 'health', 'other'];
  if (task.category && !validCategories.includes(task.category)) {
    errors.category = 'Invalid category';
  }
  
  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

// ============================================================================
// Task Bulk Operations
// ============================================================================

export function clearCompletedTasks(tasks: readonly Task[]): Task[] {
  return tasks.filter(t => !t.completed);
}

export function completeAllTasks(tasks: readonly Task[]): Task[] {
  const now = new Date().toISOString();
  return tasks.map(t => ({
    ...t,
    completed: true,
    completedAt: t.completedAt || now,
  }));
}

export function deleteTasksByIds(
  tasks: readonly Task[],
  ids: readonly string[]
): Task[] {
  const idSet = new Set(ids);
  return tasks.filter(t => !idSet.has(t.id));
}

// ============================================================================
// Task Migration (for overdue tasks)
// ============================================================================

export function migrateOverdueTasks(tasks: readonly Task[]): Task[] {
  return tasks.map(task => {
    // Move incomplete today tasks to tomorrow
    if (task.dueDate === 'today' && !task.completed) {
      return {
        ...task,
        dueDate: 'tomorrow' as const,
      };
    }
    return task;
  });
}

// ============================================================================
// Type Guards
// ============================================================================

export function isValidTaskPriority(value: unknown): value is TaskPriority {
  return (
    typeof value === 'string' &&
    ['none', 'low', 'medium', 'high'].includes(value)
  );
}

export function isValidTaskCategory(value: unknown): value is TaskCategory {
  return (
    typeof value === 'string' &&
    ['', 'work', 'personal', 'shopping', 'health', 'other'].includes(value)
  );
}

export function isTask(value: unknown): value is Task {
  if (typeof value !== 'object' || value === null) return false;
  
  const obj = value as Record<string, unknown>;
  
  return (
    typeof obj.id === 'string' &&
    typeof obj.text === 'string' &&
    typeof obj.completed === 'boolean' &&
    isValidTaskPriority(obj.priority) &&
    isValidTaskCategory(obj.category) &&
    (obj.dueDate === 'today' || obj.dueDate === 'tomorrow') &&
    typeof obj.createdAt === 'string' &&
    (obj.completedAt === null || typeof obj.completedAt === 'string')
  );
}
