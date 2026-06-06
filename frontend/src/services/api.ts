/**
 * api.ts
 * Central place for the backend base URL.
 *
 * In development:  VITE_API_URL is empty → relative paths work via Vite proxy.
 * In production:   Set VITE_API_URL=https://carmatchr-backend.onrender.com
 *                  in the Render frontend service's Environment Variables.
 */
export const API_BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? '';
