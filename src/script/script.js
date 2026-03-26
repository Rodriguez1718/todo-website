// Sample data (inline since imports don't work in client scripts)
console.log('Script loaded successfully!');
const sampleTasks = [
  {
    id: "1647123456789",
    text: "Buy groceries",
    completed: false,
    createdAt: "2026-03-18T10:30:00.000Z",
    dueDate: "today"
  },
  {
    id: "1647123456790",
    text: "Plan weekend activities",
    completed: true,
    createdAt: "2026-03-18T09:15:00.000Z",
    dueDate: "tomorrow",
    completedAt: "2026-03-18T09:26:18.227Z"
  },
  {
    id: "1647123456791",
    text: "Finish project presentation",
    completed: true,
    createdAt: "2026-03-18T08:00:00.000Z",
    dueDate: "today"
  },
  {
    id: "1647123456792",
    text: "Call dentist for appointment",
    completed: true,
    createdAt: "2026-03-18T07:45:00.000Z",
    dueDate: "tomorrow",
    completedAt: "2026-03-18T09:26:16.828Z"
  },
  {
    id: "1773825297017",
    text: "Play tekken",
    completed: true,
    createdAt: "2026-03-18T09:14:57.017Z",
    completedAt: "2026-03-18T09:15:12.517Z",
    dueDate: "today"
  },
  {
    id: "1773825998012",
    text: "Continue with the final task",
    completed: false,
    createdAt: "2026-03-18T09:26:38.012Z",
    completedAt: null,
    dueDate: "tomorrow"
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

function checkAndMigrateTasks() {
  const currentDate = getCurrentDateString();
  const lastCheckDate = getLastCheckDate();
  
  // If this is the first time or if the date has changed
  if (!lastCheckDate || lastCheckDate !== currentDate) {
    // Migrate tomorrow's tasks to today
    migrateTomorrowToToday();
    
    // Update the last check date
    setLastCheckDate();
    
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
  const toggleUiverseCompletedBtn = document.getElementById('toggle-uiverse-completed-btn');

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

  // Check if required elements exist
  if (!addTaskBtn || !newTaskInput) {
    console.error('Required form elements not found');
    console.log('addTaskBtn:', addTaskBtn);
    console.log('newTaskInput:', newTaskInput);
    return;
  }

  if (!todayTasksList || !tomorrowTasksList || !todayEmptyState || !tomorrowEmptyState || !uiverseEmptyState || !toggleUiverseCompletedBtn) {
    console.error('Required Uiverse task DOM elements not found');
    console.log('todayTasksList:', todayTasksList);
    console.log('tomorrowTasksList:', tomorrowTasksList);
    console.log('todayEmptyState:', todayEmptyState);
    console.log('tomorrowEmptyState:', tomorrowEmptyState);
    console.log('uiverseEmptyState:', uiverseEmptyState);
    console.log('toggleUiverseCompletedBtn:', toggleUiverseCompletedBtn);
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
    const container = document.createElement('div');
    container.className = `sketchy-task-container ${task.completed ? 'completed' : 'active'}`;
    container.dataset.taskId = task.id;
    
    // New sketchy checkbox design
    container.innerHTML = `
      <label class="sketchy-checkbox">
        <input type="checkbox" ${task.completed ? 'checked' : ''} />
        <span class="sketchy-checkmark"></span>
        <span class="sketchy-text">${task.text}</span>
      </label>
    `;

    // Add change event listener for checkbox
    const checkbox = container.querySelector('input[type="checkbox"]');
    checkbox.addEventListener('change', () => {
      const tasks = getUiverseTasks();
      const taskIndex = tasks.findIndex((t) => t.id === task.id);
      if (taskIndex !== -1) {
        tasks[taskIndex].completed = checkbox.checked;
        tasks[taskIndex].completedAt = checkbox.checked ? new Date().toISOString() : null;
        saveUiverseTasks(tasks);
        
        // Update the container class
        container.className = `sketchy-task-container ${checkbox.checked ? 'completed' : 'active'}`;
        
        // Refresh the display
        loadUiverseTasks();
      }
    });
    
    return container;
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
    });
    
    return noteDiv;
  }

  function loadUiverseTasks() {
    const tasks = getUiverseTasks();
    todayTasksList.innerHTML = '';
    tomorrowTasksList.innerHTML = '';
    
    // Filter tasks based on showUiverseCompleted state
    const filteredTasks = showUiverseCompleted ? tasks : tasks.filter((task) => !task.completed);
    
    // Separate tasks by date
    const todayTasks = filteredTasks.filter((task) => task.dueDate === 'today');
    const tomorrowTasks = filteredTasks.filter((task) => task.dueDate === 'tomorrow');
    
    // Load today's tasks
    todayTasks.forEach((task) => {
      const taskElement = createUiverseTaskElement(task);
      todayTasksList.appendChild(taskElement);
    });
    
    // Load tomorrow's tasks
    tomorrowTasks.forEach((task) => {
      const taskElement = createUiverseTaskElement(task);
      tomorrowTasksList.appendChild(taskElement);
    });
    
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
    
    if (taskText && selectedDate) {
      const tasks = getUiverseTasks();
      const newTask = {
        id: Date.now().toString(),
        text: taskText,
        completed: false,
        createdAt: new Date().toISOString(),
        completedAt: null,
        dueDate: selectedDate.value
      };
      tasks.push(newTask);
      saveUiverseTasks(tasks);
      newTaskInput.value = '';
      const todayRadio = document.querySelector('input[name="task-date"][value="today"]');
      if (todayRadio) todayRadio.checked = true;
      loadUiverseTasks();
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

  function toggleUiverseCompletedTasks() {
    showUiverseCompleted = !showUiverseCompleted;
    toggleUiverseCompletedBtn.textContent = showUiverseCompleted ? 'Hide Completed' : 'Show Completed';
    loadUiverseTasks();
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
  toggleUiverseCompletedBtn.addEventListener('click', toggleUiverseCompletedTasks);
  
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