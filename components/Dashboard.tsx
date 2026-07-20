import React, { useState, useEffect, useRef } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { User, UserRole } from "../types";
import {
  Users,
  BookOpen,
  AlertCircle,
  CheckCircle,
  Wand2,
  Megaphone,
  Plus,
  Trophy,
  Star,
  TrendingUp,
  Search,
  X,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { generateHRInsight } from "../services/geminiService";
import { getAccessToken, getCurrentUserName } from "@/utils/auth";
import { awardPointsToLearner } from "@/api/rewards";
import { getApiV1BaseUrl } from "@/lib/apiConfig";

const API_BASE = getApiV1BaseUrl();

const COLORS = ["#0056A6", "#69BE28", "#F5A623", "#D32F2F", "#1A6BB8"];

interface DashboardStats {
  totalLearners: number;
  averageCompletion: number;
  overdueCourses: number;
  activeAssignments: number;
  topPerformers: User[];
  scoreLeaderboard?: {
    enabled: boolean;
    entries: Array<{
      rank: number;
      id: string;
      name: string;
      department?: string | null;
      value: number;
      label: string;
    }>;
  };
  pointsLeaderboard?: {
    enabled: boolean;
    entries: Array<{
      rank: number;
      id: string;
      name: string;
      department?: string | null;
      value: number;
      label: string;
    }>;
  };
  completionByDepartment: {
    name: string;
    completed: number;
    pending: number;
  }[];
  courseStatus: Record<string, number>;
}

interface Announcement {
  id: string;
  text: string;
  createdAt: string;
  updatedAt?: string;
  user?: {
    fullName: string;
  };
}

interface AnnouncementMeta {
  total: number;
  limit: number;
  offset: number;
  page: number;
  pageCount: number;
  hasMore: boolean;
}

const ANNOUNCEMENTS_PAGE_SIZE = 5;

const userName = getCurrentUserName();

interface DashboardProps {
  users?: User[];
}

export const Dashboard: React.FC<DashboardProps> = ({ users = [] }) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [insight, setInsight] = useState("");
  const [loadingInsight, setLoadingInsight] = useState(false);

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [announcementMeta, setAnnouncementMeta] = useState<AnnouncementMeta>({
    total: 0,
    limit: ANNOUNCEMENTS_PAGE_SIZE,
    offset: 0,
    page: 1,
    pageCount: 0,
    hasMore: false,
  });
  const [announcementPage, setAnnouncementPage] = useState(1);
  const [announcementsLoading, setAnnouncementsLoading] = useState(false);
  const [announcementError, setAnnouncementError] = useState<string | null>(null);
  const [announcementBusyId, setAnnouncementBusyId] = useState<string | null>(
    null,
  );

  const hasLoggedDashboardRef = useRef(false);

  const [newAnnouncement, setNewAnnouncement] = useState("");
  const [showAnnounceInput, setShowAnnounceInput] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");

  // Award Points State
  const [isPointsModalOpen, setIsPointsModalOpen] = useState(false);
  const [pointSearch, setPointSearch] = useState("");
  const [pointsToAward, setPointsToAward] = useState(10);
  const [selectedUsersForPoints, setSelectedUsersForPoints] = useState<string[]>(
    [],
  );
  const [awardingPoints, setAwardingPoints] = useState(false);
  const [awardPointsMessage, setAwardPointsMessage] = useState<string | null>(null);
  const [awardPointsError, setAwardPointsError] = useState<string | null>(null);
  const [awardPointsFailures, setAwardPointsFailures] = useState<
    { learnerName: string; error: string }[]
  >([]);
  const [leaderboardMetric, setLeaderboardMetric] = useState<"points" | "score">("score");

  const learnersForPoints = users.filter((u) => {
    const role = String((u as any).role ?? (u as any).userRole ?? "").toUpperCase();
    return role === "LEARNER";
  });
  const filteredLearnersForPoints = learnersForPoints.filter((u) =>
    (u.name ?? "").toLowerCase().includes(pointSearch.toLowerCase()),
  );

  const getPerformerPoints = (performer: any) => {
    const direct =
      performer?.points ??
      performer?.totalPoints ??
      performer?.rewardPoints ??
      performer?.rewardsPoints;
    if (typeof direct === "number") return direct;

    const matchedUser = users.find((u) => u.id === performer?.id);
    const fallback =
      (matchedUser as any)?.points ??
      (matchedUser as any)?.totalPoints ??
      (matchedUser as any)?.rewardPoints ??
      (matchedUser as any)?.rewardsPoints;
    return typeof fallback === "number" ? fallback : 0;
  };

  const getPerformerMetric = (performer: any) => {
    if (leaderboardMetric === "score") {
      return typeof performer?.avgScore === "number" ? performer.avgScore : 0;
    }
    return getPerformerPoints(performer);
  };

  const leaderboardEntries =
    leaderboardMetric === "score"
      ? stats?.scoreLeaderboard?.entries ?? []
      : stats?.pointsLeaderboard?.entries ?? [];

  const sortedTopPerformers =
    leaderboardEntries.length > 0
      ? leaderboardEntries
      : [...(stats?.topPerformers ?? [])].sort(
          (a, b) => getPerformerMetric(b) - getPerformerMetric(a),
        );

  const fetchAnnouncements = async (page = announcementPage) => {
    try {
      setAnnouncementsLoading(true);
      setAnnouncementError(null);
      const token = getAccessToken();

      const params = new URLSearchParams({
        page: String(page),
        limit: String(ANNOUNCEMENTS_PAGE_SIZE),
      });

      const res = await fetch(`${API_BASE}/announcements?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error("Failed to fetch announcements");

      const result = await res.json();
      const list = Array.isArray(result.data) ? result.data : [];
      const meta = result.meta ?? {};

      setAnnouncements(list);
      setAnnouncementPage(meta.page ?? page);
      setAnnouncementMeta({
        total: meta.total ?? list.length,
        limit: meta.limit ?? ANNOUNCEMENTS_PAGE_SIZE,
        offset: meta.offset ?? 0,
        page: meta.page ?? page,
        pageCount: meta.pageCount ?? 0,
        hasMore: Boolean(meta.hasMore),
      });
    } catch (err) {
      console.error("Announcements fetch error:", err);
      setAnnouncementError("Failed to load announcements.");
    } finally {
      setAnnouncementsLoading(false);
    }
  };

  const fetchDashboardData = async (withAnnouncements = false) => {
    try {
      setLoading(true);
      const token = getAccessToken();
      if (!token) throw new Error("Not authenticated");

      const res = await fetch(`${API_BASE}/dashboard/hr`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error("Failed to fetch dashboard data");

      const data = await res.json();

      if (!hasLoggedDashboardRef.current) {
        console.log("Dashboard /dashboard/hr response:", data);
        hasLoggedDashboardRef.current = true;
      }

      setStats(data);

      if (withAnnouncements) {
        await fetchAnnouncements();
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData(true);
  }, []);

  const handlePostAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newAnnouncement.trim()) return;

    try {
      setAnnouncementError(null);
      const token = getAccessToken();

      const res = await fetch(`${API_BASE}/announcements`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          text: newAnnouncement,
        }),
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || "Failed to post announcement");
      }

      setNewAnnouncement("");
      setShowAnnounceInput(false);
      await fetchAnnouncements(1);
    } catch (err) {
      console.error(err);
      setAnnouncementError(
        err instanceof Error ? err.message : "Failed to post announcement",
      );
    }
  };

  const startEditAnnouncement = (announcement: Announcement) => {
    setEditingId(announcement.id);
    setEditingText(announcement.text);
    setShowAnnounceInput(false);
    setAnnouncementError(null);
  };

  const cancelEditAnnouncement = () => {
    setEditingId(null);
    setEditingText("");
  };

  const handleUpdateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId || !editingText.trim()) return;

    try {
      setAnnouncementBusyId(editingId);
      setAnnouncementError(null);
      const token = getAccessToken();

      const res = await fetch(`${API_BASE}/announcements/${editingId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text: editingText }),
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || "Failed to update announcement");
      }

      setAnnouncements((prev) =>
        prev.map((item) =>
          item.id === editingId ? { ...item, ...result.data } : item,
        ),
      );
      cancelEditAnnouncement();
    } catch (err) {
      console.error(err);
      setAnnouncementError(
        err instanceof Error ? err.message : "Failed to update announcement",
      );
    } finally {
      setAnnouncementBusyId(null);
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (!window.confirm("Delete this announcement?")) return;

    try {
      setAnnouncementBusyId(id);
      setAnnouncementError(null);
      const token = getAccessToken();

      const res = await fetch(`${API_BASE}/announcements/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await res.json().catch(() => ({}));
      if (!res.ok || result.success === false) {
        throw new Error(result.error || "Failed to delete announcement");
      }

      const nextPage =
        announcements.length === 1 && announcementPage > 1
          ? announcementPage - 1
          : announcementPage;
      await fetchAnnouncements(nextPage);
      if (editingId === id) cancelEditAnnouncement();
    } catch (err) {
      console.error(err);
      setAnnouncementError(
        err instanceof Error ? err.message : "Failed to delete announcement",
      );
    } finally {
      setAnnouncementBusyId(null);
    }
  };

  const handleGenerateReport = async () => {
    if (!stats) return;

    setLoadingInsight(true);

    const context = JSON.stringify({
      totalLearners: stats.totalLearners,
      overdueCourses: stats.overdueCourses,
      averageCompletion: stats.averageCompletion,
      completionByDepartment: stats.completionByDepartment,
    });

    const result = await generateHRInsight(
      context,
      "Provide a concise executive summary identifying risk areas and an action plan.",
    );

    setInsight(result);
    setLoadingInsight(false);
  };

  const handleAwardPoints = async () => {
    if (selectedUsersForPoints.length === 0) return;

    if (!Number.isFinite(pointsToAward) || pointsToAward <= 0) {
      setAwardPointsError("Points must be greater than 0.");
      return;
    }

    try {
      setAwardingPoints(true);
      setAwardPointsError(null);
      setAwardPointsMessage(null);
      setAwardPointsFailures([]);

      const awardResults = await Promise.allSettled(
        selectedUsersForPoints.map((learnerId) =>
          awardPointsToLearner(learnerId, pointsToAward),
        ),
      );
      console.log("POST /rewards/award bulk responses:", awardResults);

      const successCount = awardResults.filter(
        (result) => result.status === "fulfilled",
      ).length;
      const failCount = awardResults.length - successCount;

      const failures = awardResults
        .map((result, index) => {
          if (result.status !== "rejected") return null;
          const learnerId = selectedUsersForPoints[index];
          const learner = learnersForPoints.find((u) => u.id === learnerId);
          const errorText =
            result.reason instanceof Error
              ? result.reason.message
              : String(result.reason ?? "Failed to award points");
          return {
            learnerName: learner?.name ?? "Unknown learner",
            error: errorText,
          };
        })
        .filter(Boolean) as { learnerName: string; error: string }[];

      setAwardPointsMessage(
        failCount === 0
          ? `Points awarded to ${successCount} learner(s).`
          : `Awarded ${successCount} learner(s), ${failCount} failed.`,
      );
      setAwardPointsFailures(failures);
      setSelectedUsersForPoints([]);
      setPointsToAward(10);
      setPointSearch("");

      // Immediately refresh leaderboard/top performers and summary cards.
      await fetchDashboardData(false);
    } catch (err) {
      console.error("Award points error:", err);
      setAwardPointsError(
        err instanceof Error ? err.message : "Failed to award points",
      );
      setAwardPointsFailures([]);
    } finally {
      setAwardingPoints(false);
    }
  };

  const toggleLearnerForPoints = (learnerId: string) => {
    setSelectedUsersForPoints((prev) =>
      prev.includes(learnerId)
        ? prev.filter((id) => id !== learnerId)
        : [...prev, learnerId],
    );
  };

  const toggleSelectAllFilteredLearners = () => {
    const filteredIds = filteredLearnersForPoints.map((u) => u.id);
    const allSelected = filteredIds.every((id) =>
      selectedUsersForPoints.includes(id),
    );
    if (allSelected) {
      setSelectedUsersForPoints((prev) =>
        prev.filter((id) => !filteredIds.includes(id)),
      );
    } else {
      setSelectedUsersForPoints((prev) => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  if (loading || !stats) {
    return (
      <div className="p-8 text-center text-slate-500">Loading dashboard…</div>
    );
  }

  const statusData = Object.entries(stats.courseStatus).map(
    ([name, value]) => ({ name, value }),
  );
  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-brand-primary rounded-2xl p-8 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Good Morning, {userName}</h1>
          <p className="text-white/80 mt-1">
            Here is what's happening at MeCure Excellence Academy today.
          </p>
        </div>
        <button
          onClick={() => setIsPointsModalOpen(true)}
          className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-slate-900 px-6 py-3 rounded-xl font-bold shadow-lg transition transform hover:scale-105"
        >
          <Trophy className="w-5 h-5" /> Award Points
        </button>
      </div>

      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Users className="w-6 h-6 text-white" />}
          title="Total Learners"
          value={stats.totalLearners}
          gradient="bg-gradient-to-br from-brand-primary to-brand-primary-dark"
        />
        <StatCard
          icon={<CheckCircle className="w-6 h-6 text-white" />}
          title="Avg. Completion"
          value={`${stats.averageCompletion}%`}
          gradient="bg-gradient-to-br from-emerald-500 to-emerald-600"
        />
        <StatCard
          icon={<AlertCircle className="w-6 h-6 text-white" />}
          title="Overdue Courses"
          value={stats.overdueCourses}
          gradient="bg-gradient-to-br from-rose-500 to-rose-600"
        />
        <StatCard
          icon={<BookOpen className="w-6 h-6 text-white" />}
          title="Active Assignments"
          value={stats.activeAssignments}
          gradient="bg-gradient-to-br from-violet-500 to-violet-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: AI & Charts */}
        <div className="lg:col-span-2 space-y-6">
          {/* AI Insight Section 
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition">
              <Wand2 className="w-24 h-24 text-brand-primary" />
            </div>
            <div className="flex justify-between items-start mb-4 relative z-10">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-brand-primary/10 rounded-lg">
                  <Wand2 className="w-5 h-5 text-brand-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">
                    AI Executive Insight
                  </h3>
                  <p className="text-xs text-slate-500">Powered by Gemini</p>
                </div>
              </div>
              <button
                onClick={handleGenerateReport}
                disabled={loadingInsight}
                className="px-4 py-2 bg-slate-900 text-white hover:bg-slate-800 rounded-lg text-sm font-medium transition shadow-md disabled:opacity-50"
              >
                {loadingInsight ? "Analyzing Data..." : "Generate Report"}
              </button>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 min-h-[100px]">
              {insight ? (
                <div className="prose prose-sm max-w-none">
                  <p className="whitespace-pre-line text-slate-700 leading-relaxed">
                    {insight}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 py-4">
                  <TrendingUp className="w-8 h-8 mb-2 opacity-50" />
                  <p className="text-sm italic">
                    Click generate to analyze current completion trends across
                    departments.
                  </p>
                </div>
              )}
            </div>
          </div>*/}

          {/* Charts Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-lg font-bold text-slate-800 mb-6">
                Completion by Department
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={stats.completionByDepartment}
                    layout="vertical"
                    margin={{ left: 10 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      horizontal={false}
                      stroke="#e2e8f0"
                    />
                    <XAxis type="number" hide />
                    <YAxis
                      dataKey="name"
                      type="category"
                      width={80}
                      tick={{ fontSize: 11, fill: "#64748b" }}
                    />
                    <Tooltip
                      cursor={{ fill: "#f8fafc" }}
                      contentStyle={{
                        borderRadius: "12px",
                        border: "none",
                        boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                      }}
                    />
                    <Bar
                      dataKey="completed"
                      stackId="a"
                      fill="#10b981"
                      radius={[0, 4, 4, 0]}
                      barSize={20}
                    />
                    <Bar
                      dataKey="pending"
                      stackId="a"
                      fill="#e2e8f0"
                      radius={[0, 4, 4, 0]}
                      barSize={20}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-lg font-bold text-slate-800 mb-6">
                Course Status
              </h3>
              <div className="h-64 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {statusData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: "12px",
                        border: "none",
                        boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                      }}
                    />
                    <Legend
                      iconType="circle"
                      wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Leaderboard & Announcements */}
        <div className="space-y-6">
          {/* Leaderboard */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-amber-500 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-white" />
                <h3 className="font-bold">Top Performers</h3>
              </div>
              <div className="flex rounded-lg bg-white/20 p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setLeaderboardMetric("score")}
                  className={`rounded px-2 py-1 ${
                    leaderboardMetric === "score" ? "bg-white text-amber-700" : "text-white"
                  }`}
                >
                  Quiz
                </button>
                <button
                  type="button"
                  onClick={() => setLeaderboardMetric("points")}
                  className={`rounded px-2 py-1 ${
                    leaderboardMetric === "points" ? "bg-white text-amber-700" : "text-white"
                  }`}
                >
                  Coins
                </button>
              </div>
            </div>
            <div className="divide-y divide-slate-100">
              {sortedTopPerformers.map((user, index) => (
                <div
                  key={user.id}
                  className="p-4 flex items-center gap-3 hover:bg-slate-50 transition"
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                      (user as any).rank === 1 || index === 0
                        ? "bg-yellow-100 text-yellow-700"
                        : (user as any).rank === 2 || index === 1
                          ? "bg-slate-100 text-slate-700"
                          : (user as any).rank === 3 || index === 2
                            ? "bg-orange-100 text-orange-700"
                            : "bg-white text-slate-500 border border-slate-100"
                    }`}
                  >
                    {(user as any).rank ?? index + 1}
                  </div>
                  <img
                    src={(user as any).avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent((user as any).name || (user as any).fullName || "User")}&background=random`}
                    alt=""
                    className="w-10 h-10 rounded-full border border-slate-100"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      {(user as any).name || (user as any).fullName}
                    </p>
                    <p className="text-xs text-slate-500">{(user as any).department || "—"}</p>
                  </div>
                  <div className="text-right">
                    <span className="block font-bold text-slate-800">
                      {(user as any).label ??
                        (leaderboardMetric === "score"
                          ? `${getPerformerMetric(user)}%`
                          : getPerformerPoints(user))}
                    </span>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                      {leaderboardMetric === "score" ? "avg quiz" : "pts"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Announcements */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-rose-500" />
                <h3 className="font-bold text-slate-800">Announcements</h3>
              </div>
              <button
                onClick={() => {
                  setShowAnnounceInput(!showAnnounceInput);
                  if (!showAnnounceInput) cancelEditAnnouncement();
                }}
                className="p-1 hover:bg-slate-100 rounded-full text-slate-500"
                aria-label={
                  showAnnounceInput ? "Close new announcement" : "New announcement"
                }
              >
                {showAnnounceInput ? (
                  <X className="w-4 h-4" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
              </button>
            </div>

            {announcementError && (
              <p className="mb-3 text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">
                {announcementError}
              </p>
            )}

            {showAnnounceInput && (
              <form
                className="mb-4 animate-fade-in"
                onSubmit={handlePostAnnouncement}
              >
                <textarea
                  className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-brand-primary focus:outline-none resize-none"
                  rows={2}
                  placeholder="Type announcement..."
                  value={newAnnouncement}
                  onChange={(e) => setNewAnnouncement(e.target.value)}
                />
                <button
                  type="submit"
                  className="mt-2 w-full bg-slate-900 text-white text-xs font-bold py-2 rounded-lg hover:bg-slate-800"
                >
                  Post Message
                </button>
              </form>
            )}

            <div className="space-y-3">
              {announcementsLoading && announcements.length === 0 ? (
                <p className="text-sm text-slate-500 py-4 text-center">
                  Loading announcements...
                </p>
              ) : announcements.length === 0 ? (
                <p className="text-sm text-slate-500 py-4 text-center">
                  No announcements yet.
                </p>
              ) : (
                announcements.map((announcement) => (
                  <div
                    key={announcement.id}
                    className="p-3 bg-slate-50 border border-slate-100 rounded-lg text-sm text-slate-700 leading-snug relative pl-4 border-l-4 border-l-brand-accent"
                  >
                    {editingId === announcement.id ? (
                      <form onSubmit={handleUpdateAnnouncement} className="space-y-2">
                        <textarea
                          className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-brand-primary focus:outline-none resize-none"
                          rows={3}
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          disabled={announcementBusyId === announcement.id}
                        />
                        <div className="flex gap-2">
                          <button
                            type="submit"
                            disabled={
                              !editingText.trim() ||
                              announcementBusyId === announcement.id
                            }
                            className="flex-1 bg-brand-primary text-white text-xs font-bold py-1.5 rounded-lg hover:opacity-90 disabled:opacity-50"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={cancelEditAnnouncement}
                            disabled={announcementBusyId === announcement.id}
                            className="flex-1 border border-slate-200 text-slate-600 text-xs font-bold py-1.5 rounded-lg hover:bg-slate-100"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <div className="flex items-start justify-between gap-2">
                          <p className="flex-1">{announcement.text}</p>
                          <div className="flex shrink-0 gap-1">
                            <button
                              type="button"
                              onClick={() => startEditAnnouncement(announcement)}
                              disabled={announcementBusyId === announcement.id}
                              className="p-1 rounded text-slate-400 hover:text-brand-primary hover:bg-white"
                              aria-label="Edit announcement"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleDeleteAnnouncement(announcement.id)
                              }
                              disabled={announcementBusyId === announcement.id}
                              className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-white"
                              aria-label="Delete announcement"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <span className="block text-[10px] text-slate-400 mt-1">
                          {new Date(announcement.createdAt).toLocaleDateString()}
                          {announcement.user &&
                            ` • ${announcement.user.fullName}`}
                        </span>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>

            {announcementMeta.total > 0 && (
              <div className="mt-4 flex items-center justify-between gap-2 text-xs text-slate-500">
                <span>
                  {announcementMeta.total === 0
                    ? "0"
                    : `${announcementMeta.offset + 1}–${Math.min(
                        announcementMeta.offset + announcements.length,
                        announcementMeta.total,
                      )}`}{" "}
                  of {announcementMeta.total}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => fetchAnnouncements(announcementPage - 1)}
                    disabled={announcementPage <= 1 || announcementsLoading}
                    className="inline-flex items-center gap-0.5 rounded border border-slate-300 px-2 py-1 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    Prev
                  </button>
                  <span className="px-1">
                    {announcementPage} /{" "}
                    {Math.max(1, announcementMeta.pageCount)}
                  </span>
                  <button
                    type="button"
                    onClick={() => fetchAnnouncements(announcementPage + 1)}
                    disabled={
                      announcementsLoading ||
                      announcementPage >=
                        Math.max(1, announcementMeta.pageCount)
                    }
                    className="inline-flex items-center gap-0.5 rounded border border-slate-300 px-2 py-1 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Award Points Modal */}
      {isPointsModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-slate-900 p-4 flex justify-between items-center">
              <h3 className="text-white font-bold text-lg flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-400" /> Award Points
              </h3>
              <button
                onClick={() => setIsPointsModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Select Learner(s)
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search name..."
                    className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:outline-none mb-2"
                    value={pointSearch}
                    onChange={(e) => setPointSearch(e.target.value)}
                  />
                </div>
                <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg">
                  <div className="flex items-center justify-between border-b border-slate-100 px-2 py-1.5 text-xs">
                    <span className="text-slate-500">
                      {selectedUsersForPoints.length} selected
                    </span>
                    <button
                      type="button"
                      onClick={toggleSelectAllFilteredLearners}
                      className="text-brand-primary hover:text-brand-primary-dark font-medium"
                    >
                      Toggle all filtered
                    </button>
                  </div>
                  {filteredLearnersForPoints.map((u) => (
                    <div
                      key={u.id}
                      onClick={() => toggleLearnerForPoints(u.id)}
                      className={`p-2 flex items-center gap-3 cursor-pointer hover:bg-slate-50 ${selectedUsersForPoints.includes(u.id) ? "bg-brand-primary/10 border-l-4 border-brand-primary" : ""}`}
                    >
                      <img
                        src={u.avatarUrl}
                        className="w-8 h-8 rounded-full"
                        alt=""
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{u.name}</p>
                        <p className="text-xs text-slate-500">{u.department}</p>
                      </div>
                      {selectedUsersForPoints.includes(u.id) && (
                        <CheckCircle className="w-4 h-4 text-brand-primary" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Points Amount
                </label>
                <input
                  type="number"
                  min={1}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-primary"
                  value={pointsToAward}
                  onChange={(e) => setPointsToAward(Number(e.target.value))}
                />
              </div>

              {awardPointsError && (
                <p className="text-sm text-red-600">{awardPointsError}</p>
              )}

              {awardPointsMessage && (
                <p className="text-sm text-emerald-600">{awardPointsMessage}</p>
              )}

              {awardPointsFailures.length > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-800">
                    Failed Awards ({awardPointsFailures.length})
                  </p>
                  <div className="max-h-28 space-y-1 overflow-y-auto pr-1 text-xs">
                    {awardPointsFailures.map((failure, index) => (
                      <p key={`${failure.learnerName}-${index}`} className="text-amber-900">
                        <span className="font-semibold">{failure.learnerName}:</span>{" "}
                        {failure.error}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={handleAwardPoints}
                disabled={selectedUsersForPoints.length === 0 || awardingPoints}
                className="w-full bg-brand-primary hover:bg-brand-primary-dark text-white font-bold py-3 rounded-lg disabled:bg-slate-300 disabled:cursor-not-allowed transition"
              >
                {awardingPoints ? "Awarding..." : `Award ${pointsToAward} points`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard = ({
  icon,
  title,
  value,
  gradient,
}: {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  gradient: string;
}) => (
  <div
    className={`p-6 rounded-2xl shadow-lg text-white ${gradient} relative overflow-hidden group`}
  >
    <div className="absolute top-0 right-0 -mt-2 -mr-2 w-20 h-20 bg-white opacity-10 rounded-full group-hover:scale-110 transition duration-500"></div>
    <div className="relative z-10 flex items-start justify-between">
      <div>
        <p className="text-purple-100 text-sm font-medium mb-1">{title}</p>
        <h3 className="text-3xl font-bold">{value}</h3>
      </div>
      <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">{icon}</div>
    </div>
  </div>
);
