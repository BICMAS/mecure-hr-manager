import React, { useState, useEffect } from "react";
import { User, Course } from "../types";
import { Calendar, Users, Book } from "lucide-react";
import { generateCourseDescription } from "../services/geminiService";
import { getAccessToken } from "../utils/auth";

import { getApiV1BaseUrl } from "@/lib/apiConfig";

const API_BASE = getApiV1BaseUrl();

interface CourseAssignmentProps {
  onAssignmentSuccess?: () => Promise<void> | void;
}

const normalizeUser = (u: any): User => ({
  id: u.id,
  name: u.name ?? u.fullName ?? "",
  email: u.email ?? "",
  role: u.role ?? u.userRole,
  department: u.department ?? "",
  group: u.group ?? "General",
  avatarUrl:
    u.avatarUrl ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      u.name ?? u.fullName ?? "User"
    )}&background=random`,
  points: u.points ?? 0,
});

const normalizeCourse = (c: any): Course => ({
  id: c.id,
  title: c.title,
  description: c.description ?? "",
  status: c.status,
});



export const CourseAssignment: React.FC<CourseAssignmentProps> = ({
  onAssignmentSuccess,
}) => {
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [deadline, setDeadline] = useState("");
  const [aiDescription, setAiDescription] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);

  


  /* --------------------------------
     🎯 Assign course (API)
  --------------------------------- */
  const handleAssign = async () => {
    if (!selectedCourseId || selectedUserIds.length === 0 || !deadline) return;

    try {
      setLoading(true);
      setError(null);

      const token = getAccessToken();
      if (!token) throw new Error("Not authenticated");

      const payload = {
        courseId: selectedCourseId,
        learnerIds: selectedUserIds,
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
        throw new Error(err.message || "Failed to assign course");
      }

      // ✅ Success
      setToast(`Course assigned to ${selectedUserIds.length} trainee(s)`);

      await onAssignmentSuccess?.();

      // Reset UI
      setSelectedUserIds([]);
      setSelectedCourseId("");
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
    const course = courses.find((c) => c.id === courseId);
    if (!course) return;

    setAiDescription("Generating description…");
    const desc = await generateCourseDescription(course.title);
    setAiDescription(desc);
  };

  /* --------------------------------
     👥 User selection
  --------------------------------- */
  const toggleUser = (id: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((u) => u !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelectedUserIds(
      selectedUserIds.length === users.length ? [] : users.map((u) => u.id)
    );
  };

  useEffect(() => {
  const fetchOrgUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = getAccessToken();
      if (!token) throw new Error("Not authenticated");

      const res = await fetch(
        `${API_BASE}/users/organization/users`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to fetch users");
      }

      const data = await res.json();
      setUsers(data.map(normalizeUser));
    } catch (err: any) {
      console.error("Failed to load org users:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  fetchOrgUsers();
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
                {c.title}
              </option>
            ))}
          </select>

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

        <button
          onClick={handleAssign}
          disabled={loading || !selectedCourseId || !deadline || selectedUserIds.length === 0}
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
            <Users className="w-5 h-5 text-brand-primary" /> Select Learners
          </h3>
          <span className="text-sm text-slate-500">
            {selectedUserIds.length} selected
          </span>
        </div>

        <div className="p-2 border-b">
          <button
            onClick={selectAll}
            className="text-sm text-brand-primary font-medium"
          >
            {selectedUserIds.length === users.length
              ? "Deselect All"
              : "Select All"}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 grid grid-cols-1 md:grid-cols-2 gap-2">
          {users.map((user) => (
            <div
              key={user.id}
              onClick={() => toggleUser(user.id)}
              className={`p-3 rounded border cursor-pointer flex items-center gap-3 ${
                selectedUserIds.includes(user.id)
                  ? "border-brand-primary bg-brand-primary/10"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <div
                className={`w-4 h-4 rounded border ${
                  selectedUserIds.includes(user.id)
                    ? "bg-brand-primary/100 border-brand-primary"
                    : "border-slate-400"
                }`}
              />
              <img
                src={user.avatarUrl}
                className="w-8 h-8 rounded-full"
                alt=""
              />
              <div>
                <p className="text-sm font-medium">{user.name}</p>
                <p className="text-xs text-slate-500">
                  {user.department} • {user.role}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SUCCESS TOAST */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-lg z-50">
          {toast}
        </div>
      )}
    </div>
  );
};
