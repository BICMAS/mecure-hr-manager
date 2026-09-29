import { getAccessToken } from "../utils/auth";
import { getApiV1BaseUrl } from "../lib/apiConfig";

const API_BASE = getApiV1BaseUrl();

export interface CourseAssignee {
  assignmentId: string;
  learnerId: string;
  fullName: string;
  email: string;
  department?: string | null;
  assignedAt: string;
  dueDate?: string | null;
  status: string;
  progress: number;
  scorePercent?: number | null;
  requiresRetake?: boolean;
}

export interface CourseAssigneesResponse {
  courseId: string;
  courseTitle: string;
  count: number;
  assignees: CourseAssignee[];
}

export async function getCourseAssignees(
  courseId: string,
): Promise<CourseAssigneesResponse> {
  const token = getAccessToken();
  if (!token) throw new Error("No access token");

  const res = await fetch(
    `${API_BASE}/assignments/course/${encodeURIComponent(courseId)}/assignees`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    },
  );

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body?.error || "Failed to load course assignees");
  }

  return body as CourseAssigneesResponse;
}

export async function updateAssignmentDueDate(
  assignmentId: string,
  dueDate: string,
): Promise<{ assignmentId: string; dueDate: string }> {
  const token = getAccessToken();
  if (!token) throw new Error("No access token");

  const res = await fetch(
    `${API_BASE}/assignments/${encodeURIComponent(assignmentId)}/due-date`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ dueDate }),
    },
  );

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body?.error || "Failed to update due date");
  }

  return body as { assignmentId: string; dueDate: string };
}
