import { authFetchJson, fetchWithAuth } from "@/utils/fetchWithAuth";

export interface ActivityReportTotals {
  trainees: number;
  assignedCourses: number;
  averageProgress: number;
  averageScore: number | null;
  learningHours: number;
  overdueCourses: number;
  moduleProgressCompleted: number;
  moduleProgressTracked: number;
  scormAttempts: number;
  certificates: number;
  quizAttempts: number;
  fieldTasks: number;
  points: number;
  pointsAwarded: number;
}

export interface ActivityReportTrainee extends ActivityReportTotals {
  id: string;
  fullName: string;
  email: string;
  batch: string;
  department: string;
  moduleProgress: string;
  courses: string;
  attemptCount: number;
}

export interface ActivityReportBreakdown extends ActivityReportTotals {
  label: string;
}

export interface ActivityReport {
  filters: {
    batchId: string | null;
    department: string | null;
    from: string | null;
    to: string | null;
    breakdown: "batch" | "department";
  };
  breakdownBy: "batch" | "department";
  totals: ActivityReportTotals;
  breakdown: ActivityReportBreakdown[];
  trainees: ActivityReportTrainee[];
  message: string | null;
}

export interface ActivityReportFilters {
  batchId?: string;
  department?: string;
  from?: string;
  to?: string;
}

function reportQuery(filters: ActivityReportFilters, format?: "csv") {
  const params = new URLSearchParams();
  if (filters.batchId) params.set("batchId", filters.batchId);
  if (filters.department) params.set("department", filters.department);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (format) params.set("format", format);
  const query = params.toString();
  return query ? `?${query}` : "";
}

export function getActivityReport(filters: ActivityReportFilters) {
  return authFetchJson<ActivityReport>(`/dashboard/hr/activity-report${reportQuery(filters)}`);
}

export async function downloadActivityReportCsv(filters: ActivityReportFilters) {
  const res = await fetchWithAuth(`/dashboard/hr/activity-report${reportQuery(filters, "csv")}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { error?: string; message?: string }).error ||
        (err as { error?: string; message?: string }).message ||
        "Failed to download the activity report",
    );
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "activity-report.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
