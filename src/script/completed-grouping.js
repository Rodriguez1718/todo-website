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

  // Render grouped completed tasks
  window.renderGroupedCompletedTasks = function() {
    const container = document.getElementById('completed-tasks-grouped');
    if (!container) return;
    
    container.innerHTML = '';
    
    const tasks = window.getUiverseTasks();
    const completedTasks = tasks.filter(t => t.completed);
    
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
    
    groups.forEach(group => {
      const groupDiv = document.createElement('div');
      groupDiv.className = 'completed-group';
      
      const header = document.createElement('div');
      header.className = 'completed-group-header';
      header.innerHTML = `
        <span>${group.header}</span>
        <span class="completed-group-count">${group.tasks.length}</span>
      `;
      
      const tasksList = document.createElement('ul');
      tasksList.className = 'space-y-2';
      tasksList.setAttribute('role', 'list');
      
      group.tasks.forEach(task => {
        const taskElement = window.createUiverseTaskElement(task);
        tasksList.appendChild(taskElement);
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
      btn.addEventListener('click', () => {
        const period = btn.dataset.period;
        
        // Update active state
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Update period and re-render
        currentPeriod = period;
        window.renderGroupedCompletedTasks();
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
