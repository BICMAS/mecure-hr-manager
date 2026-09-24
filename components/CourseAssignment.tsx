import React, { useState, useEffect } from "react";
import { Course } from "../types";
import { Calendar, Users, Book, RotateCcw, AlertTriangle, X, Lock, Unlock } from "lucide-react";
import { generateCourseDescription } from "../services/geminiService";
import { getAccessToken } from "../utils/auth";
import {
  getCourseById,
  resetCourseProgress,
  lockCourse,
  unlockCourse,
  type ResetCourseProgressResult,
} from "../api/courses";
import {
  getCourseAssignees,
  type CourseAssignee,
} from "../api/assignments";
import { listBatches, type LearnerBatch } from "../api/batches";

import { getApiV1BaseUrl } from "@/lib/apiConfig";

const API_BASE = getApiV1BaseUrl();

interface CourseAssignmentProps {
  onAssignmentSuccess?: () => Promise<void> | void;
}

function categoryLabel(category: unknown): string {
  if (!category) return "";
  if (typeof category === "string") return category;
  if (typeof category === "object" && category !== null && "name" in category) {
    const name = (category as { name?: unknown }).name;
    return typeof name === "string" ? name : "";
  }
  return "";
}

const normalizeCourse = (c: any): Course => ({
  id: c.id,
  title: c.title,
  description: c.description ?? "",
  status: c.status,
  category: categoryLabel(c.category),
  isLocked: Boolean(c.isLocked),
});



export const CourseAssignment: React.FC<CourseAssignmentProps> = ({
  onAssignmentSuccess,
}) => {
  const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([]);
  const [batches, setBatches] = useState<LearnerBatch[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [deadline, setDeadline] = useState("");
  const [aiDescription, setAiDescription] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);

  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetPreview, setResetPreview] = useState<ResetCourseProgressResult | null>(null);
  const [deleteCertificates, setDeleteCertificates] = useState(true);
  const [newPacingStartDate, setNewPacingStartDate] = useState("");
  const [courseDetail, setCourseDetail] = useState<{
    modulePacingEnabled?: boolean;
    pacingStartDate?: string | null;
  } | null>(null);
  const [lockConfirmCourse, setLockConfirmCourse] = useState<Course | null>(null);
  const [lockingCourseId, setLockingCourseId] = useState<string | null>(null);
  const [assignees, setAssignees] = useState<CourseAssignee[]>([]);
  const [assigneesLoading, setAssigneesLoading] = useState(false);
  const [assigneesError, setAssigneesError] = useState<string | null>(null);

  const loadAssignees = async (courseId: string) => {
    if (!courseId) {
      setAssignees([]);
      setAssigneesError(null);
      return;
    }
    try {
      setAssigneesLoading(true);
      setAssigneesError(null);
      const result = await getCourseAssignees(courseId);
      setAssignees(result.assignees ?? []);
    } catch (err: unknown) {
      setAssignees([]);
      setAssigneesError(
        err instanceof Error ? err.message : "Failed to load assignees",
      );
    } finally {
      setAssigneesLoading(false);
    }
  };

  const formatAssigneeStatus = (status: string) => {
    const normalized = String(status || "").toUpperCase().replace(/\s+/g, "_");
    if (normalized === "COMPLETED" || normalized === "PASSED") return "Completed";
    if (normalized === "IN_PROGRESS") return "In progress";
    if (normalized === "FAILED") return "Failed";
    if (normalized === "NOT_STARTED") return "Not started";
    return status || "Not started";
  };

  const formatDate = (value?: string | null) => {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };


  /* --------------------------------
     🎯 Assign course (API)
  --------------------------------- */
  const handleAssign = async () => {
    if (!selectedCourseId || selectedBatchIds.length === 0 || !deadline) return;

    try {
      setLoading(true);
      setError(null);

      const token = getAccessToken();
      if (!token) throw new Error("Not authenticated");

      const payload = {
        courseId: selectedCourseId,
        batchIds: selectedBatchIds,
        dueDate: new Date(deadline).toISOString(),
      };

      const res = await fetch(`${API_BASE}/assignments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || err.message || "Failed to assign course");
      }

      const result = await res.json().catch(() => ({}));
      const assigned = Number(result.assigned ?? 0);
      const skipped = Number(result.skipped ?? 0);
      setToast(`Assigned ${assigned} trainee(s). Skipped ${skipped}.`);

      await onAssignmentSuccess?.();
      await loadAssignees(selectedCourseId);

      setSelectedBatchIds([]);
      setDeadline("");
      setAiDescription(null);

      setTimeout(() => setToast(null), 3000);
    } catch (err: any) {
      console.error("Assignment failed:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /* --------------------------------
     🤖 AI description
  --------------------------------- */
  const handleCourseSelect = async (courseId: string) => {
    setSelectedCourseId(courseId);
    setCourseDetail(null);
    setResetPreview(null);
    void loadAssignees(courseId);
    const course = courses.find((c) => c.id === courseId);
    if (!course) return;

    setAiDescription("Generating description…");
    const desc = await generateCourseDescription(course.title);
    setAiDescription(desc);

    if (courseId) {
      try {
        const detail = await getCourseById(courseId);
        setCourseDetail({
          modulePacingEnabled: detail.modulePacingEnabled,
          pacingStartDate: detail.pacingStartDate,
        });
        if (detail.pacingStartDate) {
          const dateStr = detail.pacingStartDate.slice(0, 10);
          setNewPacingStartDate(dateStr);
        } else {
          setNewPacingStartDate("");
        }
      } catch {
        // Course detail optional for assignment; reset needs it at confirm time
      }
    }
  };

  const selectedCourse = courses.find((c) => c.id === selectedCourseId);

  const openResetModal = async () => {
    if (!selectedCourseId) return;
    setResetModalOpen(true);
    setResetLoading(true);
    setResetPreview(null);
    setError(null);

    try {
      const detail = await getCourseById(selectedCourseId);
      setCourseDetail({
        modulePacingEnabled: detail.modulePacingEnabled,
        pacingStartDate: detail.pacingStartDate,
      });

      const preview = await resetCourseProgress(
        selectedCourseId,
        {
          deleteCertificates,
          resetModuleProgress: true,
          newPacingStartDate: detail.modulePacingEnabled && newPacingStartDate
            ? newPacingStartDate
            : undefined,
        },
        true,
      );
      setResetPreview(preview);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to preview reset";
      setError(message);
      setResetModalOpen(false);
    } finally {
      setResetLoading(false);
    }
  };

  const refreshResetPreview = async () => {
    if (!selectedCourseId || !resetModalOpen) return;
    setResetLoading(true);
    try {
      const preview = await resetCourseProgress(
        selectedCourseId,
        {
          deleteCertificates,
          resetModuleProgress: true,
          newPacingStartDate:
            courseDetail?.modulePacingEnabled && newPacingStartDate
              ? newPacingStartDate
              : undefined,
        },
        true,
      );
      setResetPreview(preview);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to preview reset";
      setError(message);
    } finally {
      setResetLoading(false);
    }
  };

  const applyCourseLockState = (courseId: string, isLocked: boolean) => {
    setCourses((prev) =>
      prev.map((course) => (course.id === courseId ? { ...course, isLocked } : course)),
    );
  };

  const handleUnlockCourse = async (course: Course) => {
    try {
      setLockingCourseId(course.id);
      await unlockCourse(course.id);
      applyCourseLockState(course.id, false);
      setToast(`${course.title} unlocked`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to unlock course");
    } finally {
      setLockingCourseId(null);
    }
  };

  const handleConfirmLockCourse = async () => {
    if (!lockConfirmCourse) return;
    try {
      setLockingCourseId(lockConfirmCourse.id);
      await lockCourse(lockConfirmCourse.id);
      applyCourseLockState(lockConfirmCourse.id, true);
      setToast(`${lockConfirmCourse.title} locked`);
      setLockConfirmCourse(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to lock course");
    } finally {
      setLockingCourseId(null);
    }
  };

  const handleConfirmReset = async () => {
    if (!selectedCourseId) return;
    setResetLoading(true);
    setError(null);

    try {
      const result = await resetCourseProgress(
        selectedCourseId,
        {
          deleteCertificates,
          resetModuleProgress: true,
          newPacingStartDate:
            courseDetail?.modulePacingEnabled && newPacingStartDate
              ? newPacingStartDate
              : undefined,
        },
        false,
      );

      const errorNote =
        result.errors.length > 0
          ? ` (${result.errors.length} learner error(s))`
          : "";

      setToast(
        `Reset complete: ${result.learnersProcessed} learner(s), ` +
          `${result.certificatesDeleted} certificate(s) removed, ` +
          `${result.scormAttemptsDeleted} SCORM attempt(s) cleared${errorNote}`,
      );
      setResetModalOpen(false);
      setResetPreview(null);
      setTimeout(() => setToast(null), 6000);

      await onAssignmentSuccess?.();
      await loadAssignees(selectedCourseId);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to reset progress";
      setError(message);
    } finally {
      setResetLoading(false);
    }
  };

  /* --------------------------------
     👥 User selection
  --------------------------------- */
  const toggleBatch = (id: string) => {
    setSelectedBatchIds((prev) =>
      prev.includes(id) ? prev.filter((batchId) => batchId !== id) : [...prev, id]
    );
  };

  useEffect(() => {
    const fetchBatches = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await listBatches();
        setBatches(data);
      } catch (err: any) {
        console.error("Failed to load batches:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchBatches();
  }, []);

useEffect(() => {
  const fetchCourses = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = getAccessToken();
      if (!token) throw new Error("Not authenticated");

      const res = await fetch(`${API_BASE}/courses`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to fetch courses");
      }

      const data = await res.json();

      // 👇 normalize + optionally filter
      const normalized = data
        .filter((c: any) => c.status === "PUBLISHED")
        .map(normalizeCourse);

      setCourses(normalized);
    } catch (err: any) {
      console.error("Failed to load courses:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  fetchCourses();
}, []);

  useEffect(() => {
    if (!resetModalOpen || !selectedCourseId || !resetPreview) return;
    const timer = setTimeout(() => {
      refreshResetPreview();
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deleteCertificates, newPacingStartDate]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* LEFT PANEL */}
      <div className="lg:col-span-1 space-y-6">
        {/* Course select */}
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <h3 className="font-bold mb-3 flex items-center gap-2">
            <Book className="w-5 h-5 text-brand-primary" /> Select Course
          </h3>

          <select
            className="w-full border p-2 rounded"
            value={selectedCourseId}
            onChange={(e) => handleCourseSelect(e.target.value)}
          >
            <option value="">-- Choose Course --</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.category ? `${c.title} (${c.category})` : c.title}
                {c.isLocked ? " — Locked" : ""}
              </option>
            ))}
          </select>

          {courses.length > 0 && (
            <ul className="mt-4 space-y-2 max-h-56 overflow-y-auto">
              {courses.map((course) => (
                <li
                  key={course.id}
                  className="flex items-center justify-between gap-2 border border-slate-200 rounded-lg px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{course.title}</p>
                    {course.isLocked && (
                      <span className="inline-block mt-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-white">
                        Locked
                      </span>
                    )}
                  </div>
                  {course.isLocked ? (
                    <button
                      type="button"
                      onClick={() => handleUnlockCourse(course)}
                      disabled={lockingCourseId === course.id}
                      className="shrink-0 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-emerald-200 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                    >
                      <Unlock className="w-3.5 h-3.5 inline mr-1" />
                      Unlock
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setLockConfirmCourse(course)}
                      disabled={lockingCourseId === course.id}
                      className="shrink-0 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-amber-200 text-amber-800 hover:bg-amber-50 disabled:opacity-50"
                    >
                      <Lock className="w-3.5 h-3.5 inline mr-1" />
                      Lock
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}

          {aiDescription && (
            <div className="mt-3 text-xs bg-brand-primary/10 p-3 rounded border">
              <strong>AI Summary:</strong> {aiDescription}
            </div>
          )}
        </div>

        {/* Settings */}
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <h3 className="font-bold mb-3 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-brand-primary" /> Settings
          </h3>

          <label className="block text-sm mb-1">Deadline</label>
          <input
            type="date"
            className="w-full border p-2 rounded"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />
        </div>

        {selectedCourseId && (
          <div className="bg-amber-50 p-6 rounded-lg border border-amber-200 shadow-sm">
            <h3 className="font-bold mb-2 flex items-center gap-2 text-amber-900">
              <RotateCcw className="w-5 h-5" /> Reset learner progress
            </h3>
            <p className="text-xs text-amber-800 mb-3">
              Use after Super Admin publishes an updated SCORM version. All assigned
              learners in your organization will return to 0% / Not Started.
              Assignments are kept.
            </p>
            <button
              type="button"
              onClick={openResetModal}
              disabled={loading || resetLoading}
              className="w-full py-2.5 border border-amber-400 text-amber-900 rounded-lg font-medium hover:bg-amber-100 disabled:opacity-50"
            >
              Reset all learner progress…
            </button>
          </div>
        )}

        <button
          onClick={handleAssign}
          disabled={loading || !selectedCourseId || !deadline || selectedBatchIds.length === 0}
          className="w-full py-3 bg-brand-primary text-white rounded-lg font-medium hover:bg-brand-primary-dark disabled:bg-slate-300"
        >
          {loading ? "Assigning…" : "Assign Course"}
        </button>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      {/* RIGHT PANEL */}
      <div className="lg:col-span-2 bg-white rounded-lg border shadow-sm flex flex-col h-[600px]">
        <div className="p-4 border-b bg-slate-50 flex justify-between">
          <h3 className="font-bold flex items-center gap-2">
            <Users className="w-5 h-5 text-brand-primary" /> Select Batches
          </h3>
          <span className="text-sm text-slate-500">
            {selectedBatchIds.length} selected
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {batches.length === 0 ? (
            <p className="text-sm text-slate-500">
              No batches yet. Create a batch in User Management, then assign learners to it.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {batches.map((batch) => (
                <button
                  key={batch.id}
                  type="button"
                  onClick={() => toggleBatch(batch.id)}
                  className={`p-3 rounded border text-left flex items-center gap-3 ${
                    selectedBatchIds.includes(batch.id)
                      ? "border-brand-primary bg-brand-primary/10"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded border ${
                      selectedBatchIds.includes(batch.id)
                        ? "bg-brand-primary border-brand-primary"
                        : "border-slate-400"
                    }`}
                  />
                  <p className="text-sm font-medium">{batch.name}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedCourseId && (
        <div className="lg:col-span-3 bg-white rounded-lg border shadow-sm">
          <div className="p-4 border-b bg-slate-50 flex items-center justify-between gap-3">
            <div>
              <h3 className="font-bold flex items-center gap-2">
                <Users className="w-5 h-5 text-brand-primary" />
                Assigned trainees
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {selectedCourse
                  ? `Read-only list for ${selectedCourse.title}`
                  : "Read-only list for the selected course"}
              </p>
            </div>
            <span className="text-sm text-slate-600">
              {assigneesLoading ? "Loading…" : `${assignees.length} assigned`}
            </span>
          </div>

          {assigneesError && (
            <p className="p-4 text-sm text-red-600">{assigneesError}</p>
          )}

          {!assigneesLoading && !assigneesError && assignees.length === 0 && (
            <p className="p-6 text-sm text-slate-500 text-center">
              No trainees in your organization are assigned to this course yet.
            </p>
          )}

          {!assigneesLoading && assignees.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-medium">Trainee</th>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">Assigned</th>
                    <th className="px-4 py-3 font-medium">Due</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Progress</th>
                  </tr>
                </thead>
                <tbody>
                  {assignees.map((row) => (
                    <tr
                      key={row.assignmentId}
                      className="border-t border-slate-100"
                    >
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {row.fullName}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{row.email}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {formatDate(row.assignedAt)}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {formatDate(row.dueDate)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                          {formatAssigneeStatus(row.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {Math.round(row.progress)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SUCCESS TOAST */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-lg z-50 max-w-md">
          {toast}
        </div>
      )}

      {lockConfirmCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-5 border-b">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Lock className="w-5 h-5 text-amber-600" />
                Lock this course?
              </h2>
              <p className="text-sm text-slate-600 mt-2">
                Learners will still see <strong>{lockConfirmCourse.title}</strong>, but they
                will not be able to start, continue, or claim a new certificate.
                Existing progress is kept.
              </p>
            </div>
            <div className="flex gap-3 p-5 bg-slate-50 rounded-b-xl">
              <button
                type="button"
                onClick={() => setLockConfirmCourse(null)}
                disabled={lockingCourseId === lockConfirmCourse.id}
                className="flex-1 py-2.5 border rounded-lg font-medium hover:bg-white disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmLockCourse}
                disabled={lockingCourseId === lockConfirmCourse.id}
                className="flex-1 py-2.5 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 disabled:bg-slate-300"
              >
                {lockingCourseId === lockConfirmCourse.id ? "Locking…" : "Lock course"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESET PROGRESS MODAL */}
      {resetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between p-5 border-b">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  Reset all learner progress
                </h2>
                <p className="text-sm text-slate-600 mt-1">
                  {selectedCourse?.title ?? "Selected course"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setResetModalOpen(false)}
                className="p-1 rounded hover:bg-slate-100"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-sm text-slate-600">
                Run this <strong>after</strong> the updated SCORM course is published.
                Learners will start fresh on their next launch.
              </p>

              {resetLoading && !resetPreview ? (
                <p className="text-sm text-slate-500">Loading preview…</p>
              ) : resetPreview ? (
                <div className="bg-slate-50 rounded-lg p-4 text-sm space-y-1">
                  <p>
                    <strong>{resetPreview.learnersProcessed}</strong> learner(s) will be
                    reset
                  </p>
                  <p>{resetPreview.certificatesDeleted} certificate(s) removed</p>
                  <p>{resetPreview.scormAttemptsDeleted} SCORM attempt(s) cleared</p>
                  <p>{resetPreview.moduleProgressReset} module progress row(s) reset</p>
                </div>
              ) : null}

              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={deleteCertificates}
                  onChange={(e) => setDeleteCertificates(e.target.checked)}
                  className="mt-1"
                />
                <span className="text-sm">
                  Remove issued certificates (required for progress to show 0%)
                </span>
              </label>

              {courseDetail?.modulePacingEnabled && (
                <div>
                  <label className="block text-sm mb-1">
                    New module pacing start date (optional)
                  </label>
                  <input
                    type="date"
                    className="w-full border p-2 rounded"
                    value={newPacingStartDate}
                    onChange={(e) => setNewPacingStartDate(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className="flex gap-3 p-5 border-t bg-slate-50 rounded-b-xl">
              <button
                type="button"
                onClick={() => setResetModalOpen(false)}
                disabled={resetLoading}
                className="flex-1 py-2.5 border rounded-lg font-medium hover:bg-white disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReset}
                disabled={resetLoading || !resetPreview}
                className="flex-1 py-2.5 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 disabled:bg-slate-300"
              >
                {resetLoading ? "Resetting…" : "Confirm reset"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
