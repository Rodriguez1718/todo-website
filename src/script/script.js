// Sample data (inline since imports don't work in client scripts)
console.log('Script loaded successfully!');
const sampleTasks = [
  {
    id: "1647123456789",
    text: "Buy groceries",
    completed: false,
    createdAt: "2026-03-18T10:30:00.000Z",
    dueDate: "today",
    priority: "medium",
    category: "shopping"
  },
  {
    id: "1647123456790",
    text: "Plan weekend activities",
    completed: true,
    createdAt: "2026-03-18T09:15:00.000Z",
    dueDate: "tomorrow",
    completedAt: "2026-03-18T09:26:18.227Z",
    priority: "low",
    category: "personal"
  },
  {
    id: "1647123456791",
    text: "Finish project presentation",
    completed: true,
    createdAt: "2026-03-18T08:00:00.000Z",
    dueDate: "today",
    priority: "high",
    category: "work"
  },
  {
    id: "1647123456792",
    text: "Call dentist for appointment",
    completed: true,
    createdAt: "2026-03-18T07:45:00.000Z",
    dueDate: "tomorrow",
    completedAt: "2026-03-18T09:26:16.828Z",
    priority: "medium",
    category: "health"
  },
  {
    id: "1773825297017",
    text: "Play tekken",
    completed: true,
    createdAt: "2026-03-18T09:14:57.017Z",
    completedAt: "2026-03-18T09:15:12.517Z",
    dueDate: "today",
    priority: "none",
    category: "personal"
  },
  {
    id: "1773825998012",
    text: "Continue with the final task",
    completed: false,
    createdAt: "2026-03-18T09:26:38.012Z",
    completedAt: null,
    dueDate: "tomorrow",
    priority: "high",
    category: "work"
  }
];

const sampleNotes = [
  {
    id: "1773825896848",
    title: "Gym water",
    content: "Pocari Sweat",
    createdAt: "2026-03-18T09:24:56.848Z"
  },
  {
    id: "1647123456793", 
    title: "Meeting Notes",
    content: "Discuss project timeline\nReview budget allocation\nAssign team responsibilities",
    createdAt: "2026-03-17T10:30:00.000Z"
  },
  {
    id: "1647123456794",
    title: "Weekend Plans",
    content: "Visit the farmer's market\nTry that new restaurant downtown\nFinish reading the book",
    createdAt: "2026-03-17T09:20:00.000Z"
  },
  {
    id: "1647123456795",
    title: "Shopping List",
    content: "Milk\nBread\nEggs\nApples\nChicken breast\nRice",
    createdAt: "2026-03-17T08:10:00.000Z"
  },
  {
    id: "1647123456796",
    title: "Ideas for App",
    content: "Add dark mode toggle\nImplement categories for tasks\nAdd due dates\nCreate export feature",
    createdAt: "2026-03-17T07:30:00.000Z"
  }
];

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

function migrateTomorrowToToday() {
  const tasks = getUiverseTasks();
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
    saveUiverseTasks(updatedTasks);
    console.log('Tasks migrated: Tomorrow tasks moved to Today');
    
    // Refresh the display immediately
    if (typeof loadUiverseTasks === 'function') {
      loadUiverseTasks();
    }
  }
  
  return migrated;
}

function migrateOverdueTasks() {
  const tasks = getUiverseTasks();
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
  
  saveUiverseTasks(updatedTasks);
  console.log(`Migrated ${incompleteTodayTasks.length} overdue tasks to tomorrow`);
  
  return incompleteTodayTasks;
}

function checkAndMigrateTasks() {
  const currentDate = getCurrentDateString();
  const lastCheckDate = getLastCheckDate();
  
  // If this is the first time or if the date has changed
  if (!lastCheckDate || lastCheckDate !== currentDate) {
    // First, migrate incomplete today tasks to tomorrow (overdue)
    const overdueTasks = migrateOverdueTasks();
    
    // Then migrate tomorrow's tasks to today
    migrateTomorrowToToday();
    
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

document.addEventListener('DOMContentLoaded', function() {
  console.log('DOMContentLoaded event fired');
  
  // Initialize localStorage with sample data if empty
  if (!localStorage.getItem('todolist_uiverse_tasks')) {
    localStorage.setItem('todolist_uiverse_tasks', JSON.stringify(sampleTasks));
    console.log('Initialized tasks in localStorage');
  }
  if (!localStorage.getItem('todolist_notes')) {
    localStorage.setItem('todolist_notes', JSON.stringify(sampleNotes));
    console.log('Initialized notes in localStorage');
  }
  
  // Check and migrate tasks on page load
  checkAndMigrateTasks();
  
  // Add a small delay to ensure all components are rendered
  setTimeout(function() {
    console.log('Initializing app after delay');
    initializeApp();
  }, 100);
});

function getUiverseTasks() {
    const stored = localStorage.getItem('todolist_uiverse_tasks');
    return stored ? JSON.parse(stored) : sampleTasks.slice();
  }

  function saveUiverseTasks(tasks) {
    localStorage.setItem('todolist_uiverse_tasks', JSON.stringify(tasks));
    // Dispatch custom event to notify other components
    document.dispatchEvent(new CustomEvent('tasksUpdated'));
  }

  function getNotes() {
    const stored = localStorage.getItem('todolist_notes');
    return stored ? JSON.parse(stored) : sampleNotes.slice();
  }

  function saveNotes(notes) {
    localStorage.setItem('todolist_notes', JSON.stringify(notes));
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
  const uiverseEmptyState = document.getElementById('uiverse-empty-state');
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
  let searchQuery = '';

  // Check if required elements exist
  if (!addTaskBtn || !newTaskInput) {
    console.error('Required form elements not found');
    console.log('addTaskBtn:', addTaskBtn);
    console.log('newTaskInput:', newTaskInput);
    return;
  }

  if (!todayTasksList || !tomorrowTasksList || !todayEmptyState || !tomorrowEmptyState || !uiverseEmptyState || !toggleReorderBtn) {
    console.error('Required Uiverse task DOM elements not found');
    console.log('todayTasksList:', todayTasksList);
    console.log('tomorrowTasksList:', tomorrowTasksList);
    console.log('todayEmptyState:', todayEmptyState);
    console.log('tomorrowEmptyState:', tomorrowEmptyState);
    console.log('uiverseEmptyState:', uiverseEmptyState);
    console.log('toggleReorderBtn:', toggleReorderBtn);
    return;
  }

  if (!addNoteBtn || !noteForm || !noteTitleInput || !noteContentInput || !saveNoteBtn || !cancelNoteBtn || !notesList || !notesEmptyState) {
    console.error('Required notes DOM elements not found');
    console.log('addNoteBtn:', addNoteBtn);
    console.log('noteForm:', noteForm);
    console.log('noteTitleInput:', noteTitleInput);
    console.log('noteContentInput:', noteContentInput);
    console.log('saveNoteBtn:', saveNoteBtn);
    console.log('cancelNoteBtn:', cancelNoteBtn);
    console.log('notesList:', notesList);
    console.log('notesEmptyState:', notesEmptyState);
    return;
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
    
    const priorityLabels = {
      high: 'High',
      medium: 'Med',
      low: 'Low'
    };
    
    let priorityBadge = '';
    if (task.priority && task.priority !== 'none') {
      priorityBadge = `<span class="task-badge ${priorityColors[task.priority]}">${priorityLabels[task.priority]}</span>`;
    }
    
    // Category badge
    const categoryIcons = {
      work: '💼',
      personal: '👤',
      shopping: '🛒',
      health: '❤️',
      other: '📌'
    };
    
    let categoryBadge = '';
    if (task.category) {
      const icon = categoryIcons[task.category] || '📌';
      categoryBadge = `<span class="task-badge bg-amber-100 text-amber-700 border-amber-300">${icon} ${task.category}</span>`;
    }
    
    // Drag handle for reorder mode
    const dragHandleHtml = reorderMode && !task.completed 
      ? '<span class="drag-handle" aria-hidden="true">⋮⋮</span>' 
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
    
    // New sketchy checkbox design
    container.innerHTML = `
      <div class="task-content">
        <div class="task-main">
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
          ${completionTimeHtml}
        </div>
      </div>
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
    checkbox.addEventListener('change', () => {
      const tasks = getUiverseTasks();
      const taskIndex = tasks.findIndex((t) => t.id === task.id);
      if (taskIndex !== -1) {
        tasks[taskIndex].completed = checkbox.checked;
        tasks[taskIndex].completedAt = checkbox.checked ? new Date().toISOString() : null;
        saveUiverseTasks(tasks);
        
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
        loadUiverseTasks();
        updateStats();
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
  
  function editTask(taskId) {
    const tasks = getUiverseTasks();
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
    const handleSubmit = (e) => {
      e.preventDefault();
      
      const newText = textInput.value.trim();
      const newPriority = prioritySelect.value;
      const newCategory = categorySelect.value;
      
      if (newText) {
        task.text = newText;
        task.priority = newPriority;
        task.category = newCategory;
        
        saveUiverseTasks(tasks);
        loadUiverseTasks();
        showToast('Task updated', 'success', 2000);
        
        // Close modal
        modal.classList.add('hidden');
        form.removeEventListener('submit', handleSubmit);
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
  
  function deleteTask(taskId) {
    const tasks = getUiverseTasks();
    const task = tasks.find(t => t.id === taskId);
    
    if (!task) return;
    
    const confirmed = confirm(`Delete task: "${task.text}"?\n\nThis cannot be undone.`);
    
    if (confirmed) {
      const filtered = tasks.filter(t => t.id !== taskId);
      saveUiverseTasks(filtered);
      loadUiverseTasks();
      updateStats();
      showToast('Task deleted', 'success', 2000);
    }
  }

  function createNoteElement(note) {
    const noteDiv = document.createElement('div');
    noteDiv.className = 'note-item border border-amber-200 rounded-lg p-4 bg-amber-25';
    noteDiv.dataset.noteId = note.id;
    
    const formattedDate = formatDate(note.createdAt);
    const formattedContent = note.content.replace(/\n/g, '<br>');
    
    noteDiv.innerHTML = `
      <div class="flex justify-between items-start mb-2">
        <h4 class="font-bold text-amber-900 handwritten">
          ${note.title}
        </h4>
        <button class="delete-note text-amber-600 hover:text-amber-800 text-sm">✕</button>
      </div>
      <p class="text-amber-700 handwritten whitespace-pre-line">
        ${formattedContent}
      </p>
      <div class="text-xs text-amber-600 mt-2">
        <span class="note-timestamp">${formattedDate}</span>
      </div>
    `;

    // Add delete functionality
    const deleteBtn = noteDiv.querySelector('.delete-note');
    deleteBtn.addEventListener('click', () => {
      const notes = getNotes();
      const filteredNotes = notes.filter((n) => n.id !== note.id);
      saveNotes(filteredNotes);
      noteDiv.remove();
      checkNotesEmpty();
      
      // Show toast
      showToast('Note deleted', 'info', 2000);
    });
    
    return noteDiv;
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
    clearBtn.onclick = () => {
      if (confirm('Clear all completed tasks?')) {
        const tasks = getUiverseTasks();
        const activeTasks = tasks.filter(t => !t.completed);
        saveUiverseTasks(activeTasks);
        loadUiverseTasks();
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

  function loadUiverseTasks() {
    const tasks = getUiverseTasks();
    todayTasksList.innerHTML = '';
    tomorrowTasksList.innerHTML = '';
    
    // Apply filters
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
    
    // Separate tasks by date
    const todayTasks = filteredTasks.filter((task) => task.dueDate === 'today');
    const tomorrowTasks = filteredTasks.filter((task) => task.dueDate === 'tomorrow');
    
    // Smart categorization: active first, then completed (sorted by completion time)
    function categorizeTasks(taskList) {
      const active = taskList.filter(t => !t.completed);
      const completed = taskList.filter(t => t.completed)
        .sort((a, b) => {
          // Sort completed by completion time (newest first)
          const timeA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
          const timeB = b.completedAt ? new Date(b.completedAt).getTime() : 0;
          return timeB - timeA;
        });
      
      return { active, completed };
    }
    
    // Load today's tasks with smart categorization
    const todayCategorized = categorizeTasks(todayTasks);
    
    if (todayCategorized.active.length > 0) {
      todayCategorized.active.forEach((task) => {
        const taskElement = createUiverseTaskElement(task);
        todayTasksList.appendChild(taskElement);
      });
    }
    
    // Always show separator if completed tasks exist
    if (todayCategorized.completed.length > 0) {
      // Add separator if there are active tasks
      if (todayCategorized.active.length > 0) {
        const separator = createCompletedSeparator();
        todayTasksList.appendChild(separator);
      }
      
      // Only show completed tasks if not hidden
      if (showUiverseCompleted) {
        todayCategorized.completed.forEach((task) => {
          const taskElement = createUiverseTaskElement(task);
          todayTasksList.appendChild(taskElement);
        });
      }
    }
    
    // Load tomorrow's tasks with smart categorization
    const tomorrowCategorized = categorizeTasks(tomorrowTasks);
    
    if (tomorrowCategorized.active.length > 0) {
      tomorrowCategorized.active.forEach((task) => {
        const taskElement = createUiverseTaskElement(task);
        tomorrowTasksList.appendChild(taskElement);
      });
    }
    
    // Always show separator if completed tasks exist
    if (tomorrowCategorized.completed.length > 0) {
      // Add separator if there are active tasks
      if (tomorrowCategorized.active.length > 0) {
        const separator = createCompletedSeparator();
        tomorrowTasksList.appendChild(separator);
      }
      
      // Only show completed tasks if not hidden
      if (showUiverseCompleted) {
        tomorrowCategorized.completed.forEach((task) => {
          const taskElement = createUiverseTaskElement(task);
          tomorrowTasksList.appendChild(taskElement);
        });
      }
    }
    
    checkUiverseEmpty();
  }

  function loadNotes() {
    const notes = getNotes();
    notesList.innerHTML = '';
    
    notes.forEach((note) => {
      const noteElement = createNoteElement(note);
      notesList.appendChild(noteElement);
    });
    
    checkNotesEmpty();
  }

  function addTask() {
    const taskText = newTaskInput.value.trim();
    const selectedDate = document.querySelector('input[name="task-date"]:checked');
    const priority = document.getElementById('task-priority')?.value || 'none';
    const category = document.getElementById('task-category')?.value || '';
    
    if (taskText && selectedDate) {
      const tasks = getUiverseTasks();
      const newTask = {
        id: Date.now().toString(),
        text: taskText,
        completed: false,
        createdAt: new Date().toISOString(),
        completedAt: null,
        dueDate: selectedDate.value,
        priority: priority,
        category: category
      };
      tasks.push(newTask);
      saveUiverseTasks(tasks);
      newTaskInput.value = '';
      
      // Reset form
      const todayRadio = document.querySelector('input[name="task-date"][value="today"]');
      if (todayRadio) todayRadio.checked = true;
      if (document.getElementById('task-priority')) document.getElementById('task-priority').value = 'none';
      if (document.getElementById('task-category')) document.getElementById('task-category').value = '';
      
      loadUiverseTasks();
      updateStats();
      
      // Show success toast
      showToast(`Task added to ${selectedDate.value}!`, 'success', 2000);
    }
  }

  function checkUiverseEmpty() {
    const todayTasks = todayTasksList.querySelectorAll('.sketchy-task-container');
    const tomorrowTasks = tomorrowTasksList.querySelectorAll('.sketchy-task-container');
    
    // Show/hide individual empty states
    if (todayTasks.length === 0) {
      todayEmptyState.classList.remove('hidden');
    } else {
      todayEmptyState.classList.add('hidden');
    }
    
    if (tomorrowTasks.length === 0) {
      tomorrowEmptyState.classList.remove('hidden');
    } else {
      tomorrowEmptyState.classList.add('hidden');
    }
    
    // Show overall empty state only if both sections are empty
    if (todayTasks.length === 0 && tomorrowTasks.length === 0) {
      uiverseEmptyState.classList.remove('hidden');
    } else {
      uiverseEmptyState.classList.add('hidden');
    }
  }

  
  function updateStats() {
    const tasks = getUiverseTasks();
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const active = total - completed;
    
    const totalEl = document.getElementById('total-tasks-count');
    const activeEl = document.getElementById('active-tasks-count');
    const completedEl = document.getElementById('completed-tasks-count');
    
    if (totalEl) totalEl.textContent = total;
    if (activeEl) activeEl.textContent = active;
    if (completedEl) completedEl.textContent = completed;
  }
  
  function handleSearch(e) {
    searchQuery = e.target.value.trim();
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
  
  function handleDrop(e) {
    if (e.stopPropagation) {
      e.stopPropagation();
    }
    e.preventDefault();
    
    const targetContainer = e.target.closest('.sketchy-task-container');
    
    if (draggedElement && targetContainer && draggedElement !== targetContainer) {
      const draggedId = draggedElement.dataset.taskId;
      const targetId = targetContainer.dataset.taskId;
      
      // Get tasks and reorder
      const tasks = getUiverseTasks();
      const draggedTask = tasks.find(t => t.id === draggedId);
      const targetTask = tasks.find(t => t.id === targetId);
      
      if (draggedTask && targetTask && draggedTask.dueDate === targetTask.dueDate) {
        const draggedIndex = tasks.indexOf(draggedTask);
        const targetIndex = tasks.indexOf(targetTask);
        
        // Remove dragged task and insert at target position
        tasks.splice(draggedIndex, 1);
        const newTargetIndex = tasks.indexOf(targetTask);
        tasks.splice(newTargetIndex, 0, draggedTask);
        
        saveUiverseTasks(tasks);
        loadUiverseTasks();
        showToast('Task reordered', 'success', 1500);
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

  function saveNote() {
    const title = noteTitleInput.value.trim();
    const content = noteContentInput.value.trim();
    
    if (title && content) {
      const notes = getNotes();
      const newNote = {
        id: Date.now().toString(),
        title: title,
        content: content,
        createdAt: new Date().toISOString()
      };
      notes.unshift(newNote);
      saveNotes(notes);
      
      const noteElement = createNoteElement(newNote);
      notesList.insertBefore(noteElement, notesList.firstChild);
      hideNoteForm();
      checkNotesEmpty();
      
      // Show success toast
      showToast('Note saved!', 'success', 2000);
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

  // Event listeners
  addTaskBtn.addEventListener('click', addTask);
  toggleReorderBtn.addEventListener('click', toggleReorderMode);
  
  // Search
  const searchInput = document.getElementById('task-search');
  if (searchInput) {
    searchInput.addEventListener('input', handleSearch);
  }
  
  // Filter buttons
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', handleFilterClick);
  });
  
  newTaskInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      addTask();
    }
  });

  // Notes event listeners
  addNoteBtn.addEventListener('click', showNoteForm);
  cancelNoteBtn.addEventListener('click', hideNoteForm);
  saveNoteBtn.addEventListener('click', saveNote);

  // Save note on Ctrl+Enter
  noteContentInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter' && e.ctrlKey) {
      saveNote();
    }
  });

  // Load data on page load
  loadUiverseTasks();
  loadNotes();
  updateStats();
  
  // Expose migration function globally for testing
  window.migrateTasks = function() {
    const migrated = migrateTomorrowToToday();
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
    info: 'i'
  };
  
  const ariaLabels = {
    success: 'Success notification',
    error: 'Error notification',
    info: 'Information notification'
  };
  
  toast.setAttribute('aria-label', ariaLabels[type] || ariaLabels.info);
  
  toast.innerHTML = `
    <div style="display: flex; align-items: center; gap: 0.75rem; padding-left: 0.5rem;">
      <div class="toast-icon" aria-hidden="true">${icons[type] || icons.info}</div>
      <span class="toast-message">${message}</span>
    </div>
  `;
  
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('toast-hide');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

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