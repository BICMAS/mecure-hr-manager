import React, { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  BarChart2,
  Award,
  LogOut,
  Menu,
  X,
  ClipboardList,
} from "lucide-react";

import { Dashboard } from "./components/Dashboard";
import { UserManagement } from "./components/UserManagement";
import { CourseAssignment } from "./components/CourseAssignment";
import { ProgressTracking } from "./components/ProgressTracking";
import { CertificateManagement } from "./components/CertificateManagement";
import { Login } from "./components/Login";

import { getAccessToken, clearAuth } from "./utils/auth";
import { fetchWithAuth, getTokenExpiryMs } from "./utils/fetchWithAuth";
import { FieldTasks } from "./components/FieldTasks";

enum View {
  DASHBOARD,
  USERS,
  ASSIGNMENTS,
  PROGRESS,
  CERTIFICATES,
  FIELD_TASKS,
}

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [currentView, setCurrentView] = useState<View>(View.DASHBOARD);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [progress, setProgress] = useState<any[]>([]);
  const [certificates, setCertificates] = useState<any[]>([]);

  const normalizeUser = (user: any) => ({
    id: user.id,
    name: user.fullName ?? user.name ?? "User",
    email: user.email ?? "",
    role: user.userRole ?? user.role,
    department: user.department ?? "",
    points:
      user.points ??
      user.totalPoints ??
      user.rewardPoints ??
      user.rewardsPoints ??
      0,
    avatarUrl:
      user.avatarUrl ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(
        user.fullName ?? user.name ?? "User",
      )}&background=random`,
  });

  const normalizeCourse = (course: any) => ({
    id: course.id,
    title: course.title ?? course.courseTitle ?? course.name ?? "",
    description: course.description ?? "",
    status: course.status ?? "",
    category: course.category ?? "",
  });

  const normalizeProgress = (row: any) => ({
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
    status:
      row.status ?? row.courseStatus ?? row.trackingStatus ?? "Not Started",
    progressPercent: (() => {
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
        row.totalLessons ??
          row.totalModules ??
          row.totalUnits ??
          row.totalItems,
      );
      if (Number.isFinite(completed) && Number.isFinite(total) && total > 0) {
        return Math.min((completed / total) * 100, 100);
      }

      const status = String(
        row.status ?? row.courseStatus ?? row.trackingStatus ?? "",
      ).toLowerCase();
      if (status === "completed") return 100;
      return 0;
    })(),
    score: row.score ?? undefined,
    attempts: row.attempts ?? 0,
    assignedDate: row.assignedDate ?? "",
    dueDate: row.dueDate ?? "",
    completedDate: row.completedDate ?? undefined,
    syncStatus: row.syncStatus ?? "Pending",
    userName:
      row.userName ?? row.learnerName ?? row.user?.fullName ?? row.user?.name,
    userDept: row.userDept ?? row.department ?? row.user?.department,
    courseTitle:
      row.courseTitle ??
      row.course_title ??
      row.courseName ??
      row.course_name ??
      row.moduleTitle ??
      row.assignment?.course?.title ??
      row.assignment?.course?.name ??
      row.assignment?.courseTitle ??
      row.enrollment?.course?.title ??
      row.enrollment?.course?.name ??
      row.enrollment?.courseTitle ??
      row.training?.title ??
      row.training?.name ??
      row.title ??
      row.course?.courseName ??
      row.course?.moduleTitle ??
      row.course?.name ??
      (typeof row.course === "string" ? row.course : row.course?.title) ??
      "",
    courseHint:
      row.course ?? row.assignment?.course ?? row.enrollment?.course ?? null,
  });

  const fetchSharedData = async (endpoint: string) => {
    const res = await fetchWithAuth(endpoint);

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `Failed to fetch ${endpoint}`);
    }

    const payload = await res.json().catch(() => null);
    return Array.isArray(payload) ? payload : (payload?.data ?? payload ?? []);
  };

  /* --------------------------------
     🔐 Auth bootstrap
  --------------------------------- */
  useEffect(() => {
    const token = getAccessToken();
    setIsAuthenticated(!!token);
  }, []);

  useEffect(() => {
    const onAuthExpired = () => {
      clearAuth();
      setCurrentView(View.DASHBOARD);
      setIsSidebarOpen(false);
      setIsAuthenticated(false);
    };

    window.addEventListener("mecure:auth-expired", onAuthExpired);
    return () => window.removeEventListener("mecure:auth-expired", onAuthExpired);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const token = getAccessToken();
    const expiryMs = getTokenExpiryMs(token);

    if (!expiryMs) {
      return;
    }

    const remainingMs = expiryMs - Date.now();
    if (remainingMs <= 0) {
      window.dispatchEvent(new Event("mecure:auth-expired"));
      return;
    }

    const timeoutId = window.setTimeout(() => {
      window.dispatchEvent(new Event("mecure:auth-expired"));
    }, remainingMs);

    return () => window.clearTimeout(timeoutId);
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const loadSharedData = async () => {
      try {
        const [usersRes, coursesRes, progressRes] = await Promise.all([
          fetchSharedData("/users/organization/users"),
          fetchSharedData("/courses"),
          fetchSharedData("/dashboard/hr/learners/course-tracking"),
        ]);

        const usersSource = Array.isArray(usersRes)
          ? usersRes
          : Array.isArray((usersRes as any)?.users)
            ? (usersRes as any).users
            : [];
        const coursesSource = Array.isArray(coursesRes)
          ? coursesRes
          : Array.isArray((coursesRes as any)?.courses)
            ? (coursesRes as any).courses
            : [];
        const progressSource = Array.isArray(progressRes)
          ? progressRes
          : Array.isArray((progressRes as any)?.progress)
            ? (progressRes as any).progress
            : [];

        const learnersSource = Array.isArray((progressRes as any)?.learners)
          ? (progressRes as any).learners
          : [];

        const learnerCourseLookup = new Map<
          string,
          { courseId: string; courseTitle: string; dueDate?: string }
        >();

        learnersSource.forEach((entry: any) => {
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
          const dueDate =
            unfinished?.dueDate ?? entry?.attempts?.[0]?.dueDate ?? "";

          if (courseId || courseTitle) {
            learnerCourseLookup.set(learnerId, {
              courseId,
              courseTitle,
              dueDate,
            });
          }
        });

        const usersList = usersSource.map(normalizeUser);
        const coursesList = coursesSource.map(normalizeCourse);
        const dedupedProgressMap = new Map<string, any>();
        progressSource.forEach((row: any) => {
          const normalized = normalizeProgress(row);
          const learnerId = normalized.userId || row.learnerId || row.userId;
          const lookup = learnerCourseLookup.get(learnerId);
          if (lookup) {
            normalized.courseId = normalized.courseId || lookup.courseId;
            normalized.courseTitle =
              normalized.courseTitle || lookup.courseTitle;
            normalized.dueDate = normalized.dueDate || lookup.dueDate || "";
          }
          const key = `${normalized.userId || "unknown-user"}::${normalized.courseId || "unknown-course"}`;
          const existing = dedupedProgressMap.get(key);
          if (
            !existing ||
            (normalized.progressPercent ?? 0) >= (existing.progressPercent ?? 0)
          ) {
            dedupedProgressMap.set(key, normalized);
          }
        });
        const progressList = Array.from(dedupedProgressMap.values());

        setUsers(usersList);
        setCourses(coursesList);
        setProgress(progressList);

        console.log("App shared users response:", usersRes);
        console.log("App shared courses response:", coursesRes);
        console.log("App shared progress response:", progressRes);
      } catch (err) {
        console.error("App shared data fetch error:", err);
      }
    };

    loadSharedData();
  }, [isAuthenticated]);

  /* --------------------------------
     📱 Responsive sidebar
  --------------------------------- */
  useEffect(() => {
    const handleResize = () => {
      setIsSidebarOpen(window.innerWidth >= 1024);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  /* --------------------------------
     🔓 Login
  --------------------------------- */
  const handleLogin = () => {
    setIsAuthenticated(true);
    setCurrentView(View.DASHBOARD);
  };

  /* --------------------------------
     🚪 Logout (HARD RESET)
  --------------------------------- */
  const handleLogout = () => {
    // 1. Kill tokens
    clearAuth();
    console.log("🧹 Tokens cleared:", {
      accessToken: getAccessToken(),
    });

    // 2. Reset ALL volatile UI state
    setCurrentView(View.DASHBOARD);
    setIsSidebarOpen(false);

    // 3. Unmount protected app
    setIsAuthenticated(false);
    console.log("🔐 isAuthenticated set to false");
  };

  /* --------------------------------
     🧭 Navigation Item
  --------------------------------- */
  const NavItem = ({
    view,
    icon,
    label,
  }: {
    view: View;
    icon: React.ReactNode;
    label: string;
  }) => (
    <button
      onClick={() => {
        setCurrentView(view);
        if (window.innerWidth < 1024) setIsSidebarOpen(false);
      }}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
        currentView === view
          ? "bg-brand-primary-dark text-white shadow-md"
          : "text-white hover:bg-slate-800"
      }`}
    >
      {icon}
      <span className="font-medium">{label}</span>
    </button>
  );

  if (!isAuthenticated) {
    console.log("🔒 Not authenticated → rendering <Login />");
    return <Login onLogin={handleLogin} />;
  }

  /* --------------------------------
     ⏳ Auth loading gate
  --------------------------------- */
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        Initializing session…
      </div>
    );
  }

  /* --------------------------------
     🔐 Login gate
  --------------------------------- */
  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  /* --------------------------------
     🏗️ Authenticated App Shell
  --------------------------------- */
  return (
    <div className="min-h-screen bg-slate-50 flex text-slate-900">
      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-30 w-64 bg-brand-primary text-white transform transition-transform duration-300 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="h-full flex flex-col p-4">
          <div className="px-2 py-6 border-b border-white/20 mb-6">
            <div className="bg-white/50 backdrop-blur-sm rounded-xl w-full flex items-center justify-center">
              <img
                src="/img/mecure-industries-logo.png"
                alt="MeCure Excellence Academy"
                className="h-20 md:h-32 mx-auto"
              />
            </div>
          </div>

          <nav className="flex-1 space-y-1">
            <NavItem
              view={View.DASHBOARD}
              icon={<LayoutDashboard size={20} />}
              label="Dashboard"
            />
            <NavItem
              view={View.USERS}
              icon={<Users size={20} />}
              label="User Management"
            />
            <NavItem
              view={View.ASSIGNMENTS}
              icon={<BookOpen size={20} />}
              label="Course Assignment"
            />
            <NavItem
              view={View.FIELD_TASKS}
              icon={<ClipboardList size={20} />}
              label="Field Tasks"
            />
            <NavItem
              view={View.PROGRESS}
              icon={<BarChart2 size={20} />}
              label="Progress Tracking"
            />
            <NavItem
              view={View.CERTIFICATES}
              icon={<Award size={20} />}
              label="Certificates"
            />
          </nav>

          <div className="pt-6 border-t border-white">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 hover:text-brand-accent transition"
            >
              <LogOut size={20} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-6 shadow-sm sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="lg:hidden text-slate-500"
            >
              {isSidebarOpen ? <X /> : <Menu />}
            </button>

            <h2 className="text-xl font-bold text-slate-800">
              {currentView === View.DASHBOARD && "Overview"}
              {currentView === View.USERS && "User Management"}
              {currentView === View.ASSIGNMENTS && "Assign Courses"}
              {currentView === View.FIELD_TASKS && "Field Tasks"}
              {currentView === View.PROGRESS && "Progress Reports"}
              {currentView === View.CERTIFICATES && "Certificates"}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              {/*<p className="text-sm font-semibold">Admin User</p>*/}
              <p className="text-xs text-slate-500">HR Manager</p>
            </div>
            <img
              src="https://ui-avatars.com/api/?name=Admin+User"
              className="w-10 h-10 rounded-full border"
              alt="Profile"
            />
          </div>
        </header>

        {/* View Area */}
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto">
            {currentView === View.DASHBOARD && <Dashboard users={users} />}
            {currentView === View.USERS && <UserManagement />}
            {currentView === View.ASSIGNMENTS && <CourseAssignment />}
            {currentView === View.FIELD_TASKS && <FieldTasks />}
            {currentView === View.PROGRESS && (
              <ProgressTracking
                users={users}
                courses={courses}
                progress={progress}
              />
            )}
            {currentView === View.CERTIFICATES && (
              <CertificateManagement
                users={users}
                courses={courses}
                certificates={certificates}
              />
            )}
          </div>
        </div>
      </main>

      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default App;
