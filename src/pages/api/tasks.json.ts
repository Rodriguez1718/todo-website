import type { APIRoute } from 'astro';

// For static builds, we'll return empty arrays and let the client handle localStorage
export const GET: APIRoute = async ({ url }) => {
  const type = url.searchParams.get('type') || 'tasks';
  
  // Return empty array - client will fall back to localStorage or sample data
  return new Response(JSON.stringify([]), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  });
};

export const POST: APIRoute = async ({ request }) => {
  // For static builds, we can't write to files
  // Return success so client falls back to localStorage
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  });
};