import { z } from 'zod';

export const api = {
  // Placeholder for now, as most interaction is via Telegram
  status: {
    method: 'GET' as const,
    path: '/api/status' as const,
    responses: {
      200: z.object({ status: z.string() }),
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
