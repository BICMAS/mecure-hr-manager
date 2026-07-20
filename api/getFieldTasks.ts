import { getAccessToken } from "../utils/auth";
import { getApiV1BaseUrl } from "../lib/apiConfig";

export async function getFieldTasks() {
  const token = getAccessToken();
  if (!token) throw new Error("No access token");

  const res = await fetch(`${getApiV1BaseUrl()}/field-tasks`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to fetch field tasks");
  }

  const data = await res.json();
  return data.data ?? data;
}
