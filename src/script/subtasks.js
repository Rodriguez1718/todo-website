// Subtask management module
// Add this script after script.js in your HTML

(function() {
  'use strict';

  // UUID generator
  function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // Add subtask to parent task
  window.addSubtask = async function(parentId, subtaskText) {
    const tasks = await window.getUiverseTasks();
    const parentTask = tasks.find(t => t.id === parentId);
    
    if (!parentTask) return;
    
    const subtask = {
      id: generateUUID(),
      text: subtaskText,
      completed: false,
      createdAt: new Date().toISOString(),
      completedAt: null,
      dueDate: parentTask.dueDate || 'today',
      priority: 'none',
      category: parentTask.category || '',
      parentId: parentId,
      order: (parentTask.subtasks || []).length
    };
    
    if (!parentTask.subtasks) {
      parentTask.subtasks = [];
    }
    
    parentTask.subtasks.push(subtask);
    await window.saveUiverseTasks(tasks);
    await window.loadUiverseTasks();
    if (window.updateStats) window.updateStats();
    window.showToast('Subtask added', 'success', 1500);
  };

  // Toggle subtask completion
  window.toggleSubtask = async function(parentId, subtaskId) {
    const tasks = await window.getUiverseTasks();
    const parentTask = tasks.find(t => t.id === parentId);
    
    if (!parentTask || !parentTask.subtasks) return;
    
    const subtask = parentTask.subtasks.find(st => st.id === subtaskId);
    if (!subtask) return;
    
    subtask.completed = !subtask.completed;
    subtask.completedAt = subtask.completed ? new Date().toISOString() : null;
    
    await window.saveUiverseTasks(tasks);
    await window.loadUiverseTasks();
    if (window.updateStats) window.updateStats();
    
    if (subtask.completed) {
      window.showToast('Subtask completed!', 'success', 1500);
    }
  };

  // Delete subtask
  window.deleteSubtask = async function(parentId, subtaskId) {
    const tasks = await window.getUiverseTasks();
    const parentTask = tasks.find(t => t.id === parentId);
    
    if (!parentTask || !parentTask.subtasks) return;
    
    parentTask.subtasks = parentTask.subtasks.filter(st => st.id !== subtaskId);
    
    await window.saveUiverseTasks(tasks);
    await window.loadUiverseTasks();
    if (window.updateStats) window.updateStats();
    window.showToast('Subtask deleted', 'info', 1500);
  };

  // Get subtask progress
  window.getSubtaskProgress = function(task) {
    if (!task.subtasks || task.subtasks.length === 0) {
      return null;
    }
    
    const completed = task.subtasks.filter(st => st.completed).length;
    const total = task.subtasks.length;
    
    return { completed, total };
  };

  // Render subtasks for a task
  window.renderSubtasks = function(task, container) {
    if (!task.subtasks || task.subtasks.length === 0) {
      return '';
    }
    
    const subtasksHtml = task.subtasks.map(subtask => `
      <div class="subtask-item" data-subtask-id="${subtask.id}">
        <label class="flex items-center gap-2 cursor-pointer">
          <input 
            type="checkbox" 
            ${subtask.completed ? 'checked' : ''}
            onchange="window.toggleSubtask('${task.id}', '${subtask.id}')"
            class="w-4 h-4 text-amber-600 focus:ring-amber-500 focus:ring-2 cursor-pointer"
          />
          <span class="flex-1 text-sm handwritten ${subtask.completed ? 'line-through opacity-60' : ''}">${subtask.text}</span>
          <button 
            onclick="window.deleteSubtask('${task.id}', '${subtask.id}')"
            class="opacity-0 group-hover:opacity-100 text-red-600 hover:text-red-800 transition-opacity"
            title="Delete subtask">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </label>
      </div>
    `).join('');
    
    return `
      <div class="subtasks-container" id="subtasks-${task.id}">
        ${subtasksHtml}
      </div>
    `;
  };

  // Show add subtask input
  window.showAddSubtaskInput = function(parentId) {
    const container = document.querySelector(`[data-task-id="${parentId}"]`);
    if (!container) return;
    
    // Check if input already exists
    if (container.querySelector('.subtask-input-container')) return;
    
    const inputHtml = `
      <div class="subtask-input-container" style="margin-left: 2.5rem; margin-top: 0.5rem;">
        <div class="flex gap-2">
          <input 
            type="text" 
            class="subtask-input flex-1 px-3 py-2 border-2 border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-amber-900 handwritten text-sm"
            placeholder="Subtask description..."
            id="subtask-input-${parentId}"
          />
          <button 
            onclick="window.saveSubtaskInput('${parentId}')"
            class="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold handwritten text-sm transition-colors">
            Add
          </button>
          <button 
            onclick="window.cancelSubtaskInput('${parentId}')"
            class="px-3 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg font-bold handwritten text-sm transition-colors">
            Cancel
          </button>
        </div>
      </div>
    `;
    
    const addBtn = container.querySelector('.add-subtask-btn');
    if (addBtn) {
      addBtn.insertAdjacentHTML('afterend', inputHtml);
      document.getElementById(`subtask-input-${parentId}`).focus();
    }
  };

  // Save subtask from input
  window.saveSubtaskInput = function(parentId) {
    const input = document.getElementById(`subtask-input-${parentId}`);
    if (!input) return;
    
    const text = input.value.trim();
    if (text) {
      window.addSubtask(parentId, text);
    }
    
    window.cancelSubtaskInput(parentId);
  };

  // Cancel subtask input
  window.cancelSubtaskInput = function(parentId) {
    const container = document.querySelector(`[data-task-id="${parentId}"]`);
    if (!container) return;
    
    const inputContainer = container.querySelector('.subtask-input-container');
    if (inputContainer) {
      inputContainer.remove();
    }
  };

  // Toggle subtasks visibility
  window.toggleSubtasksVisibility = function(taskId) {
    const subtasksContainer = document.getElementById(`subtasks-${taskId}`);
    const toggle = document.querySelector(`[data-task-id="${taskId}"] .subtask-toggle`);
    
    if (subtasksContainer && toggle) {
      const isHidden = subtasksContainer.style.display === 'none';
      subtasksContainer.style.display = isHidden ? 'block' : 'none';
      toggle.classList.toggle('expanded', isHidden);
      
      // Update icon
      const icon = toggle.querySelector('svg');
      if (icon) {
        icon.innerHTML = isHidden 
          ? '<polyline points="6 9 12 15 18 9"></polyline>' // chevron down
          : '<polyline points="9 18 15 12 9 6"></polyline>'; // chevron right
      }
    }
  };

  console.log('Subtasks module loaded');
})();
