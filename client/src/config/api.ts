// Prod build (Heroku) serves client + API same-origin → empty base URL.
// Dev keeps pointing at the local server.
export const API_BASE_URL =
  import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? 'http://localhost:5000' : '');
