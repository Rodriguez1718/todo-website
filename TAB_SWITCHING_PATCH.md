# Tab Switching Implementation

## Changes Made
1. ✅ Updated `ToDo.astro` with tab UI
2. ✅ Added tab styles to `global.css`

## Manual Script.js Updates Required

### Step 1: Add Tab State Variable

Find the variable declarations section (around line 300-400) and add:

```javascript
let currentTab = 'active'; // Track current tab
```

### Step 2: Update `loadUiverseTasks()` Function

Find `function loadUiverseTasks()` (around line 867) and modify to separate active/completed:

**Replace the entire function with:**

```javascript
function loadUiverseTasks() {
  const tasks = getUiverseTasks();
  todayTasksList.innerHTML = '';
  tomorrowTasksList.innerHTML = '';
  const completedTasksList = document.getElementById('completed-tasks-list');
  if (completedTasksList) completedTasksList.innerHTML = '';
  
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
  
  // Separate by completion status
  const activeTasks = filteredTasks.filter(t => !t.completed);
  const completedTasks = filteredTasks.filter(t => t.completed)
    .sort((a, b) => {
      const timeA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
      const timeB = b.completedAt ? new Date(b.completedAt).getTime() : 0;
      return timeB - timeA;
    });
  
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
  
  // Render completed tasks
  if (completedTasksList) {
    completedTasks.forEach(task => {
      const taskElement = createUiverseTaskElement(task);
      completedTasksList.appendChild(taskElement);
    });
  }
  
  // Update empty states
  checkTasksEmpty();
}
```

### Step 3: Update `checkUiverseEmpty()` Function

Find `function checkUiverseEmpty()` and replace with:

```javascript
function checkTasksEmpty() {
  const tasks = getUiverseTasks();
  const activeTasks = tasks.filter(t => !t.completed);
  const completedTasks = tasks.filter(t => t.completed);
  
  const todayActive = activeTasks.filter(t => t.dueDate === 'today');
  const tomorrowActive = activeTasks.filter(t => t.dueDate === 'tomorrow');
  
  // Today empty state
  const todayEmpty = document.getElementById('today-empty-state');
  if (todayEmpty) {
    todayEmpty.classList.toggle('hidden', todayActive.length > 0);
  }
  
  // Tomorrow empty state
  const tomorrowEmpty = document.getElementById('tomorrow-empty-state');
  if (tomorrowEmpty) {
    tomorrowEmpty.classList.toggle('hidden', tomorrowActive.length > 0);
  }
  
  // Active tab empty state
  const activeEmpty = document.getElementById('active-empty-state');
  if (activeEmpty) {
    activeEmpty.classList.toggle('hidden', activeTasks.length > 0);
  }
  
  // Completed tab empty state
  const completedEmpty = document.getElementById('completed-empty-state');
  if (completedEmpty) {
    completedEmpty.classList.toggle('hidden', completedTasks.length > 0);
  }
}
```

### Step 4: Add Tab Switching Logic

Find the `initializeApp()` function and add this code **after** the existing event listeners (around line 400-500):

```javascript
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
```

### Step 5: Update Function Calls

Find all instances of `checkUiverseEmpty()` and replace with `checkTasksEmpty()`:

- In `loadUiverseTasks()` (already done in Step 2)
- In `addTask()`
- In `deleteTask()`
- Any other places it's called

## Testing

1. Refresh the page
2. Add some tasks
3. Complete some tasks
4. Click "Completed" tab - should show only completed tasks
5. Click "Active" tab - should show Today/Tomorrow sections
6. Empty states should work for both tabs

## Features

- ✅ Active tab: Shows Today/Tomorrow sections
- ✅ Completed tab: Shows all completed tasks (sorted by completion time)
- ✅ Smooth tab switching with animated indicator
- ✅ Separate empty states for each tab
- ✅ Filters work on both tabs
- ✅ Search works on both tabs
