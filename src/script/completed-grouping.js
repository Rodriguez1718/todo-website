// Completed tasks grouping by time period

(function() {
  'use strict';

  let currentPeriod = 'day';

  // Format date based on period
  function formatGroupHeader(date, period) {
    const d = new Date(date);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    switch (period) {
      case 'day':
        if (d >= today) return 'Today';
        if (d >= yesterday && d < today) return 'Yesterday';
        return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
      
      case 'week':
        const weekStart = new Date(d);
        weekStart.setDate(d.getDate() - d.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        
        if (weekStart <= now && weekEnd >= now) return 'This Week';
        
        return `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
      
      case 'month':
        const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        
        if (monthStart.getTime() === thisMonthStart.getTime()) return 'This Month';
        
        return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      
      case 'year':
        if (d.getFullYear() === now.getFullYear()) return 'This Year';
        return d.getFullYear().toString();
      
      default:
        return d.toLocaleDateString();
    }
  }

  // Get group key for a date
  function getGroupKey(date, period) {
    const d = new Date(date);
    
    switch (period) {
      case 'day':
        return d.toDateString();
      
      case 'week':
        const weekStart = new Date(d);
        weekStart.setDate(d.getDate() - d.getDay());
        return weekStart.toDateString();
      
      case 'month':
        return `${d.getFullYear()}-${d.getMonth()}`;
      
      case 'year':
        return d.getFullYear().toString();
      
      default:
        return d.toDateString();
    }
  }

  // Group tasks by completion date
  window.groupCompletedTasks = function(tasks, period = 'day') {
    const groups = {};
    
    tasks.forEach(task => {
      if (!task.completed || !task.completedAt) return;
      
      const key = getGroupKey(task.completedAt, period);
      
      if (!groups[key]) {
        groups[key] = {
          header: formatGroupHeader(task.completedAt, period),
          date: new Date(task.completedAt),
          tasks: []
        };
      }
      
      groups[key].tasks.push(task);
    });
    
    // Sort groups by date (newest first)
    const sortedGroups = Object.values(groups).sort((a, b) => b.date - a.date);
    
    // Sort tasks within each group by completion time (newest first)
    sortedGroups.forEach(group => {
      group.tasks.sort((a, b) => {
        const timeA = new Date(a.completedAt).getTime();
        const timeB = new Date(b.completedAt).getTime();
        return timeB - timeA;
      });
    });
    
    return sortedGroups;
  };

  // Flatten tasks including subtasks
  function flattenTasks(tasks) {
    const flat = [];
    
    function flatten(taskList) {
      taskList.forEach(task => {
        flat.push(task);
        if (task.subtasks && task.subtasks.length > 0) {
          flatten(task.subtasks);
        }
      });
    }
    
    flatten(tasks);
    return flat;
  }

  // Render grouped completed tasks
  window.renderGroupedCompletedTasks = async function() {
    const container = document.getElementById('completed-tasks-grouped');
    if (!container) return;
    
    container.innerHTML = '';
    
    const tasks = await window.getUiverseTasks();
    // Only get root tasks (no parent_id) - subtasks stay nested
    const rootTasks = tasks.filter(t => !t.parent_id);
    const completedTasks = rootTasks.filter(t => t.completed);
    
    // Apply filters
    let filteredTasks = completedTasks;
    
    // Search filter
    const searchQuery = window.searchQuery || '';
    if (searchQuery) {
      filteredTasks = filteredTasks.filter(task => 
        task.text.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Priority filter
    const currentFilter = window.currentFilter || 'all';
    if (currentFilter !== 'all') {
      filteredTasks = filteredTasks.filter(task => task.priority === currentFilter);
    }
    
    const groups = window.groupCompletedTasks(filteredTasks, currentPeriod);
    
    if (groups.length === 0) {
      document.getElementById('completed-empty-state')?.classList.remove('hidden');
      return;
    }
    
    document.getElementById('completed-empty-state')?.classList.add('hidden');
    
    groups.forEach((group, index) => {
      const groupDiv = document.createElement('div');
      groupDiv.className = 'completed-group';
      
      const header = document.createElement('button');
      header.className = 'completed-group-header';
      header.setAttribute('type', 'button');
      header.setAttribute('aria-expanded', 'true');
      header.innerHTML = `
        <div class="flex items-center gap-2">
          <svg class="chevron-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
          <span>${group.header}</span>
        </div>
        <span class="completed-group-count">${group.tasks.length}</span>
      `;
      
      const tasksList = document.createElement('ul');
      tasksList.className = 'space-y-2 completed-tasks-list';
      tasksList.setAttribute('role', 'list');
      tasksList.style.display = 'block'; // Start expanded
      
      group.tasks.forEach(task => {
        const taskElement = window.createUiverseTaskElement(task);
        tasksList.appendChild(taskElement);
      });
      
      // Toggle collapse/expand
      header.addEventListener('click', () => {
        const isExpanded = header.getAttribute('aria-expanded') === 'true';
        header.setAttribute('aria-expanded', !isExpanded);
        tasksList.style.display = isExpanded ? 'none' : 'block';
        header.classList.toggle('collapsed', isExpanded);
      });
      });
      
      groupDiv.appendChild(header);
      groupDiv.appendChild(tasksList);
      container.appendChild(groupDiv);
    });
  };

  // Handle period filter clicks
  function setupPeriodFilters() {
    const filterBtns = document.querySelectorAll('.time-filter-btn');
    
    filterBtns.forEach(btn => {
      btn.addEventListener('click', async () => {
        const period = btn.dataset.period;
        
        // Update active state
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Update period and re-render
        currentPeriod = period;
        await window.renderGroupedCompletedTasks();
      });
    });
  }

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupPeriodFilters);
  } else {
    setupPeriodFilters();
  }

  console.log('Completed grouping module loaded');
})();
