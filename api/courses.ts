import { getApiV1BaseUrl } from '@/lib/apiConfig';
import { fetchWithAuth } from '@/utils/fetchWithAuth';

const API_BASE = getApiV1BaseUrl();

export interface ResetCourseProgressOptions {
  deleteCertificates?: boolean;
  resetModuleProgress?: boolean;
  newPacingStartDate?: string;
}

export interface ResetCourseProgressResult {
  courseId: string;
  courseTitle: string;
  dryRun: boolean;
  learnersProcessed: number;
  certificatesDeleted: number;
  attemptsReset: number;
  scormAttemptsDeleted: number;
  moduleProgressReset: number;
  pacingStartDateUpdated: boolean;
  errors: Array<{ userId: string; message: string }>;
}

export interface CourseDetail {
  id: string;
  title: string;
  modulePacingEnabled?: boolean;
  pacingStartDate?: string | null;
}

export async function getCourseById(courseId: string): Promise<CourseDetail> {
  const res = await fetchWithAuth(`/courses/${encodeURIComponent(courseId)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || err.message || 'Failed to load course');
  }
  return res.json();
}

export async function resetCourseProgress(
  courseId: string,
  options: ResetCourseProgressOptions = {},
  dryRun = false,
): Promise<ResetCourseProgressResult> {
  const query = dryRun ? '?dryRun=true' : '';
  const res = await fetchWithAuth(
    `/courses/${encodeURIComponent(courseId)}/reset-progress${query}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deleteCertificates: options.deleteCertificates ?? true,
        resetModuleProgress: options.resetModuleProgress ?? true,
        newPacingStartDate: options.newPacingStartDate,
      }),
    },
  );

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || data.message || 'Failed to reset course progress');
  }

  return data;
}

export async function lockCourse(courseId: string): Promise<{ isLocked?: boolean }> {
  const res = await fetchWithAuth(`/courses/${encodeURIComponent(courseId)}/lock`, {
    method: 'PATCH',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || data.message || 'Failed to lock course');
  }
  return data;
}

export async function unlockCourse(courseId: string): Promise<{ isLocked?: boolean }> {
  const res = await fetchWithAuth(`/courses/${encodeURIComponent(courseId)}/unlock`, {
    method: 'PATCH',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || data.message || 'Failed to unlock course');
  }
  return data;
}
