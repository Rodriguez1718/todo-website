import type { APIRoute } from 'astro';
import type { Task, Note, ExportData, APIResponse } from '../../types/tasks';

// Type-safe API responses
type TasksResponse = APIResponse<Task[]>;
type NotesResponse = APIResponse<Note[]>;
type ExportResponse = APIResponse<ExportData>;

// For static builds, we'll return empty arrays and let the client handle localStorage
export const GET: APIRoute = async ({ url }) => {
  const type = url.searchParams.get('type') || 'tasks';
  
  // Return empty array - client will fall back to localStorage or sample data
  const response: TasksResponse | NotesResponse = {
    data: [],
    status: 200,
    message: 'Using client-side storage'
  };
  
  return new Response(JSON.stringify(response), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  });
};

export const POST: APIRoute = async ({ request }) => {
  // For static builds, we can't write to files
  // Return success so client falls back to localStorage
  const response: APIResponse<{ success: boolean }> = {
    data: { success: true },
    status: 200,
    message: 'Using client-side storage'
  };
  
  return new Response(JSON.stringify(response), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  });
};