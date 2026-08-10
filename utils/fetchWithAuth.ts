import { getApiV1BaseUrl } from "@/lib/apiConfig";
import {
  clearAuth,
  getAccessToken,
  getRefreshToken,
  setAccessToken,
} from "@/utils/auth";

const API_BASE = getApiV1BaseUrl();

let refreshInFlight: Promise<boolean> | null = null;

function buildUrl(endpoint: string) {
  return endpoint.startsWith("http") ? endpoint : `${API_BASE}${endpoint}`;
}

function buildHeaders(options: RequestInit) {
  const headers = new Headers(options.headers);
  const token = getAccessToken();

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const isFormData = options.body instanceof FormData;
  if (!isFormData && options.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  return headers;
}

async function refreshSession(): Promise<boolean> {
  if (refreshInFlight) {
    return refreshInFlight;
  }

  refreshInFlight = (async () => {
    try {
      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        return false;
      }

      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });

      if (!res.ok) {
        return false;
      }

      const data = await res.json().catch(() => ({}));
      const accessToken =
        data.accessToken ?? data.token ?? data.data?.accessToken;

      if (!accessToken || typeof accessToken !== "string") {
        return false;
      }

      setAccessToken(accessToken);
      return true;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

function handleAuthFailure() {
  clearAuth();
  window.dispatchEvent(new Event("mecure:auth-expired"));
}

export async function fetchWithAuth(
  endpoint: string,
  options: RequestInit = {},
): Promise<Response> {
  const url = buildUrl(endpoint);
  let res = await fetch(url, {
    ...options,
    headers: buildHeaders(options),
  });

  if (res.status !== 401) {
    return res;
  }

  const refreshed = await refreshSession();
  if (!refreshed) {
    handleAuthFailure();
    return res;
  }

  res = await fetch(url, {
    ...options,
    headers: buildHeaders(options),
  });

  if (res.status === 401) {
    handleAuthFailure();
  }

  return res;
}

export async function authFetchJson<T = unknown>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getAccessToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  const res = await fetchWithAuth(endpoint, options);

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { message?: string; error?: string }).message ||
        (err as { message?: string; error?: string }).error ||
        "Request failed",
    );
  }

  return res.json() as Promise<T>;
}

export function getTokenExpiryMs(token: string | null): number | null {
  if (!token) {
    return null;
  }

  try {
    const [, payloadSegment] = token.split(".");
    if (!payloadSegment) {
      return null;
    }

    const payload = JSON.parse(atob(payloadSegment)) as { exp?: number };
    return typeof payload.exp === "number" ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}
