// Supabase sync module for tasks and notes
import { supabase, auth, tasks as taskOps, notes as noteOps } from '../lib/supabase';

let currentUser = null;
let syncEnabled = false;

// Initialize sync system
export async function initializeSync() {
  try {
    const { data } = await auth.getSession();
    const session = data.session;
    
    if (session) {
      currentUser = session.user;
      syncEnabled = true;
      console.log('Supabase sync enabled for user:', currentUser.id);
      
      // Migrate localStorage data to Supabase on first login
      await migrateLocalStorageToSupabase();
      
      return true;
    } else {
      syncEnabled = false;
      console.log('No session - using localStorage only');
      return false;
    }
  } catch (error) {
    console.error('Failed to initialize sync:', error);
    syncEnabled = false;
    return false;
  }
}

// Migrate localStorage data to Supabase
async function migrateLocalStorageToSupabase() {
  const migrationKey = `supabase_migrated_${currentUser.id}`;
  
  // Check if already migrated
  if (localStorage.getItem(migrationKey)) {
    console.log('Data already migrated for this user');
    return;
  }
  
  try {
    // Migrate tasks
    const localTasks = localStorage.getItem('todolist_uiverse_tasks');
    if (localTasks) {
      const tasks = JSON.parse(localTasks);
      if (tasks.length > 0) {
        console.log(`Migrating ${tasks.length} tasks to Supabase...`);
        
        // Convert localStorage format to Supabase format
        const supabaseTasks = tasks.map(task => ({
          id: task.id,
          user_id: currentUser.id,
          parent_id: task.parent_id || null,
          text: task.text,
          completed: task.completed || false,
          priority: task.priority || 'none',
          category: task.category || '',
          date: task.dueDate || 'today',
          order: 0,
          completed_at: task.completedAt || null,
        }));
        
        // Insert tasks
        const { error } = await supabase
          .from('tasks')
          .insert(supabaseTasks);
        
        if (error) {
          console.error('Failed to migrate tasks:', error);
        } else {
          console.log('Tasks migrated successfully');
        }
      }
    }
    
    // Migrate notes
    const localNotes = localStorage.getItem('todolist_notes');
    if (localNotes) {
      const notes = JSON.parse(localNotes);
      if (notes.length > 0) {
        console.log(`Migrating ${notes.length} notes to Supabase...`);
        
        const supabaseNotes = notes.map(note => ({
          id: note.id,
          user_id: currentUser.id,
          title: note.title,
          content: note.content,
          created_at: note.createdAt,
        }));
        
        const { error } = await supabase
          .from('notes')
          .insert(supabaseNotes);
        
        if (error) {
          console.error('Failed to migrate notes:', error);
        } else {
          console.log('Notes migrated successfully');
        }
      }
    }
    
    // Mark as migrated
    localStorage.setItem(migrationKey, 'true');
    console.log('Migration complete');
  } catch (error) {
    console.error('Migration error:', error);
  }
}

// Get all tasks (from Supabase or localStorage)
export async function getTasks() {
  if (!syncEnabled || !currentUser) {
    // Fallback to localStorage
    const stored = localStorage.getItem('todolist_uiverse_tasks');
    return stored ? JSON.parse(stored) : [];
  }
  
  try {
    const { data, error } = await taskOps.getAll(currentUser.id);
    
    if (error) {
      console.error('Failed to fetch tasks from Supabase:', error);
      // Fallback to localStorage
      const stored = localStorage.getItem('todolist_uiverse_tasks');
      return stored ? JSON.parse(stored) : [];
    }
    
    // Convert Supabase format to app format
    const tasks = data.map(task => ({
      id: task.id,
      text: task.text,
      completed: task.completed,
      priority: task.priority,
      category: task.category,
      dueDate: task.date,
      parent_id: task.parent_id,
      completedAt: task.completed_at,
      createdAt: task.created_at,
      subtasks: [], // Will be populated by organizing tasks
    }));
    
    // Organize tasks with subtasks
    return organizeTasks(tasks);
  } catch (error) {
    console.error('Error getting tasks:', error);
    const stored = localStorage.getItem('todolist_uiverse_tasks');
    return stored ? JSON.parse(stored) : [];
  }
}

// Organize flat task list into hierarchical structure
function organizeTasks(flatTasks) {
  const taskMap = new Map();
  const rootTasks = [];
  
  // First pass: create map
  flatTasks.forEach(task => {
    task.subtasks = [];
    taskMap.set(task.id, task);
  });
  
  // Second pass: organize hierarchy
  flatTasks.forEach(task => {
    if (task.parent_id) {
      const parent = taskMap.get(task.parent_id);
      if (parent) {
        parent.subtasks.push(task);
      } else {
        // Parent not found, treat as root
        rootTasks.push(task);
      }
    } else {
      rootTasks.push(task);
    }
  });
  
  return rootTasks;
}

// Save tasks (to Supabase or localStorage)
export async function saveTasks(tasks) {
  // Always save to localStorage as backup
  localStorage.setItem('todolist_uiverse_tasks', JSON.stringify(tasks));
  
  if (!syncEnabled || !currentUser) {
    return;
  }
  
  try {
    // Flatten tasks (include subtasks)
    const flatTasks = flattenTasks(tasks);
    
    // Get existing tasks from Supabase
    const { data: existingTasks } = await taskOps.getAll(currentUser.id);
    const existingIds = new Set(existingTasks?.map(t => t.id) || []);
    
    // Separate new and existing tasks
    const newTasks = [];
    const updateTasks = [];
    
    flatTasks.forEach(task => {
      const supabaseTask = {
        id: task.id,
        user_id: currentUser.id,
        parent_id: task.parent_id || null,
        text: task.text,
        completed: task.completed || false,
        priority: task.priority || 'none',
        category: task.category || '',
        date: task.dueDate || 'today',
        order: 0,
        completed_at: task.completedAt || null,
      };
      
      if (existingIds.has(task.id)) {
        updateTasks.push(supabaseTask);
      } else {
        newTasks.push(supabaseTask);
      }
    });
    
    // Delete tasks that no longer exist
    const currentIds = new Set(flatTasks.map(t => t.id));
    const deleteTasks = existingTasks?.filter(t => !currentIds.has(t.id)) || [];
    
    // Execute operations
    if (newTasks.length > 0) {
      const { error } = await supabase.from('tasks').insert(newTasks);
      if (error) console.error('Failed to insert tasks:', error);
    }
    
    if (updateTasks.length > 0) {
      for (const task of updateTasks) {
        const { id, ...updates } = task;
        await taskOps.update(id, updates);
      }
    }
    
    if (deleteTasks.length > 0) {
      for (const task of deleteTasks) {
        await taskOps.delete(task.id);
      }
    }
    
    console.log('Tasks synced to Supabase');
  } catch (error) {
    console.error('Failed to sync tasks to Supabase:', error);
  }
}

// Flatten hierarchical tasks to flat list
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

// Get all notes (from Supabase or localStorage)
export async function getNotes() {
  if (!syncEnabled || !currentUser) {
    const stored = localStorage.getItem('todolist_notes');
    return stored ? JSON.parse(stored) : [];
  }
  
  try {
    const { data, error } = await noteOps.getAll(currentUser.id);
    
    if (error) {
      console.error('Failed to fetch notes from Supabase:', error);
      const stored = localStorage.getItem('todolist_notes');
      return stored ? JSON.parse(stored) : [];
    }
    
    return data.map(note => ({
      id: note.id,
      title: note.title,
      content: note.content,
      createdAt: note.created_at,
    }));
  } catch (error) {
    console.error('Error getting notes:', error);
    const stored = localStorage.getItem('todolist_notes');
    return stored ? JSON.parse(stored) : [];
  }
}

// Save notes (to Supabase or localStorage)
export async function saveNotes(notes) {
  localStorage.setItem('todolist_notes', JSON.stringify(notes));
  
  if (!syncEnabled || !currentUser) {
    return;
  }
  
  try {
    const { data: existingNotes } = await noteOps.getAll(currentUser.id);
    const existingIds = new Set(existingNotes?.map(n => n.id) || []);
    
    const newNotes = [];
    const updateNotes = [];
    
    notes.forEach(note => {
      const supabaseNote = {
        id: note.id,
        user_id: currentUser.id,
        title: note.title,
        content: note.content,
        created_at: note.createdAt,
      };
      
      if (existingIds.has(note.id)) {
        updateNotes.push(supabaseNote);
      } else {
        newNotes.push(supabaseNote);
      }
    });
    
    const currentIds = new Set(notes.map(n => n.id));
    const deleteNotes = existingNotes?.filter(n => !currentIds.has(n.id)) || [];
    
    if (newNotes.length > 0) {
      const { error } = await supabase.from('notes').insert(newNotes);
      if (error) console.error('Failed to insert notes:', error);
    }
    
    if (updateNotes.length > 0) {
      for (const note of updateNotes) {
        const { id, ...updates } = note;
        await noteOps.update(id, updates);
      }
    }
    
    if (deleteNotes.length > 0) {
      for (const note of deleteNotes) {
        await noteOps.delete(note.id);
      }
    }
    
    console.log('Notes synced to Supabase');
  } catch (error) {
    console.error('Failed to sync notes to Supabase:', error);
  }
}

// Export for global access
window.supabaseSync = {
  initializeSync,
  getTasks,
  saveTasks,
  getNotes,
  saveNotes,
};
