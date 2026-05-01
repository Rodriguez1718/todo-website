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

  // Find task recursively (including nested subtasks)
  function findTaskRecursive(tasks, taskId) {
    for (const task of tasks) {
      if (task.id === taskId) return task;
      if (task.subtasks && task.subtasks.length > 0) {
        const found = findTaskRecursive(task.subtasks, taskId);
        if (found) return found;
      }
    }
    return null;
  }

  // Add subtask to parent task
  window.addSubtask = async function(parentId, subtaskText) {
    const loadingToast = window.showLoadingToast('Adding subtask...');
    
    try {
      const tasks = await window.getUiverseTasks();
      const parentTask = findTaskRecursive(tasks, parentId);
      
      if (!parentTask) {
        console.error('Parent task not found:', parentId);
        window.hideLoadingToast(loadingToast, 'Parent task not found', 'error', 3000);
        return;
      }
      
      const subtask = {
        id: generateUUID(),
        text: subtaskText,
        completed: false,
        createdAt: new Date().toISOString(),
        completedAt: null,
        dueDate: parentTask.dueDate || 'today',
        priority: 'none',
        category: parentTask.category || '',
        parent_id: parentId, // Use parent_id for Supabase
        order: (parentTask.subtasks || []).length
      };
      
      if (!parentTask.subtasks) {
        parentTask.subtasks = [];
      }
      
      parentTask.subtasks.push(subtask);
      await window.saveUiverseTasks(tasks);
      await window.loadUiverseTasks();
      if (window.updateStats) window.updateStats();
      
      window.hideLoadingToast(loadingToast, 'Subtask added', 'success', 1500);
    } catch (error) {
      console.error('Failed to add subtask:', error);
      window.hideLoadingToast(loadingToast, 'Failed to add subtask', 'error', 3000);
    }
  };

  // Queue for sequential saves
  let saveQueue = Promise.resolve();
  
  // Toggle subtask completion with optimistic update
  window.toggleSubtask = async function(parentId, subtaskId) {
    // Optimistic UI update - instant feedback
    const subtaskElement = document.querySelector(`[data-subtask-id="${subtaskId}"]`);
    if (!subtaskElement) return;
    
    const checkbox = subtaskElement.querySelector('input[type="checkbox"]');
    const textSpan = subtaskElement.querySelector('span.flex-1');
    
    if (!checkbox) return;
    
    const newState = checkbox.checked;
    
    // Update UI immediately
    if (textSpan) {
      if (newState) {
        textSpan.classList.add('line-through', 'opacity-60');
      } else {
        textSpan.classList.remove('line-through', 'opacity-60');
      }
    }
    
    // Add subtle saving indicator
    checkbox.style.opacity = '0.5';
    
    // Queue the save operation
    saveQueue = saveQueue.then(async () => {
      try {
        const tasks = await window.getUiverseTasks();
        const parentTask = findTaskRecursive(tasks, parentId);
        
        if (!parentTask || !parentTask.subtasks) {
          checkbox.style.opacity = '1';
          return;
        }
        
        const subtask = parentTask.subtasks.find(st => st.id === subtaskId);
        if (!subtask) {
          checkbox.style.opacity = '1';
          return;
        }
        
        subtask.completed = newState;
        subtask.completedAt = newState ? new Date().toISOString() : null;
        
        await window.saveUiverseTasks(tasks);
        
        // Update progress indicator
        const parentElement = document.querySelector(`[data-task-id="${parentId}"]`);
        if (parentElement && parentTask.subtasks) {
          const completed = parentTask.subtasks.filter(st => st.completed).length;
          const total = parentTask.subtasks.length;
          const progressIndicator = parentElement.querySelector('.subtask-progress');
          if (progressIndicator) {
            progressIndicator.textContent = `${completed}/${total}`;
          }
        }
        
        // Update stats
        if (window.updateStats) window.updateStats();
        
        // Restore opacity
        checkbox.style.opacity = '1';
        
        // Show toast only after save completes
        if (newState) {
          window.showToast('Subtask completed!', 'success', 1500);
        } else {
          window.showToast('Subtask reopened', 'info', 1500);
        }
      } catch (error) {
        console.error('Failed to toggle subtask:', error);
        
        // Revert UI on error
        checkbox.checked = !newState;
        checkbox.style.opacity = '1';
        if (textSpan) {
          if (!newState) {
            textSpan.classList.add('line-through', 'opacity-60');
          } else {
            textSpan.classList.remove('line-through', 'opacity-60');
          }
        }
        
        window.showToast('Failed to update subtask', 'error', 3000);
      }
    });
  };

  // Edit subtask
  window.editSubtask = async function(parentId, subtaskId) {
    const tasks = await window.getUiverseTasks();
    const parentTask = findTaskRecursive(tasks, parentId);
    
    if (!parentTask || !parentTask.subtasks) return;
    
    const subtask = parentTask.subtasks.find(st => st.id === subtaskId);
    if (!subtask) return;
    
    // Create modal
    const modal = document.createElement('div');
    modal.className = 'confirm-modal-overlay';
    modal.innerHTML = `
      <div class="confirm-modal" style="max-width: 500px;">
        <h3 class="confirm-modal-title">Edit Subtask</h3>
        <form id="edit-subtask-form" style="margin-bottom: 1.5rem;">
          <input 
            type="text" 
            id="edit-subtask-input"
            value="${subtask.text.replace(/"/g, '&quot;')}"
            class="w-full px-4 py-3 border-2 border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-amber-900 handwritten text-lg"
            placeholder="Subtask description..."
            required
          />
        </form>
        <div class="confirm-modal-actions">
          <button type="button" class="confirm-modal-btn confirm-modal-cancel" id="cancel-edit-subtask">Cancel</button>
          <button type="submit" form="edit-subtask-form" class="confirm-modal-btn" style="background: #d97706; color: white; border-color: #d97706;">Save</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    const input = modal.querySelector('#edit-subtask-input');
    const form = modal.querySelector('#edit-subtask-form');
    const cancelBtn = modal.querySelector('#cancel-edit-subtask');
    
    setTimeout(() => {
      modal.classList.add('show');
      input.focus();
      input.select();
    }, 10);
    
    const close = () => {
      modal.classList.remove('show');
      setTimeout(() => modal.remove(), 200);
    };
    
    const handleSubmit = async (e) => {
      e.preventDefault();
      
      const newText = input.value.trim();
      
      if (newText && newText !== subtask.text) {
        close();
        
        const loadingToast = window.showLoadingToast('Updating subtask...');
        
        try {
          subtask.text = newText;
          
          await window.saveUiverseTasks(tasks);
          await window.loadUiverseTasks();
          if (window.updateStats) window.updateStats();
          
          window.hideLoadingToast(loadingToast, 'Subtask updated', 'success', 1500);
        } catch (error) {
          console.error('Failed to edit subtask:', error);
          window.hideLoadingToast(loadingToast, 'Failed to update subtask', 'error', 3000);
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
  };

  // Delete subtask
  window.deleteSubtask = async function(parentId, subtaskId) {
    const tasks = await window.getUiverseTasks();
    const parentTask = findTaskRecursive(tasks, parentId);
    
    if (!parentTask || !parentTask.subtasks) return;
    
    const subtask = parentTask.subtasks.find(st => st.id === subtaskId);
    if (!subtask) return;
    
    window.showConfirmModal(
      `Delete subtask: "${subtask.text}"? This cannot be undone.`,
      async () => {
        const loadingToast = window.showLoadingToast('Deleting subtask...');
        
        try {
          parentTask.subtasks = parentTask.subtasks.filter(st => st.id !== subtaskId);
          
          await window.saveUiverseTasks(tasks);
          await window.loadUiverseTasks();
          if (window.updateStats) window.updateStats();
          
          window.hideLoadingToast(loadingToast, 'Subtask deleted', 'info', 1500);
        } catch (error) {
          console.error('Failed to delete subtask:', error);
          window.hideLoadingToast(loadingToast, 'Failed to delete subtask', 'error', 3000);
        }
      }
    );
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
      <div class="subtask-item group" data-subtask-id="${subtask.id}">
        <label class="flex items-center gap-2 cursor-pointer">
          <input 
            type="checkbox" 
            ${subtask.completed ? 'checked' : ''}
            onchange="window.toggleSubtask('${task.id}', '${subtask.id}')"
            class="w-4 h-4 text-amber-600 focus:ring-amber-500 focus:ring-2 cursor-pointer"
          />
          <span class="flex-1 text-sm handwritten ${subtask.completed ? 'line-through opacity-60' : ''}">${subtask.text}</span>
          <div class="subtask-actions opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
            <button 
              onclick="window.editSubtask('${task.id}', '${subtask.id}')"
              class="text-amber-600 hover:text-amber-800 transition-colors"
              title="Edit subtask">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
            <button 
              onclick="window.deleteSubtask('${task.id}', '${subtask.id}')"
              class="text-red-600 hover:text-red-800 transition-colors"
              title="Delete subtask">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
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
