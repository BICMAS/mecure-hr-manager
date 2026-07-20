import { getAccessToken } from "../utils/auth";

import { getApiV1BaseUrl } from "../lib/apiConfig";

const API_BASE = getApiV1BaseUrl();

export async function awardPointsToLearner(learnerId: string, points: number) {
  const token = getAccessToken();
  if (!token) throw new Error("Not authenticated");

  const res = await fetch(`${API_BASE}/rewards/award`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ learnerId, points }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to award points");
  }

  const data = await res.json().catch(() => null);
  return data?.data ?? data ?? null;
}

