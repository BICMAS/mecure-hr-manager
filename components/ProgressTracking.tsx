import React, { useEffect, useState } from 'react';
import { User, Course, LearnerProgress, CourseStatus, SyncStatus } from '../types';
import { Search, Filter, RefreshCw } from 'lucide-react';
import {
  getLearnerCourseTrackingById,
  getLearnersCourseTracking,
} from '../api/progressTracking';
import { getAccessToken } from '../utils/auth';
import { getApiV1BaseUrl } from '@/lib/apiConfig';

const API_BASE = getApiV1BaseUrl();

interface ProgressTrackingProps {
  users: User[];
  courses: Course[];
  progress: LearnerProgress[];
}

export const ProgressTracking: React.FC<ProgressTrackingProps> = ({ users, courses, progress }) => {
  const [filterDept, setFilterDept] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [selectedLearnerId, setSelectedLearnerId] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('learner-asc');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [trackingRows, setTrackingRows] = useState<LearnerProgress[]>(progress);
  const [loadingTracking, setLoadingTracking] = useState(false);
  const [fetchedUsers, setFetchedUsers] = useState<User[]>([]);
  const [fetchedCourses, setFetchedCourses] = useState<Course[]>([]);

  const availableUsers = users.length > 0 ? users : fetchedUsers;
  const availableCourses = courses.length > 0 ? courses : fetchedCourses;

  const normalizeId = (value: unknown) =>
    String(value ?? "")
      .trim()
      .toLowerCase();

  const normalizeStatus = (status: string): CourseStatus => {
    const normalized = status?.toLowerCase?.().trim() ?? "";
    if (normalized === "completed") return CourseStatus.COMPLETED;
    if (normalized === "in_progress" || normalized === "in progress") {
      return CourseStatus.IN_PROGRESS;
    }
    if (normalized === "overdue") return CourseStatus.OVERDUE;
    if (normalized === "not_started" || normalized === "not started") {
      return CourseStatus.NOT_STARTED;
    }
    return CourseStatus.NOT_STARTED;
  };

  const getProgressPercent = (row: any, status: string) => {
    const direct = Number(
      row.progressPercent ??
        row.progress_percentage ??
        row.completionPercent ??
        row.completion_percentage ??
        row.progress ??
        row.courseProgress?.progressPercent ??
        row.metrics?.progressPercent ??
        row.stats?.progressPercent,
    );

    if (Number.isFinite(direct) && direct > 0) return Math.min(direct, 100);

    const completed = Number(
      row.completedLessons ??
        row.completedModules ??
        row.completedUnits ??
        row.completedItems,
    );
    const total = Number(
      row.totalLessons ?? row.totalModules ?? row.totalUnits ?? row.totalItems,
    );
    if (Number.isFinite(completed) && Number.isFinite(total) && total > 0) {
      return Math.min((completed / total) * 100, 100);
    }

    const normalizedStatus = status.toLowerCase();
    if (normalizedStatus === "completed") return 100;
    return 0;
  };

  const normalizeTrackingRow = (row: any): LearnerProgress => ({
    id:
      row.id ??
      row.progressId ??
      `${row.userId ?? row.learnerId ?? row.user?.id ?? "u"}-${row.courseId ?? row.course?.id ?? row.courseCode ?? "c"}`,
    userId: row.userId ?? row.learnerId ?? row.user?.id ?? "",
    courseId:
      row.courseId ??
      row.course_id ??
      row.course?.id ??
      row.course?.courseId ??
      row.courseCode ??
      row.moduleId ??
      row.assignment?.courseId ??
      row.enrollment?.courseId ??
      "",
    status: normalizeStatus(
      row.status ?? row.courseStatus ?? row.trackingStatus ?? "Not Started",
    ),
    progressPercent: getProgressPercent(
      row,
      row.status ?? row.courseStatus ?? row.trackingStatus ?? "Not Started",
    ),
    score: row.score ?? undefined,
    attempts: row.attempts ?? 0,
    assignedDate: row.assignedDate ?? "",
    dueDate: row.dueDate ?? "",
    completedDate: row.completedDate ?? undefined,
    syncStatus: SyncStatus.PENDING,
    userName: row.userName ?? row.learnerName ?? row.user?.fullName ?? row.user?.name,
    userDept: row.userDept ?? row.department ?? row.user?.department,
    courseTitle:
      row.courseTitle ??
      row.course_title ??
      row.courseName ??
      row.course_name ??
      row.moduleTitle ??
      row.assignment?.courseTitle ??
      row.assignment?.course?.title ??
      row.assignment?.course?.name ??
      row.enrollment?.courseTitle ??
      row.enrollment?.course?.title ??
      row.enrollment?.course?.name ??
      row.training?.title ??
      row.training?.name ??
      row.course?.courseTitle ??
      row.course?.courseName ??
      row.course?.moduleTitle ??
      row.course?.name ??
      row.title ??
      (typeof row.course === "string" ? row.course : row.course?.title) ??
      "",
    courseHint: row.course ?? row.assignment?.course ?? row.enrollment?.course ?? null,
  });

  const loadTracking = async (learnerId?: string) => {
    try {
      setLoadingTracking(true);
      const raw = learnerId
        ? await getLearnerCourseTrackingById(learnerId)
        : await getLearnersCourseTracking();

      const usersFromResponse = Array.isArray(raw?.users) ? raw.users : [];
      if (usersFromResponse.length > 0) {
        const mapped: User[] = usersFromResponse.map((user: any) => ({
          id: user.id,
          name: user.fullName ?? user.name ?? "User",
          email: user.email ?? "",
          role: user.userRole ?? user.role,
          department: user.department ?? "",
          avatarUrl:
            user.avatarUrl ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(
              user.fullName ?? user.name ?? "User",
            )}&background=random`,
        }));
        setFetchedUsers(mapped);
      }

      const coursesFromResponse = Array.isArray(raw?.courses) ? raw.courses : [];
      if (coursesFromResponse.length > 0) {
        const mapped: Course[] = coursesFromResponse.map((course: any) => ({
          id: course.id,
          title: course.title ?? course.courseTitle ?? course.name ?? "",
          description: course.description ?? "",
          status: course.status ?? "",
        }));
        setFetchedCourses(mapped);
      }

      const list = Array.isArray(raw)
        ? raw
        : raw?.progress ?? raw?.items ?? raw?.rows ?? [];

      const learnersFromResponse = Array.isArray(raw?.learners) ? raw.learners : [];
      const learnerCourseLookup = new Map<
        string,
        { courseId: string; courseTitle: string; dueDate?: string }
      >();

      learnersFromResponse.forEach((entry: any) => {
        const learnerId = entry?.learner?.id;
        if (!learnerId) return;

        const unfinished = Array.isArray(entry?.unfinishedCourses)
          ? entry.unfinishedCourses[0]
          : null;
        const currentCourse = entry?.currentCourse?.course;
        const attemptCourse = entry?.attempts?.[0]?.course;

        const courseId =
          unfinished?.course?.id ??
          unfinished?.courseId ??
          currentCourse?.id ??
          attemptCourse?.id ??
          "";
        const courseTitle =
          unfinished?.course?.title ??
          currentCourse?.title ??
          attemptCourse?.title ??
          "";
        const dueDate = unfinished?.dueDate ?? entry?.attempts?.[0]?.dueDate ?? "";

        if (courseId || courseTitle) {
          learnerCourseLookup.set(learnerId, { courseId, courseTitle, dueDate });
        }
      });

      const normalizedRows: LearnerProgress[] = list.map(
        (row: Record<string, unknown>) => {
          const normalized = normalizeTrackingRow(row);
          const learnerId =
            normalized.userId || String(row.learnerId ?? row.userId ?? "");
          const fallback = learnerCourseLookup.get(learnerId);

          if (fallback) {
            normalized.courseId = normalized.courseId || fallback.courseId;
            normalized.courseTitle =
              normalized.courseTitle || fallback.courseTitle;
            normalized.dueDate = normalized.dueDate || fallback.dueDate || "";
          }

          return normalized;
        },
      );

      // Some responses omit courseId/courseTitle in /learners/course-tracking.
      // Enrich those rows using /learners/:learnerId/course-tracking.
      const missingCourseRows = normalizedRows.filter(
        (row: LearnerProgress) =>
          row.userId && !(row.courseId || row.courseTitle),
      );

      if (missingCourseRows.length > 0) {
        const uniqueLearnerIds: string[] = Array.from(
          new Set(
            missingCourseRows
              .map((row: LearnerProgress) => row.userId)
              .filter((id): id is string => Boolean(id)),
          ),
        );

        const detailedResults = await Promise.allSettled(
          uniqueLearnerIds.map((id: string) => getLearnerCourseTrackingById(id)),
        );

        const learnerCourseMap = new Map<string, { courseId: string; courseTitle: string }>();

        detailedResults.forEach((result, idx) => {
          if (result.status !== "fulfilled") return;
          const learnerId = uniqueLearnerIds[idx];
          if (!learnerId) return;
          const payload = result.value;
          const detailList = Array.isArray(payload)
            ? payload
            : payload?.progress ?? payload?.items ?? payload?.rows ?? [];
          const first = detailList[0];
          if (!first) return;

          const courseId =
            first.courseId ??
            first.course_id ??
            first.course?.id ??
            first.course?.courseId ??
            "";
          const courseTitle =
            first.courseTitle ??
            first.course_title ??
            first.courseName ??
            first.course_name ??
            first.course?.title ??
            first.course?.courseTitle ??
            first.course?.name ??
            "";

          if (courseId || courseTitle) {
            learnerCourseMap.set(learnerId, { courseId, courseTitle });
          }
        });

        normalizedRows.forEach((row: LearnerProgress) => {
          if (row.userId && !row.courseId && !row.courseTitle) {
            const enriched = learnerCourseMap.get(row.userId);
            if (enriched) {
              row.courseId = enriched.courseId || row.courseId;
              row.courseTitle = enriched.courseTitle || row.courseTitle;
            }
          }
        });
      }

      const dedupedMap = new Map<string, LearnerProgress>();
      normalizedRows.forEach((normalized: LearnerProgress) => {
        const key = `${normalized.userId || "unknown-user"}::${normalized.courseId || normalized.courseTitle || "unknown-course"}`;
        const existing = dedupedMap.get(key);
        if (
          !existing ||
          (normalized.progressPercent ?? 0) >= (existing.progressPercent ?? 0)
        ) {
          dedupedMap.set(key, normalized);
        }
      });

      setTrackingRows(Array.from(dedupedMap.values()));
      console.log(
        learnerId
          ? "GET /dashboard/hr/learners/:learnerId/course-tracking response:"
          : "GET /dashboard/hr/learners/course-tracking response:",
        raw,
      );
    } catch (err) {
      console.error("Progress tracking fetch error:", err);
    } finally {
      setLoadingTracking(false);
    }
  };

  // Helper to merge data
  const data = trackingRows.map(p => {
    const user = availableUsers.find(u => u.id === p.userId);
    const normalizedCourseId = normalizeId((p as any).courseId);
    const normalizedCourseTitle = String((p as any).courseTitle ?? "")
      .trim()
      .toLowerCase();

    const course = availableCourses.find((c) => {
      const idMatch =
        normalizedCourseId &&
        normalizeId(c.id) === normalizedCourseId;
      const titleMatch =
        normalizedCourseTitle &&
        String(c.title ?? "")
          .trim()
          .toLowerCase() === normalizedCourseTitle;
      return Boolean(idMatch || titleMatch);
    });

    const hintedCourseTitle =
      (p as any).courseHint?.title ??
      (p as any).courseHint?.courseTitle ??
      (p as any).courseHint?.courseName ??
      (p as any).courseHint?.name;
    return {
      ...p,
      userName: (p as any).userName || user?.name || "Learner",
      userDept: (p as any).userDept || user?.department || "-",
      courseTitle:
        (p as any).courseTitle ||
        hintedCourseTitle ||
        course?.title ||
        "Unknown course",
    };
  }).filter(item => {
      const matchDept = filterDept === 'All' || item.userDept === filterDept;
      const matchStatus = filterStatus === 'All' || item.status === filterStatus;
      const q = searchTerm.trim().toLowerCase();
      const matchSearch =
        !q ||
        item.userName?.toLowerCase().includes(q) ||
        item.courseTitle?.toLowerCase().includes(q) ||
        item.status?.toLowerCase().includes(q) ||
        item.userDept?.toLowerCase().includes(q);
      return matchDept && matchStatus && matchSearch;
  }).sort((a, b) => {
      switch (sortBy) {
        case "learner-desc":
          return (b.userName || "").localeCompare(a.userName || "");
        case "course-asc":
          return (a.courseTitle || "").localeCompare(b.courseTitle || "");
        case "course-desc":
          return (b.courseTitle || "").localeCompare(a.courseTitle || "");
        case "progress-desc":
          return (b.progressPercent || 0) - (a.progressPercent || 0);
        case "progress-asc":
          return (a.progressPercent || 0) - (b.progressPercent || 0);
        case "status-asc":
          return (a.status || "").localeCompare(b.status || "");
        case "status-desc":
          return (b.status || "").localeCompare(a.status || "");
        case "learner-asc":
        default:
          return (a.userName || "").localeCompare(b.userName || "");
      }
  });

  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedData = data.slice(startIndex, startIndex + pageSize);
  const from = data.length === 0 ? 0 : startIndex + 1;
  const to = Math.min(startIndex + pageSize, data.length);

  const escapeCsv = (value: string | number | undefined) => {
    const v = String(value ?? "");
    if (v.includes(",") || v.includes('"') || v.includes("\n")) {
      return `"${v.replace(/"/g, '""')}"`;
    }
    return v;
  };

  const handleExportCsv = () => {
    const headers = [
      "Learner",
      "Department",
      "Course",
      "Status",
      "Progress",
      "Incomplete",
      "Due Date",
    ];

    const rows = data.map((item) => [
      item.userName,
      item.userDept,
      item.courseTitle,
      item.status === CourseStatus.NOT_STARTED ? "NOT_STARTED" : item.status,
      `${item.progressPercent}%`,
      `${100 - item.progressPercent}%`,
      item.dueDate || "",
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => escapeCsv(cell)).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `progress-tracking-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleExportPdf = () => {
    const tableRows = data
      .map(
        (item) => `
          <tr>
            <td>${item.userName ?? ""}</td>
            <td>${item.userDept ?? ""}</td>
            <td>${item.courseTitle ?? ""}</td>
            <td>${item.status === CourseStatus.NOT_STARTED ? "NOT_STARTED" : item.status}</td>
            <td>${item.progressPercent}%</td>
            <td>${100 - item.progressPercent}%</td>
            <td>${item.dueDate ?? ""}</td>
          </tr>
        `,
      )
      .join("");

    const html = `
      <html>
        <head>
          <title>Progress Tracking Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { font-size: 18px; margin-bottom: 12px; }
            table { border-collapse: collapse; width: 100%; font-size: 12px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background: #f8fafc; }
          </style>
        </head>
        <body>
          <h1>Progress Tracking Report</h1>
          <table>
            <thead>
              <tr>
                <th>Learner</th>
                <th>Department</th>
                <th>Course</th>
                <th>Status</th>
                <th>Progress</th>
                <th>Incomplete</th>
                <th>Due Date</th>
              </tr>
            </thead>
            <tbody>${tableRows}</tbody>
          </table>
        </body>
      </html>
    `;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [filterDept, filterStatus, selectedLearnerId, searchTerm, sortBy]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    if (users.length > 0) return;

    const fetchUsers = async () => {
      try {
        const token = getAccessToken();
        if (!token) throw new Error("Not authenticated");

        const res = await fetch(`${API_BASE}/users/organization/users`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to fetch users");

        const payload = await res.json();
        const list = Array.isArray(payload) ? payload : payload?.data ?? [];
        const mapped: User[] = list.map((user: any) => ({
          id: user.id,
          name: user.fullName ?? user.name ?? "User",
          email: user.email ?? "",
          role: user.userRole ?? user.role,
          department: user.department ?? "",
          avatarUrl:
            user.avatarUrl ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(
              user.fullName ?? user.name ?? "User",
            )}&background=random`,
        }));
        setFetchedUsers(mapped);
        console.log("Progress fallback users response:", mapped);
      } catch (err) {
        console.error("Progress fallback users fetch error:", err);
      }
    };

    fetchUsers();
  }, [users.length]);

  useEffect(() => {
    if (courses.length > 0) return;

    const fetchCourses = async () => {
      try {
        const token = getAccessToken();
        if (!token) throw new Error("Not authenticated");

        const res = await fetch(`${API_BASE}/courses`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to fetch courses");

        const payload = await res.json();
        const list = Array.isArray(payload) ? payload : payload?.data ?? [];
        const mapped: Course[] = list.map((course: any) => ({
          id: course.id,
          title: course.title,
          description: course.description ?? "",
          status: course.status ?? "",
        }));
        setFetchedCourses(mapped);
        console.log("Progress fallback courses response:", mapped);
      } catch (err) {
        console.error("Progress fallback courses fetch error:", err);
      }
    };

    fetchCourses();
  }, [courses.length]);

  useEffect(() => {
    if (progress.length) {
      setTrackingRows(progress.map((row: any) => normalizeTrackingRow(row)));
    } else {
      loadTracking();
    }
  }, [progress.length]);

  useEffect(() => {
    console.log("Progress tracking props response:", {
      users,
      courses,
      progress,
    });
    console.log("Progress tracking merged/filtered data:", data);
  }, [users, courses, progress, trackingRows]);

  const getStatusColor = (status: CourseStatus) => {
    switch (status) {
      case CourseStatus.COMPLETED: return 'bg-green-100 text-green-700';
      case CourseStatus.IN_PROGRESS: return 'bg-brand-primary/10 text-brand-primary';
      case CourseStatus.OVERDUE: return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="flex gap-4 w-full md:w-auto">
           <div className="relative">
             <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
             <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search learner or course..."
                className="pl-9 pr-3 py-2 border border-slate-300 rounded text-sm focus:ring-brand-primary focus:outline-none bg-white"
             />
           </div>
           <div className="relative">
             <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
             <select 
                className="pl-9 pr-4 py-2 border border-slate-300 rounded text-sm focus:ring-brand-primary focus:outline-none appearance-none bg-white"
                value={filterDept}
                onChange={e => setFilterDept(e.target.value)}
             >
                <option value="All">All Departments</option>
                <option value="Engineering">Engineering</option>
                <option value="Sales">Sales</option>
                <option value="HR">HR</option>
             </select>
           </div>
           <div className="relative">
             <select 
                className="px-4 py-2 border border-slate-300 rounded text-sm focus:ring-brand-primary focus:outline-none bg-white"
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
             >
                <option value="All">All Statuses</option>
                <option value={CourseStatus.COMPLETED}>{CourseStatus.COMPLETED}</option>
                <option value={CourseStatus.IN_PROGRESS}>{CourseStatus.IN_PROGRESS}</option>
                <option value={CourseStatus.NOT_STARTED}>{CourseStatus.NOT_STARTED}</option>
                <option value={CourseStatus.OVERDUE}>{CourseStatus.OVERDUE}</option>
             </select>
           </div>
           <div className="relative">
             <select
                className="px-4 py-2 border border-slate-300 rounded text-sm focus:ring-brand-primary focus:outline-none bg-white"
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
             >
                <option value="learner-asc">Learner (A-Z)</option>
                <option value="learner-desc">Learner (Z-A)</option>
                <option value="course-asc">Course (A-Z)</option>
                <option value="course-desc">Course (Z-A)</option>
                <option value="progress-desc">Progress (High-Low)</option>
                <option value="progress-asc">Progress (Low-High)</option>
                <option value="status-asc">Status (A-Z)</option>
                <option value="status-desc">Status (Z-A)</option>
             </select>
           </div>
           <div className="relative">
             <select
                className="px-4 py-2 border border-slate-300 rounded text-sm focus:ring-brand-primary focus:outline-none bg-white"
                value={selectedLearnerId}
                onChange={async (e) => {
                  const learnerId = e.target.value;
                  setSelectedLearnerId(learnerId);
                  if (learnerId === "All") {
                    await loadTracking();
                  } else {
                    await loadTracking(learnerId);
                  }
                }}
             >
                <option value="All">All Learners</option>
                {availableUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
             </select>
           </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="text-sm font-medium rounded border border-slate-300 px-3 py-2 text-slate-700 hover:bg-slate-50"
          >
            Export CSV
          </button>
          <button
            onClick={handleExportPdf}
            className="text-sm font-medium rounded border border-slate-300 px-3 py-2 text-slate-700 hover:bg-slate-50"
          >
            Export PDF
          </button>
          <button
            onClick={() =>
              selectedLearnerId === "All"
                ? loadTracking()
                : loadTracking(selectedLearnerId)
            }
            className="flex items-center gap-2 text-sm font-medium text-brand-primary hover:text-brand-primary-dark"
          >
              <RefreshCw className="w-4 h-4" /> Refresh Data
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-3">Learner</th>
                <th className="px-6 py-3">Course</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Progress</th>
                <th className="px-6 py-3">Quiz Score</th>
                <th className="px-6 py-3">Due Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loadingTracking && (
                <tr>
                  <td colSpan={6} className="px-6 py-6 text-center text-sm text-slate-500">
                    Loading progress data...
                  </td>
                </tr>
              )}
              {!loadingTracking && data.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-6 text-center text-sm text-slate-500">
                    No progress tracking data found.
                  </td>
                </tr>
              )}
              {paginatedData.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50">
                  <td className="px-6 py-3">
                    <div className="font-medium text-slate-900">{item.userName}</div>
                    <div className="text-xs text-slate-500">{item.userDept}</div>
                  </td>
                  <td className="px-6 py-3 text-slate-700">{item.courseTitle}</td>
                  <td className="px-6 py-3">
                    <span className={`inline-flex px-2 py-1 rounded text-xs font-semibold ${getStatusColor(item.status)}`}>
                      {item.status === CourseStatus.NOT_STARTED ? "NOT_STARTED" : item.status}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-brand-primary" style={{ width: `${item.progressPercent}%` }}></div>
                        </div>
                        <span className="text-xs text-slate-500">
                          {item.progressPercent >= 100
                            ? "100%"
                            : `${item.progressPercent}% (${100 - item.progressPercent}% incomplete)`}
                        </span>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-slate-700">
                    {item.score != null ? (
                      <span className="font-medium text-emerald-700">{item.score}%</span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-slate-500">{item.dueDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 text-sm md:flex-row md:items-center md:justify-between">
          <p className="text-slate-600">
            Showing {from}-{to} of {data.length}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="rounded border border-slate-300 px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Prev
            </button>
            <span className="min-w-20 text-center text-slate-600">
              Page {currentPage} / {totalPages}
            </span>
            <button
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              disabled={currentPage === totalPages}
              className="rounded border border-slate-300 px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};