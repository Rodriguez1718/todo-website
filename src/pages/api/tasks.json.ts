import type { APIRoute } from 'astro';
import fs from 'fs';
import path from 'path';

// Mark this endpoint as server-rendered to enable POST requests
export const prerender = false;

const tasksFilePath = path.join(process.cwd(), 'src/data/tasks.json');
const uiverseTasksFilePath = path.join(process.cwd(), 'src/data/uiverse-tasks.json');
const notesFilePath = path.join(process.cwd(), 'src/data/notes.json');

// Ensure data directory exists
const dataDir = path.dirname(tasksFilePath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize files if they don't exist
if (!fs.existsSync(tasksFilePath)) {
  fs.writeFileSync(tasksFilePath, JSON.stringify([]));
}
if (!fs.existsSync(uiverseTasksFilePath)) {
  fs.writeFileSync(uiverseTasksFilePath, JSON.stringify([]));
}
if (!fs.existsSync(notesFilePath)) {
  fs.writeFileSync(notesFilePath, JSON.stringify([]));
}

export const GET: APIRoute = async ({ url }) => {
  try {
    const type = url.searchParams.get('type') || 'tasks';
    let filePath = tasksFilePath;
    
    if (type === 'notes') {
      filePath = notesFilePath;
    } else if (type === 'uiverse') {
      filePath = uiverseTasksFilePath;
    }
    
    const data = fs.readFileSync(filePath, 'utf-8');
    return new Response(data, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to read data' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const { type, data } = await request.json();
    let filePath = tasksFilePath;
    
    if (type === 'notes') {
      filePath = notesFilePath;
    } else if (type === 'uiverse') {
      filePath = uiverseTasksFilePath;
    }
    
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to save data' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
};