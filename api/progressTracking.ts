import { getAccessToken } from "../utils/auth";

import { getApiV1BaseUrl } from "../lib/apiConfig";

const API_BASE = getApiV1BaseUrl();

async function fetchWithAuth(url: string) {
  const token = getAccessToken();
  if (!token) throw new Error("No access token");

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to fetch progress tracking data");
  }

  const data = await res.json().catch(() => null);
  return data?.data ?? data ?? [];
}

export async function getLearnersCourseTracking() {
  return fetchWithAuth(`${API_BASE}/dashboard/hr/learners/course-tracking`);
}

export async function getLearnerCourseTrackingById(learnerId: string) {
  return fetchWithAuth(
    `${API_BASE}/dashboard/hr/learners/${learnerId}/course-tracking`,
  );
}

