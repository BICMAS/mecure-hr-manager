/** Local backend during `npm run dev` */
const DEV_API_V1 = "http://localhost:5000/api/v1";

/**
 * Production fallback until `VITE_API_BASE_URL` is set at deploy time.
 * Override in `.env.production` or your host's env vars when the backend is live.
 */
const PRODUCTION_API_V1_PENDING =
  "https://your-production-backend.example.com/api/v1";

function normalizeApiV1BaseUrl(raw: string): string {
  const trimmed = raw.replace(/\/$/, "");
  if (trimmed.endsWith("/api/v1")) return trimmed;
  return `${trimmed}/api/v1`;
}

export function getApiV1BaseUrl(): string {
  const fromEnv = import.meta.env.VITE_API_BASE_URL?.trim();
  if (fromEnv) return normalizeApiV1BaseUrl(fromEnv);
  if (import.meta.env.DEV) return DEV_API_V1;
  return PRODUCTION_API_V1_PENDING;
}
