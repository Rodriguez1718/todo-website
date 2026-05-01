// Sample data (inline since imports don't work in client scripts)
console.log('Script loaded successfully!');

// UUID generator
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Custom confirm modal
function showConfirmModal(message, onConfirm, onCancel) {
  const modal = document.createElement('div');
  modal.className = 'confirm-modal-overlay';
  modal.innerHTML = `
    <div class="confirm-modal">
      <div class="confirm-modal-icon">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
      </div>
      <h3 class="confirm-modal-title">Confirm Action</h3>
      <p class="confirm-modal-message">${message}</p>
      <div class="confirm-modal-actions">
        <button class="confirm-modal-btn confirm-modal-cancel">Cancel</button>
        <button class="confirm-modal-btn confirm-modal-confirm">Delete</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Focus trap
  const confirmBtn = modal.querySelector('.confirm-modal-confirm');
  const cancelBtn = modal.querySelector('.confirm-modal-cancel');
  
  setTimeout(() => modal.classList.add('show'), 10);
  
  const close = (confirmed) => {
    modal.classList.remove('show');
    setTimeout(() => {
      modal.remove();
      if (confirmed && onConfirm) onConfirm();
      if (!confirmed && onCancel) onCancel();
    }, 200);
  };
  
  confirmBtn.addEventListener('click', () => close(true));
  cancelBtn.addEventListener('click', () => close(false));
  modal.addEventListener('click', (e) => {
    if (e.target === modal) close(false);
  });
  
  // Keyboard
  const handleKey = (e) => {
    if (e.key === 'Escape') {
      close(false);
      document.removeEventListener('keydown', handleKey);
    }
  };
  document.addEventListener('keydown', handleKey);
  
  cancelBtn.focus();
}

window.showConfirmModal = showConfirmModal;

// Date management functions
function getCurrentDateString() {
  return new Date().toDateString();
}

function getLastCheckDate() {
  return localStorage.getItem('todolist_last_check_date');
}

function setLastCheckDate() {
  localStorage.setItem('todolist_last_check_date', getCurrentDateString());
}

async function migrateTomorrowToToday() {
  const tasks = await getUiverseTasks();
  let migrated = false;
  
  const updatedTasks = tasks.map(task => {
    if (task.dueDate === 'tomorrow') {
      migrated = true;
      return {
        ...task,
        dueDate: 'today',
        migratedAt: new Date().toISOString() // Track when it was migrated
      };
    }
    return task;
  });
  
  if (migrated) {
    await saveUiverseTasks(updatedTasks);
    console.log('Tasks migrated: Tomorrow tasks moved to Today');
    
    // Refresh the display immediately
    if (typeof loadUiverseTasks === 'function') {
      await loadUiverseTasks();
    }
  }
  
  return migrated;
}

async function migrateOverdueTasks() {
  const tasks = await getUiverseTasks();
  const incompleteTodayTasks = tasks.filter(t => t.dueDate === 'today' && !t.completed);
  
  if (incompleteTodayTasks.length === 0) {
    return [];
  }
  
  // Move incomplete today tasks to tomorrow
  const updatedTasks = tasks.map(task => {
    if (task.dueDate === 'today' && !task.completed) {
      return {
        ...task,
        dueDate: 'tomorrow',
        wasOverdue: true,
        overdueDate: new Date().toISOString()
      };
    }
    return task;
  });
  
  await saveUiverseTasks(updatedTasks);
  console.log(`Migrated ${incompleteTodayTasks.length} overdue tasks to tomorrow`);
  
  return incompleteTodayTasks;
}

async function checkAndMigrateTasks() {
  const currentDate = getCurrentDateString();
  const lastCheckDate = getLastCheckDate();
  
  // If this is the first time or if the date has changed
  if (!lastCheckDate || lastCheckDate !== currentDate) {
    // First, migrate incomplete today tasks to tomorrow (overdue)
    const overdueTasks = await migrateOverdueTasks();
    
    // Then migrate tomorrow's tasks to today
    await migrateTomorrowToToday();
    
    // Update the last check date
    setLastCheckDate();
    
    // Show overdue alert if there are any
    if (overdueTasks.length > 0) {
      showOverdueAlert(overdueTasks);
    }
    
    return true;
  }
  
  return false;
}

document.addEventListener('DOMContentLoaded', async function() {
  console.log('DOMContentLoaded event fired');
  
  // Don't initialize with sample data - let users start empty
  if (!localStorage.getItem('todolist_uiverse_tasks')) {
    localStorage.setItem('todolist_uiverse_tasks', JSON.stringify([]));
    console.log('Initialized empty tasks in localStorage');
  }
  if (!localStorage.getItem('todolist_notes')) {
    localStorage.setItem('todolist_notes', JSON.stringify([]));
    console.log('Initialized notes in localStorage');
  }
  
  // Check and migrate tasks on page load
  await checkAndMigrateTasks();
  
  // Don't auto-initialize - let TodoList.astro control initialization after sync
  console.log('script.js loaded, waiting for TodoList to initialize...');
});

// Expose initializeApp globally for TodoList.astro
window.initializeApp = initializeApp;

// Make getUiverseTasks async to support Supabase
async function getUiverseTasks() {
  // Try Supabase sync first
  if (window.supabaseSync) {
    try {
      const tasks = await window.supabaseSync.getTasks();
      return tasks;
    } catch (error) {
      console.error('Failed to get tasks from Supabase, falling back to localStorage:', error);
    }
  }
  
  // Fallback to localStorage
  const stored = localStorage.getItem('todolist_uiverse_tasks');
  return stored ? JSON.parse(stored) : [];
}
  
  // Expose globally for subtasks module
  window.getUiverseTasks = getUiverseTasks;

  async function saveUiverseTasks(tasks, skipHistory = false) {
    // Capture current state BEFORE saving new state (for undo)
    if (!skipHistory) {
      const currentTasks = await getUiverseTasks();
      addToHistory(currentTasks);
    }
    
    // Save to localStorage (always as backup)
    localStorage.setItem('todolist_uiverse_tasks', JSON.stringify(tasks));
    
    // Sync to Supabase if available
    if (window.supabaseSync) {
      try {
        await window.supabaseSync.saveTasks(tasks);
      } catch (error) {
        console.error('Failed to sync tasks to Supabase:', error);
      }
    }
    
    // Dispatch custom event to notify other components
    document.dispatchEvent(new CustomEvent('tasksUpdated'));
  }
  
  // Expose globally for subtasks module
  window.saveUiverseTasks = saveUiverseTasks;
  
  // Undo/Redo History System
  const historyStack = [];
  const redoStack = [];
  const MAX_HISTORY = 50;
  
  function addToHistory(tasks) {
    // Clone tasks to avoid reference issues
    const snapshot = JSON.parse(JSON.stringify(tasks));
    historyStack.push(snapshot);
    
    // Limit history size
    if (historyStack.length > MAX_HISTORY) {
      historyStack.shift();
    }
    
    // Clear redo stack when new action performed
    redoStack.length = 0;
    
    updateUndoRedoButtons();
  }
  
  async function undo() {
    console.log('Undo called, history length:', historyStack.length);
    if (historyStack.length < 2) {
      console.log('Not enough history');
      return; // Need at least 2 states
    }
    
    // Move current state to redo stack
    const currentState = historyStack.pop();
    redoStack.push(currentState);
    
    // Restore previous state
    const previousState = historyStack[historyStack.length - 1];
    await saveUiverseTasks(previousState, true); // Skip adding to history
    await loadUiverseTasks();
    updateUndoRedoButtons();
    showToast('Undone', 'info', 1500);
  }
  
  async function redo() {
    console.log('Redo called, redo stack length:', redoStack.length);
    if (redoStack.length === 0) {
      console.log('No redo history');
      return;
    }
    
    // Get state from redo stack
    const nextState = redoStack.pop();
    historyStack.push(nextState);
    
    // Restore state
    await saveUiverseTasks(nextState, true); // Skip adding to history
    await loadUiverseTasks();
    updateUndoRedoButtons();
    showToast('Redone', 'info', 1500);
  }
  
  function updateUndoRedoButtons() {
    const undoBtn = document.getElementById('undo-btn');
    const redoBtn = document.getElementById('redo-btn');
    
    if (undoBtn) {
      undoBtn.disabled = historyStack.length < 2;
    }
    
    if (redoBtn) {
      redoBtn.disabled = redoStack.length === 0;
    }
  }
  
  // Export/Import Functions
  function exportTasks() {
    const tasks = getUiverseTasks();
    const notes = getNotes();
    
    const exportData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      tasks: tasks,
      notes: notes
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `todolist-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showToast('Tasks exported successfully', 'success', 2000);
  }
  
  function importTasks(file) {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const importData = JSON.parse(e.target.result);
        
        // Validate data structure
        if (!importData.tasks || !Array.isArray(importData.tasks)) {
          throw new Error('Invalid file format');
        }
        
        // Confirm before overwriting
        const confirmed = confirm(
          `Import ${importData.tasks.length} tasks${importData.notes ? ` and ${importData.notes.length} notes` : ''}?\n\nThis will replace your current data.`
        );
        
        if (!confirmed) return;
        
        // Import tasks
        saveUiverseTasks(importData.tasks);
        loadUiverseTasks();
        
        // Import notes if available
        if (importData.notes && Array.isArray(importData.notes)) {
          saveNotes(importData.notes);
          loadNotes();
        }
        
        updateStats();
        showToast('Tasks imported successfully', 'success', 2000);
      } catch (error) {
        console.error('Import error:', error);
        showToast('Failed to import: Invalid file format', 'error', 3000);
      }
    };
    
    reader.onerror = () => {
      showToast('Failed to read file', 'error', 2000);
    };
    
    reader.readAsText(file);
  }

  async function getNotes() {
    // Try Supabase sync first
    if (window.supabaseSync) {
      try {
        const notes = await window.supabaseSync.getNotes();
        return notes;
      } catch (error) {
        console.error('Failed to get notes from Supabase, falling back to localStorage:', error);
      }
    }
    
    // Fallback to localStorage
    const stored = localStorage.getItem('todolist_notes');
    return stored ? JSON.parse(stored) : [];
  }

  async function saveNotes(notes) {
    // Save to localStorage (always as backup)
    localStorage.setItem('todolist_notes', JSON.stringify(notes));
    
    // Sync to Supabase if available
    if (window.supabaseSync) {
      try {
        await window.supabaseSync.saveNotes(notes);
      } catch (error) {
        console.error('Failed to sync notes to Supabase:', error);
      }
    }
  }

function initializeApp() {
  console.log('initializeApp called');
  
  // Task elements
  const addTaskBtn = document.getElementById('add-task-btn');
  const newTaskInput = document.getElementById('new-task');

  // Uiverse task elements
  const todayTasksList = document.getElementById('today-tasks-list');
  const tomorrowTasksList = document.getElementById('tomorrow-tasks-list');
  const todayEmptyState = document.getElementById('today-empty-state');
  const tomorrowEmptyState = document.getElementById('tomorrow-empty-state');
  const toggleReorderBtn = document.getElementById('toggle-reorder-btn');

  // Notes elements
  const addNoteBtn = document.getElementById('add-note-btn');
  const noteForm = document.getElementById('note-form');
  const noteTitleInput = document.getElementById('note-title');
  const noteContentInput = document.getElementById('note-content');
  const saveNoteBtn = document.getElementById('save-note-btn');
  const cancelNoteBtn = document.getElementById('cancel-note-btn');
  const notesList = document.getElementById('notes-list');
  const notesEmptyState = document.getElementById('notes-empty-state');

  console.log('DOM elements found:');
  console.log('addTaskBtn:', !!addTaskBtn);
  console.log('todayTasksList:', !!todayTasksList);
  console.log('addNoteBtn:', !!addNoteBtn);
  console.log('notesList:', !!notesList);

  // State
  let showUiverseCompleted = true;
  let reorderMode = false;
  let draggedElement = null;
  let currentFilter = 'all';
  let currentTab = 'active';
  let searchQuery = '';
  
  // Expose for completed grouping module
  window.searchQuery = searchQuery;
  window.currentFilter = currentFilter;
  window.createUiverseTaskElement = createUiverseTaskElement;

  // Check if required elements exist
  if (!addTaskBtn || !newTaskInput) {
    console.log('Task form elements not found - skipping task form initialization (this is normal on notes page)');
    // Don't return - continue initialization
  }

  if (!todayTasksList || !tomorrowTasksList || !todayEmptyState || !tomorrowEmptyState || !toggleReorderBtn) {
    console.log('Task list elements not found - skipping task list initialization (this is normal on notes page)');
    // Don't return - continue initialization
  }

  if (!addNoteBtn || !noteForm || !noteTitleInput || !noteContentInput || !saveNoteBtn || !cancelNoteBtn || !notesList || !notesEmptyState) {
    console.log('Notes elements not found - skipping notes initialization (this is normal on tasks page)');
    // Don't return - continue with task initialization
  }

  // Data management functions

  function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} hours ago`;
    if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)} days ago`;
    
    return date.toLocaleDateString();
  }

  function createUiverseTaskElement(task) {
    const container = document.createElement('li');
    container.className = `sketchy-task-container ${task.completed ? 'completed' : 'active'}`;
    container.dataset.taskId = task.id;
    container.setAttribute('role', 'listitem');
    
    // Make draggable in reorder mode
    if (reorderMode && !task.completed) {
      container.setAttribute('draggable', 'true');
      container.classList.add('draggable');
    }
    
    // Calculate completion time if completed
    let completionTimeHtml = '';
    if (task.completed && task.completedAt) {
      const completedTime = formatDate(task.completedAt);
      completionTimeHtml = `<span class="completion-time">${completedTime}</span>`;
    }
    
    // Priority badge
    const priorityColors = {
      high: 'bg-red-100 text-red-700 border-red-300',
      medium: 'bg-yellow-100 text-yellow-700 border-yellow-300',
      low: 'bg-green-100 text-green-700 border-green-300'
    };
    
    const priorityIcons = {
      high: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
      medium: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>',
      low: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>'
    };
    
    const priorityLabels = {
      high: 'High',
      medium: 'Med',
      low: 'Low'
    };
    
    let priorityBadge = '';
    if (task.priority && task.priority !== 'none') {
      const icon = priorityIcons[task.priority];
      priorityBadge = `<span class="task-badge ${priorityColors[task.priority]}">${icon} ${priorityLabels[task.priority]}</span>`;
    }
    
    // Category badge with SVG icons
    const categoryIcons = {
      work: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>',
      personal: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>',
      shopping: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>',
      health: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>',
      other: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>'
    };
    
    let categoryBadge = '';
    if (task.category) {
      const icon = categoryIcons[task.category] || categoryIcons.other;
      categoryBadge = `<span class="task-badge bg-amber-100 text-amber-700 border-amber-300">${icon} ${task.category}</span>`;
    }
    
    // Drag handle for reorder mode with SVG
    const dragHandleHtml = reorderMode && !task.completed 
      ? '<span class="drag-handle" aria-hidden="true"><svg width="12" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="5" r="1.5"></circle><circle cx="9" cy="12" r="1.5"></circle><circle cx="9" cy="19" r="1.5"></circle><circle cx="15" cy="5" r="1.5"></circle><circle cx="15" cy="12" r="1.5"></circle><circle cx="15" cy="19" r="1.5"></circle></svg></span>' 
      : '';
    
    // Action buttons (edit/delete) - hidden in reorder mode
    const actionButtonsHtml = !reorderMode ? `
      <div class="task-actions">
        <button class="task-action-btn edit-btn" aria-label="Edit task" title="Edit">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
        </button>
        <button class="task-action-btn delete-btn" aria-label="Delete task" title="Delete">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </div>
    ` : '';
    
    // Subtask progress indicator
const progress = window.getSubtaskProgress ? window.getSubtaskProgress(task) : null;
const subtaskProgressHtml = progress ? `
  <span class="subtask-progress">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
    ${progress.completed}/${progress.total}
  </span>
` : '';

// Subtask toggle button
const hasSubtasks = task.subtasks && task.subtasks.length > 0;
const subtaskToggleHtml = hasSubtasks ? `
  <button 
    class="subtask-toggle" 
    onclick="event.stopPropagation(); window.toggleSubtasksVisibility('${task.id}')"
    aria-label="Toggle subtasks"
    title="Toggle subtasks">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polyline points="9 18 15 12 9 6"></polyline>
    </svg>
  </button>
` : '';

container.innerHTML = `
  <div class="task-content">
    <div class="task-main">
    ${subtaskToggleHtml}
      <label class="sketchy-checkbox">
        ${dragHandleHtml}
        <input 
          type="checkbox" 
          ${task.completed ? 'checked' : ''} 
          aria-label="${task.text}"
          aria-checked="${task.completed}"
          ${reorderMode ? 'disabled' : ''}
        />
        <span class="sketchy-checkmark" aria-hidden="true"></span>
        <span class="sketchy-text">${task.text}</span>
      </label>
      ${actionButtonsHtml}
    </div>
    <div class="task-badges">
      ${priorityBadge}
      ${categoryBadge}
      ${subtaskProgressHtml}
      ${completionTimeHtml}
    </div>
  </div>
  ${window.renderSubtasks ? window.renderSubtasks(task, container) : ''}
  ${!reorderMode && !task.completed ? `
    <button 
      class="add-subtask-btn" 
      onclick="window.showAddSubtaskInput('${task.id}')"
      title="Add subtask">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
      </svg>
      <span>Add Subtask</span>
    </button>
  ` : ''}
`;

    // Add drag event listeners
    if (reorderMode && !task.completed) {
      container.addEventListener('dragstart', handleDragStart);
      container.addEventListener('dragend', handleDragEnd);
      container.addEventListener('dragover', handleDragOver);
      container.addEventListener('drop', handleDrop);
      container.addEventListener('dragenter', handleDragEnter);
      container.addEventListener('dragleave', handleDragLeave);
    }

    // Add change event listener for checkbox
    const checkbox = container.querySelector('input[type="checkbox"]');
    checkbox.addEventListener('change', async () => {
      // Disable checkbox during save
      checkbox.disabled = true;
      
      // Show inline spinner
      const checkboxParent = checkbox.parentElement;
      const spinner = document.createElement('div');
      spinner.className = 'inline-spinner';
      spinner.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><circle cx="12" cy="12" r="10" opacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"/></svg>';
      spinner.style.cssText = 'position: absolute; left: 0; top: 50%; transform: translateY(-50%);';
      checkboxParent.style.position = 'relative';
      checkbox.style.opacity = '0';
      checkboxParent.appendChild(spinner);
      
      try {
        const tasks = await getUiverseTasks();
        const taskIndex = tasks.findIndex((t) => t.id === task.id);
        if (taskIndex !== -1) {
          tasks[taskIndex].completed = checkbox.checked;
          tasks[taskIndex].completedAt = checkbox.checked ? new Date().toISOString() : null;
          await saveUiverseTasks(tasks);
          
          // Update ARIA
          checkbox.setAttribute('aria-checked', checkbox.checked);
          
          // Update the container class
          container.className = `sketchy-task-container ${checkbox.checked ? 'completed' : 'active'}`;
          
          // Celebration and toast on completion
          if (checkbox.checked) {
            celebrateTaskCompletion(container);
            showToast('Task completed!', 'success', 2000);
          } else {
            showToast('Task reopened', 'info', 2000);
          }
          
          // Refresh the display
          await loadUiverseTasks();
          updateStats();
        }
      } catch (error) {
        console.error('Failed to toggle task:', error);
        // Revert checkbox on error
        checkbox.checked = !checkbox.checked;
        showToast('Failed to update task', 'error', 3000);
      } finally {
        // Remove spinner and restore checkbox
        spinner.remove();
        checkbox.style.opacity = '1';
        checkbox.disabled = false;
      }
    });
    
    // Edit button
    const editBtn = container.querySelector('.edit-btn');
    if (editBtn) {
      editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        editTask(task.id);
      });
    }
    
    // Delete button
    const deleteBtn = container.querySelector('.delete-btn');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteTask(task.id);
      });
    }
    
    return container;
  }
  
  async function editTask(taskId) {
    const tasks = await getUiverseTasks();
    const task = tasks.find(t => t.id === taskId);
    
    if (!task) return;
    
    // Open modal
    const modal = document.getElementById('edit-task-modal');
    const textInput = document.getElementById('edit-task-text');
    const prioritySelect = document.getElementById('edit-task-priority');
    const categorySelect = document.getElementById('edit-task-category');
    const form = document.getElementById('edit-task-form');
    
    if (!modal || !textInput || !prioritySelect || !categorySelect || !form) return;
    
    // Populate form
    textInput.value = task.text;
    prioritySelect.value = task.priority || 'none';
    categorySelect.value = task.category || '';
    
    // Show modal
    modal.classList.remove('hidden');
    textInput.focus();
    
    // Handle form submit
    const handleSubmit = async (e) => {
      e.preventDefault();
      
      const newText = textInput.value.trim();
      const newPriority = prioritySelect.value;
      const newCategory = categorySelect.value;
      
      if (newText) {
        const loadingToast = window.showLoadingToast('Updating task...');
        
        try {
          task.text = newText;
          task.priority = newPriority;
          task.category = newCategory;
          
          await saveUiverseTasks(tasks);
          await loadUiverseTasks();
          
          window.hideLoadingToast(loadingToast, 'Task updated', 'success', 2000);
          
          // Close modal
          modal.classList.add('hidden');
          form.removeEventListener('submit', handleSubmit);
        } catch (error) {
          console.error('Failed to update task:', error);
          window.hideLoadingToast(loadingToast, 'Failed to update task', 'error', 3000);
        }
      }
    };
    
    // Handle close
    const handleClose = () => {
      modal.classList.add('hidden');
      form.removeEventListener('submit', handleSubmit);
    };
    
    form.addEventListener('submit', handleSubmit);
    
    document.getElementById('close-edit-modal')?.addEventListener('click', handleClose, { once: true });
    document.getElementById('cancel-edit-btn')?.addEventListener('click', handleClose, { once: true });
    
    // Close on overlay click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        handleClose();
      }
    }, { once: true });
    
    // Close on Escape
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        handleClose();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);
  }
  
  async function deleteTask(taskId) {
    const tasks = await getUiverseTasks();
    const task = tasks.find(t => t.id === taskId);
    
    if (!task) return;
    
    showConfirmModal(
      `Delete task: "${task.text}"? This cannot be undone.`,
      async () => {
        const loadingToast = window.showLoadingToast('Deleting task...');
        
        try {
          const filtered = tasks.filter(t => t.id !== taskId);
          await saveUiverseTasks(filtered);
          await loadUiverseTasks();
          updateStats();
          
          window.hideLoadingToast(loadingToast, 'Task deleted', 'success', 2000);
        } catch (error) {
          console.error('Failed to delete task:', error);
          window.hideLoadingToast(loadingToast, 'Failed to delete task', 'error', 3000);
        }
      }
    );
  }

  function createNoteElement(note) {
    const noteDiv = document.createElement('div');
    noteDiv.className = 'note-item border border-amber-200 rounded-lg p-4 bg-amber-25 group';
    noteDiv.dataset.noteId = note.id;
    
    const formattedDate = formatDate(note.createdAt);
    const formattedContent = note.content.replace(/\n/g, '<br>');
    
    noteDiv.innerHTML = `
      <div class="flex justify-between items-start mb-2">
        <h4 class="font-bold text-amber-900 handwritten flex-1">
          ${note.title}
        </h4>
        <div class="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button class="edit-note text-amber-600 hover:text-amber-800 transition-colors p-1" title="Edit note">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </button>
          <button class="delete-note text-red-600 hover:text-red-800 transition-colors p-1" title="Delete note">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>
      <p class="text-amber-700 handwritten whitespace-pre-line">
        ${formattedContent}
      </p>
      <div class="text-xs text-amber-600 mt-2">
        <span class="note-timestamp">${formattedDate}</span>
      </div>
    `;

    // Add edit functionality
    const editBtn = noteDiv.querySelector('.edit-note');
    editBtn.addEventListener('click', () => editNote(note));

    // Add delete functionality
    const deleteBtn = noteDiv.querySelector('.delete-note');
    deleteBtn.addEventListener('click', () => {
      window.showConfirmModal(
        `Delete note: "${note.title}"? This cannot be undone.`,
        async () => {
          const loadingToast = window.showLoadingToast('Deleting note...');
          
          try {
            const notes = await getNotes();
            const filteredNotes = notes.filter((n) => n.id !== note.id);
            await saveNotes(filteredNotes);
            noteDiv.remove();
            checkNotesEmpty();
            
            window.hideLoadingToast(loadingToast, 'Note deleted', 'info', 2000);
          } catch (error) {
            console.error('Failed to delete note:', error);
            window.hideLoadingToast(loadingToast, 'Failed to delete note', 'error', 3000);
          }
        }
      );
    });
    
    return noteDiv;
  }

  // Edit note function
  async function editNote(note) {
    const modal = document.createElement('div');
    modal.className = 'confirm-modal-overlay';
    modal.innerHTML = `
      <div class="confirm-modal" style="max-width: 600px;">
        <h3 class="confirm-modal-title">Edit Note</h3>
        <form id="edit-note-form" style="margin-bottom: 1.5rem;">
          <div style="margin-bottom: 1rem;">
            <input 
              type="text" 
              id="edit-note-title"
              value="${note.title.replace(/"/g, '&quot;')}"
              class="w-full px-4 py-3 border-2 border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-amber-900 handwritten text-lg"
              placeholder="Note title..."
              required
            />
          </div>
          <textarea 
            id="edit-note-content"
            rows="6"
            class="w-full px-4 py-3 border-2 border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-amber-900 handwritten resize-none"
            placeholder="Note content..."
            required
          >${note.content}</textarea>
        </form>
        <div class="confirm-modal-actions">
          <button type="button" class="confirm-modal-btn confirm-modal-cancel" id="cancel-edit-note">Cancel</button>
          <button type="submit" form="edit-note-form" class="confirm-modal-btn" style="background: #d97706; color: white; border-color: #d97706;">Save Changes</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    const titleInput = modal.querySelector('#edit-note-title');
    const contentInput = modal.querySelector('#edit-note-content');
    const form = modal.querySelector('#edit-note-form');
    const cancelBtn = modal.querySelector('#cancel-edit-note');
    
    setTimeout(() => {
      modal.classList.add('show');
      titleInput.focus();
      titleInput.select();
    }, 10);
    
    const close = () => {
      modal.classList.remove('show');
      setTimeout(() => modal.remove(), 200);
    };
    
    const handleSubmit = async (e) => {
      e.preventDefault();
      
      const newTitle = titleInput.value.trim();
      const newContent = contentInput.value.trim();
      
      if (newTitle && newContent && (newTitle !== note.title || newContent !== note.content)) {
        close();
        
        const loadingToast = window.showLoadingToast('Updating note...');
        
        try {
          const notes = await getNotes();
          const noteIndex = notes.findIndex(n => n.id === note.id);
          
          if (noteIndex !== -1) {
            notes[noteIndex].title = newTitle;
            notes[noteIndex].content = newContent;
            
            await saveNotes(notes);
            await loadNotes();
            
            window.hideLoadingToast(loadingToast, 'Note updated', 'success', 2000);
          }
        } catch (error) {
          console.error('Failed to update note:', error);
          window.hideLoadingToast(loadingToast, 'Failed to update note', 'error', 3000);
        }
      } else {
        close();
      }
    };
    
    form.addEventListener('submit', handleSubmit);
    cancelBtn.addEventListener('click', close);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) close();
    });
    
    const handleKey = (e) => {
      if (e.key === 'Escape') {
        close();
        document.removeEventListener('keydown', handleKey);
      }
    };
    document.addEventListener('keydown', handleKey);
  }

  // Helper: create completed separator with buttons
  function createCompletedSeparator() {
    const separator = document.createElement('li');
    separator.className = 'task-separator';
    separator.setAttribute('role', 'separator');
    separator.setAttribute('aria-label', 'Completed tasks');
    
    const wrapper = document.createElement('div');
    wrapper.className = 'flex items-center justify-between gap-2 my-4';
    
    const leftSection = document.createElement('div');
    leftSection.className = 'flex items-center gap-2 flex-1';
    leftSection.innerHTML = '<div class="flex-1 h-px bg-amber-200"></div><span class="text-xs text-amber-600 handwritten px-2">Completed</span><div class="flex-1 h-px bg-amber-200"></div>';
    
    const buttonSection = document.createElement('div');
    buttonSection.className = 'flex gap-2';
    
    const hideBtn = document.createElement('button');
    hideBtn.type = 'button';
    hideBtn.className = 'text-xs text-amber-600 hover:text-amber-800 handwritten transition-colors px-3 py-1.5 rounded-md hover:bg-amber-50';
    hideBtn.textContent = showUiverseCompleted ? 'Hide Done' : 'Show Done';
    hideBtn.setAttribute('aria-label', 'Toggle completed tasks visibility');
    hideBtn.setAttribute('aria-pressed', !showUiverseCompleted);
    hideBtn.onclick = () => {
      showUiverseCompleted = !showUiverseCompleted;
      loadUiverseTasks();
    };
    
    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.className = 'text-xs px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-md handwritten transition-colors';
    clearBtn.textContent = 'Clear Done';
    clearBtn.setAttribute('aria-label', 'Clear all completed tasks');
    clearBtn.onclick = async () => {
      if (confirm('Clear all completed tasks?')) {
        const tasks = await getUiverseTasks();
        const activeTasks = tasks.filter(t => !t.completed);
        await saveUiverseTasks(activeTasks);
        await loadUiverseTasks();
        showToast('Completed tasks cleared', 'success');
      }
    };
    
    buttonSection.appendChild(hideBtn);
    buttonSection.appendChild(clearBtn);
    
    wrapper.appendChild(leftSection);
    wrapper.appendChild(buttonSection);
    separator.appendChild(wrapper);
    
    return separator;
  }

  async function loadUiverseTasks() {
  const tasks = await getUiverseTasks();
  todayTasksList.innerHTML = '';
  tomorrowTasksList.innerHTML = '';
  
  // Apply filters to root tasks only (subtasks render inside parent)
  let filteredTasks = tasks;
  
  // Search filter
  if (searchQuery) {
    filteredTasks = filteredTasks.filter(task => 
      task.text.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }
  
  // Priority filter
  if (currentFilter !== 'all') {
    filteredTasks = filteredTasks.filter(task => task.priority === currentFilter);
  }
  
  // Separate by completion status
  const activeTasks = filteredTasks.filter(t => !t.completed);
  
  // Render active tasks (Today/Tomorrow)
  const todayActive = activeTasks.filter(t => t.dueDate === 'today');
  const tomorrowActive = activeTasks.filter(t => t.dueDate === 'tomorrow');
  
  todayActive.forEach(task => {
    const taskElement = createUiverseTaskElement(task);
    todayTasksList.appendChild(taskElement);
  });
  
  tomorrowActive.forEach(task => {
    const taskElement = createUiverseTaskElement(task);
    tomorrowTasksList.appendChild(taskElement);
  });
  
  // Render completed tasks (grouped by date)
  if (window.renderGroupedCompletedTasks) {
    await window.renderGroupedCompletedTasks();
  }
  
  // Update empty states
  checkTasksEmpty();
}
  
  // Expose globally for subtasks module
  window.loadUiverseTasks = loadUiverseTasks;

  async function loadNotes() {
    const notes = await getNotes();
    notesList.innerHTML = '';
    
    notes.forEach((note) => {
      const noteElement = createNoteElement(note);
      notesList.appendChild(noteElement);
    });
    
    checkNotesEmpty();
  }

  async function addTask() {
    const taskText = newTaskInput.value.trim();
    const selectedDate = document.querySelector('input[name="task-date"]:checked');
    const priority = document.getElementById('task-priority')?.value || 'none';
    const category = document.getElementById('task-category')?.value || '';
    
    if (taskText && selectedDate) {
      const loadingToast = window.showLoadingToast('Adding task...');
      
      try {
        const tasks = await getUiverseTasks();
        const newTask = {
          id: generateUUID(),
          text: taskText,
          completed: false,
          createdAt: new Date().toISOString(),
          completedAt: null,
          dueDate: selectedDate.value,
          priority: priority,
          category: category
        };
        tasks.push(newTask);
        await saveUiverseTasks(tasks);
        newTaskInput.value = '';
        
        window.hideLoadingToast(loadingToast, 'Task added!', 'success', 2000);
      
        // Reset form
        const todayRadio = document.querySelector('input[name="task-date"][value="today"]');
        if (todayRadio) todayRadio.checked = true;
        if (document.getElementById('task-priority')) document.getElementById('task-priority').value = 'none';
        if (document.getElementById('task-category')) document.getElementById('task-category').value = '';
        
        await loadUiverseTasks();
        updateStats();
      } catch (error) {
        console.error('Failed to add task:', error);
        window.hideLoadingToast(loadingToast, 'Failed to add task', 'error', 3000);
      }
    }
  }

  async function checkTasksEmpty() {
  const tasks = await getUiverseTasks();
  const activeTasks = tasks.filter(t => !t.completed);
  const completedTasks = tasks.filter(t => t.completed);
  
  const todayActive = activeTasks.filter(t => t.dueDate === 'today');
  const tomorrowActive = activeTasks.filter(t => t.dueDate === 'tomorrow');
  const todayCompleted = completedTasks.filter(t => t.dueDate === 'today');
  const tomorrowCompleted = completedTasks.filter(t => t.dueDate === 'tomorrow');
  
  // Today empty state (active)
  const todayEmpty = document.getElementById('today-empty-state');
  if (todayEmpty) {
    todayEmpty.classList.toggle('hidden', todayActive.length > 0);
  }
  
  // Tomorrow empty state (active)
  const tomorrowEmpty = document.getElementById('tomorrow-empty-state');
  if (tomorrowEmpty) {
    tomorrowEmpty.classList.toggle('hidden', tomorrowActive.length > 0);
  }
  
  // Active tab empty state
  const activeEmpty = document.getElementById('active-empty-state');
  if (activeEmpty) {
    activeEmpty.classList.toggle('hidden', activeTasks.length > 0);
  }
  
  // Completed today empty state
  const completedTodayEmpty = document.getElementById('completed-today-empty');
  if (completedTodayEmpty) {
    completedTodayEmpty.classList.toggle('hidden', todayCompleted.length > 0);
  }
  
  // Completed tomorrow empty state
  const completedTomorrowEmpty = document.getElementById('completed-tomorrow-empty');
  if (completedTomorrowEmpty) {
    completedTomorrowEmpty.classList.toggle('hidden', tomorrowCompleted.length > 0);
  }
  
  // Completed tab empty state
  const completedEmpty = document.getElementById('completed-empty-state');
  if (completedEmpty) {
    completedEmpty.classList.toggle('hidden', completedTasks.length > 0);
  }
}

  
  async function updateStats() {
    const tasks = await getUiverseTasks();
    
    // Helper to count all tasks including subtasks
    function countAllTasks(taskList) {
      let total = 0;
      let completed = 0;
      
      taskList.forEach(task => {
        // Count main task
        total++;
        if (task.completed) completed++;
        
        // Count subtasks
        if (task.subtasks && task.subtasks.length > 0) {
          task.subtasks.forEach(subtask => {
            total++;
            if (subtask.completed) completed++;
          });
        }
      });
      
      return { total, completed };
    }
    
    const counts = countAllTasks(tasks);
    const active = counts.total - counts.completed;
    
    const totalEl = document.getElementById('total-tasks-count');
    const activeEl = document.getElementById('active-tasks-count');
    const completedEl = document.getElementById('completed-tasks-count');
    
    if (totalEl) totalEl.textContent = counts.total;
    if (activeEl) activeEl.textContent = active;
    if (completedEl) completedEl.textContent = counts.completed;
  }
  
  // Expose globally for subtasks module
  window.updateStats = updateStats;
  
  function handleSearch(e) {
    searchQuery = e.target.value.trim();
    window.searchQuery = searchQuery; // Update global
    loadUiverseTasks();
  }
  
  function handleFilterClick(e) {
    const filterBtn = e.target.closest('.filter-btn');
    if (!filterBtn) return;
    
    // Remove active from all
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    
    // Add active to clicked
    filterBtn.classList.add('active');
    
    // Set filter
    currentFilter = filterBtn.dataset.filter;
    window.currentFilter = currentFilter; // Expose globally for completed grouping
    loadUiverseTasks();
  }
  
  
  function toggleReorderMode() {
    reorderMode = !reorderMode;
    const btn = toggleReorderBtn;
    btn.textContent = reorderMode ? 'Done' : 'Reorder';
    btn.setAttribute('aria-pressed', reorderMode);
    btn.classList.toggle('active', reorderMode);
    loadUiverseTasks();
    
    if (reorderMode) {
      showToast('Drag tasks to reorder', 'info', 2000);
    }
  }
  
  // Drag and drop handlers
  function handleDragStart(e) {
    draggedElement = e.target;
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target.innerHTML);
  }
  
  function handleDragEnd(e) {
    e.target.classList.remove('dragging');
    
    // Remove drag-over class from all items
    document.querySelectorAll('.drag-over').forEach(item => {
      item.classList.remove('drag-over');
    });
  }
  
  function handleDragOver(e) {
    if (e.preventDefault) {
      e.preventDefault();
    }
    e.dataTransfer.dropEffect = 'move';
    return false;
  }
  
  function handleDragEnter(e) {
    const container = e.target.closest('.sketchy-task-container');
    if (container && container !== draggedElement) {
      container.classList.add('drag-over');
    }
  }
  
  function handleDragLeave(e) {
    const container = e.target.closest('.sketchy-task-container');
    if (container && !container.contains(e.relatedTarget)) {
      container.classList.remove('drag-over');
    }
  }
  
  async function handleDrop(e) {
    if (e.stopPropagation) {
      e.stopPropagation();
    }
    e.preventDefault();
    
    const targetContainer = e.target.closest('.sketchy-task-container');
    
    if (draggedElement && targetContainer && draggedElement !== targetContainer) {
      const draggedId = draggedElement.dataset.taskId;
      const targetId = targetContainer.dataset.taskId;
      
      const loadingToast = window.showLoadingToast('Reordering task...');
      
      try {
        // Get tasks (hierarchical from Supabase)
        const tasks = await getUiverseTasks();
        
        // Flatten to work with reorder (only root tasks, not subtasks)
        const rootTasks = tasks.filter(t => !t.parent_id);
        
        const draggedTask = rootTasks.find(t => t.id === draggedId);
        const targetTask = rootTasks.find(t => t.id === targetId);
        
        if (draggedTask && targetTask && draggedTask.dueDate === targetTask.dueDate) {
          const draggedIndex = rootTasks.indexOf(draggedTask);
          const targetIndex = rootTasks.indexOf(targetTask);
          
          // Remove dragged task and insert at target position
          rootTasks.splice(draggedIndex, 1);
          const newTargetIndex = rootTasks.indexOf(targetTask);
          rootTasks.splice(newTargetIndex, 0, draggedTask);
          
          // Save reordered root tasks (Supabase will handle hierarchy)
          await saveUiverseTasks(rootTasks);
          await loadUiverseTasks();
          
          window.hideLoadingToast(loadingToast, 'Task reordered', 'success', 1500);
        } else {
          window.hideLoadingToast(loadingToast);
        }
      } catch (error) {
        console.error('Failed to reorder task:', error);
        window.hideLoadingToast(loadingToast, 'Failed to reorder task', 'error', 3000);
      }
    }
    
    return false;
  }

  function showNoteForm() {
    noteForm.classList.remove('hidden');
    addNoteBtn.style.display = 'none';
    noteTitleInput.focus();
  }

  function hideNoteForm() {
    noteForm.classList.add('hidden');
    addNoteBtn.style.display = 'block';
    noteTitleInput.value = '';
    noteContentInput.value = '';
  }

  async function saveNote() {
    const title = noteTitleInput.value.trim();
    const content = noteContentInput.value.trim();
    
    if (title && content) {
      const loadingToast = window.showLoadingToast('Saving note...');
      
      try {
        const notes = await getNotes();
        const newNote = {
          id: generateUUID(),
          title: title,
          content: content,
          createdAt: new Date().toISOString()
        };
        notes.unshift(newNote);
        await saveNotes(notes);
        
        const noteElement = createNoteElement(newNote);
        notesList.insertBefore(noteElement, notesList.firstChild);
        hideNoteForm();
        checkNotesEmpty();
        
        window.hideLoadingToast(loadingToast, 'Note saved!', 'success', 2000);
      } catch (error) {
        console.error('Failed to save note:', error);
        window.hideLoadingToast(loadingToast, 'Failed to save note', 'error', 3000);
      }
    }
  }

  function checkNotesEmpty() {
    const notes = notesList.querySelectorAll('.note-item');
    if (notes.length === 0) {
      notesEmptyState.classList.remove('hidden');
    } else {
      notesEmptyState.classList.add('hidden');
    }
  }

  // Event listeners (only if task elements exist)
  if (addTaskBtn) {
    addTaskBtn.addEventListener('click', addTask);
  }
  
  if (toggleReorderBtn) {
    toggleReorderBtn.addEventListener('click', toggleReorderMode);
  }
  
  // Tab switching
  const activeTab = document.getElementById('active-tab');
  const completedTab = document.getElementById('completed-tab');
  const activeView = document.getElementById('active-tasks-view');
  const completedView = document.getElementById('completed-tasks-view');

  if (activeTab && completedTab && activeView && completedView) {
    activeTab.addEventListener('click', () => {
      currentTab = 'active';
      activeTab.classList.add('active');
      completedTab.classList.remove('active');
      activeView.classList.add('active');
      completedView.classList.remove('active');
    });
    
    completedTab.addEventListener('click', () => {
      currentTab = 'completed';
      completedTab.classList.add('active');
      activeTab.classList.remove('active');
      completedView.classList.add('active');
      activeView.classList.remove('active');
    });
  }
  
  // Undo/Redo buttons
  const undoBtn = document.getElementById('undo-btn');
  const redoBtn = document.getElementById('redo-btn');
  
  console.log('Undo button:', undoBtn);
  console.log('Redo button:', redoBtn);
  console.log('History stack length:', historyStack.length);
  
  if (undoBtn) undoBtn.addEventListener('click', undo);
  if (redoBtn) redoBtn.addEventListener('click', redo);
  
  // Export/Import buttons
  const exportBtn = document.getElementById('export-btn');
  const importBtn = document.getElementById('import-btn');
  const importFileInput = document.getElementById('import-file-input');
  
  if (exportBtn) {
    exportBtn.addEventListener('click', exportTasks);
  }
  
  if (importBtn && importFileInput) {
    importBtn.addEventListener('click', () => {
      importFileInput.click();
    });
    
    importFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        importTasks(file);
        // Reset input so same file can be imported again
        e.target.value = '';
      }
    });
  }
  
  // Keyboard shortcuts for undo/redo/export/import
  document.addEventListener('keydown', (e) => {
    // Ctrl+Z: Undo
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      const activeElement = document.activeElement;
      if (activeElement?.tagName !== 'INPUT' && activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        undo();
      }
    }
    
    // Ctrl+Y or Ctrl+Shift+Z: Redo
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
      const activeElement = document.activeElement;
      if (activeElement?.tagName !== 'INPUT' && activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        redo();
      }
    }
    
    // Ctrl+E: Export
    if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
      e.preventDefault();
      exportTasks();
    }
    
    // Ctrl+I: Import
    if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
      e.preventDefault();
      importFileInput?.click();
    }
    
    // Ctrl+Shift+C: Clear completed
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'C') {
      e.preventDefault();
      (async () => {
        const tasks = await getUiverseTasks();
        const completedCount = tasks.filter(t => t.completed).length;
        
        if (completedCount === 0) {
          showToast('No completed tasks to clear', 'info', 2000);
          return;
        }
        
        const confirmed = confirm(`Clear ${completedCount} completed task${completedCount > 1 ? 's' : ''}?`);
        if (confirmed) {
          const activeTasks = tasks.filter(t => !t.completed);
          await saveUiverseTasks(activeTasks);
          await loadUiverseTasks();
          showToast(`Cleared ${completedCount} task${completedCount > 1 ? 's' : ''}`, 'success', 2000);
        }
      })();
    }
  });
  
  // Search
  const searchInput = document.getElementById('task-search');
  if (searchInput) {
    searchInput.addEventListener('input', handleSearch);
  }
  
  // Filter buttons
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', handleFilterClick);
  });
  
  if (newTaskInput) {
    newTaskInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        addTask();
      }
    });
  }

  // Notes event listeners (only if notes elements exist)
  if (addNoteBtn && noteForm && noteTitleInput && noteContentInput && saveNoteBtn && cancelNoteBtn && notesList && notesEmptyState) {
    addNoteBtn.addEventListener('click', showNoteForm);
    cancelNoteBtn.addEventListener('click', hideNoteForm);
    saveNoteBtn.addEventListener('click', saveNote);

    // Save note on Ctrl+Enter
    noteContentInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter' && e.ctrlKey) {
        saveNote();
      }
    });
    
    // Load notes
    loadNotes();
  }

  // Load data on page load
  if (todayTasksList && tomorrowTasksList) {
    loadUiverseTasks();
  }
  
  // Initialize history with current state
  // Don't call addToHistory here - it will be called on first action
  // Just set initial button states
  updateUndoRedoButtons();
  updateStats();
  
  // Expose migration function globally for testing
  window.migrateTasks = async function() {
    const migrated = await migrateTomorrowToToday();
    if (migrated) {
      alert('Tasks migrated! Tomorrow tasks moved to Today.');
    } else {
      alert('No tasks to migrate.');
    }
  };
}

// === Toast Notification System ===
let toastContainer = null;

function getToastContainer() {
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    document.body.appendChild(toastContainer);
  }
  return toastContainer;
}

function showToast(message, type = 'success', duration = 3000) {
  const container = getToastContainer();
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  toast.setAttribute('aria-atomic', 'true');
  
  const icons = {
    success: '✓',
    error: '✕',
    info: 'i',
    loading: '<svg class="loading-spinner" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><circle cx="12" cy="12" r="10" opacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"/></svg>'
  };
  
  const ariaLabels = {
    success: 'Success notification',
    error: 'Error notification',
    info: 'Information notification',
    loading: 'Loading notification'
  };
  
  toast.setAttribute('aria-label', ariaLabels[type] || ariaLabels.info);
  
  const icon = icons[type] || icons.info;
  const iconHtml = type === 'loading' ? icon : `<div class="toast-icon" aria-hidden="true">${icon}</div>`;
  
  toast.innerHTML = `
    <div style="display: flex; align-items: center; gap: 0.75rem; padding-left: 0.5rem;">
      ${iconHtml}
      <span class="toast-message">${message}</span>
    </div>
  `;
  
  container.appendChild(toast);
  
  // Don't auto-hide loading toasts
  if (type !== 'loading' && duration > 0) {
    setTimeout(() => {
      toast.classList.add('toast-hide');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }
  
  return toast; // Return toast element for manual control
}

// Show loading toast
window.showLoadingToast = function(message = 'Loading...') {
  return showToast(message, 'loading', 0);
};

// Hide loading toast and show result
window.hideLoadingToast = function(loadingToast, message, type = 'success', duration = 3000) {
  if (loadingToast && loadingToast.parentNode) {
    loadingToast.classList.add('toast-hide');
    setTimeout(() => loadingToast.remove(), 300);
  }
  
  if (message) {
    setTimeout(() => showToast(message, type, duration), 200);
  }
};

// === Task Completion Celebration ===
function celebrateTaskCompletion(element) {
  const rect = element.getBoundingClientRect();
  const colors = ['#fbbf24', '#f59e0b', '#d97706', '#16a34a'];
  
  for (let i = 0; i < 8; i++) {
    const confetti = document.createElement('div');
    confetti.className = 'task-complete-celebration';
    confetti.style.cssText = `
      position: fixed;
      left: ${rect.left + rect.width / 2}px;
      top: ${rect.top + rect.height / 2}px;
      width: 8px;
      height: 8px;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      border-radius: 50%;
      z-index: 9999;
    `;
    
    document.body.appendChild(confetti);
    
    const angle = (Math.PI * 2 * i) / 8;
    const velocity = 50 + Math.random() * 50;
    const tx = Math.cos(angle) * velocity;
    const ty = Math.sin(angle) * velocity;
    
    confetti.style.setProperty('--tx', `${tx}px`);
    confetti.style.setProperty('--ty', `${ty}px`);
    
    confetti.animate([
      { transform: 'translate(0, 0) scale(1)', opacity: 1 },
      { transform: `translate(${tx}px, ${ty}px) scale(0)`, opacity: 0 }
    ], {
      duration: 600,
      easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)'
    });
    
    setTimeout(() => confetti.remove(), 600);
  }
  
  // Bounce checkmark
  const checkmark = element.querySelector('.sketchy-checkmark');
  if (checkmark) {
    checkmark.classList.add('checkmark-bounce');
    setTimeout(() => checkmark.classList.remove('checkmark-bounce'), 400);
  }
}

// Expose toast globally
window.showToast = showToast;
window.showToast = showToast;

// === Overdue Tasks Alert ===
function showOverdueAlert(overdueTasks) {
  const modal = document.getElementById('overdue-alert-modal');
  const tasksList = document.getElementById('overdue-tasks-list');
  const closeBtn = document.getElementById('close-overdue-alert');
  
  if (!modal || !tasksList || !closeBtn) return;
  
  // Build task list
  tasksList.innerHTML = overdueTasks.map(task => `
    <div class="flex items-start gap-2 mb-2 p-2 bg-white rounded border border-amber-200">
      <span class="text-amber-600 mt-0.5">•</span>
      <span class="flex-1 text-amber-900 handwritten text-sm">${task.text}</span>
    </div>
  `).join('');
  
  // Show modal
  modal.classList.remove('hidden');
  
  // Close handler
  const handleClose = () => {
    modal.classList.add('hidden');
  };
  
  closeBtn.addEventListener('click', handleClose, { once: true });
  
  // Close on overlay click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      handleClose();
    }
  }, { once: true });
  
  // Close on Escape
  const handleEscape = (e) => {
    if (e.key === 'Escape') {
      handleClose();
      document.removeEventListener('keydown', handleEscape);
    }
  };
  document.addEventListener('keydown', handleEscape);
}