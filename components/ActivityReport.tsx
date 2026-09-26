import React, { useEffect, useState } from "react";
import { Download } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Department, formatDepartmentLabel } from "../types";
import { listBatches, LearnerBatch } from "../api/batches";
import {
  ActivityReport as ActivityReportData,
  ActivityReportFilters,
  downloadActivityReportCsv,
  getActivityReport,
} from "../api/activityReport";
import { activityReportChartData } from "../utils/activityReportCharts";
import { paginate } from "../utils/paginate";

const TRAINEE_PAGE_SIZE = 20;

const CHART_COLORS = ["#0056A6", "#69BE28", "#F5A623", "#D32F2F"];

function formatScore(value: number | null) {
  return value == null ? "—" : `${value}%`;
}

function formatDelta(value: number, suffix = "") {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value}${suffix} vs previous period`;
}

function formatWhen(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
}

function formatTrackedTime(seconds: number | null) {
  if (seconds == null || !Number.isFinite(seconds)) return "—";
  const hours = Math.round((seconds / 3600) * 100) / 100;
  return `${hours} h`;
}

function EmptyPanel({ message }: { message: string }) {
  return <p className="p-4 text-sm text-slate-500">{message}</p>;
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b bg-slate-50">
        <h3 className="font-bold">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function ScormReportPanels({ scorm }: { scorm: ActivityReportData["analytics"]["scorm"] | undefined }) {
  const registrations = scorm?.registrations ?? [];
  const activities = scorm?.activities ?? [];
  const interactions = scorm?.interactions ?? { correct: 0, incorrect: 0, rows: [] };
  const objectives = scorm?.objectives ?? [];
  const comments = scorm?.comments ?? [];
  const launches = scorm?.launches ?? { count: 0, sessionHours: 0 };

  return (
    <div className="space-y-4">
      <Panel title="Registrations">
        {registrations.length === 0 ? (
          <EmptyPanel message="No SCORM registrations were returned for these filters." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Trainee</th>
                  <th className="px-4 py-3 font-medium">Course</th>
                  <th className="px-4 py-3 font-medium">Completion</th>
                  <th className="px-4 py-3 font-medium">Success</th>
                  <th className="px-4 py-3 font-medium">Score</th>
                  <th className="px-4 py-3 font-medium">Time</th>
                  <th className="px-4 py-3 font-medium">First access</th>
                  <th className="px-4 py-3 font-medium">Last access</th>
                </tr>
              </thead>
              <tbody>
                {registrations.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-medium">{row.fullName}</td>
                    <td className="px-4 py-3">{row.courseTitle}</td>
                    <td className="px-4 py-3">{row.completion || "—"}</td>
                    <td className="px-4 py-3">{row.success || "—"}</td>
                    <td className="px-4 py-3">{formatScore(row.scorePercent)}</td>
                    <td className="px-4 py-3">{row.learningHours == null ? "—" : `${row.learningHours} h`}</td>
                    <td className="px-4 py-3">{formatWhen(row.firstAccessAt)}</td>
                    <td className="px-4 py-3">{formatWhen(row.lastAccessAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel title="Activity detail">
        {activities.length === 0 ? (
          <EmptyPanel message="No activity detail was returned for these filters." />
        ) : (
          <div className="overflow-x-auto max-h-80">
            <table className="w-full text-sm">
              <thead className="text-left text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Trainee</th>
                  <th className="px-4 py-3 font-medium">Activity</th>
                  <th className="px-4 py-3 font-medium">Completion</th>
                  <th className="px-4 py-3 font-medium">Success</th>
                  <th className="px-4 py-3 font-medium">Score</th>
                  <th className="px-4 py-3 font-medium">Time</th>
                </tr>
              </thead>
              <tbody>
                {activities.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-medium">{row.fullName}</td>
                    <td className="px-4 py-3">{row.title}</td>
                    <td className="px-4 py-3">{row.completion || "—"}</td>
                    <td className="px-4 py-3">{row.success || "—"}</td>
                    <td className="px-4 py-3">{formatScore(row.scorePercent)}</td>
                    <td className="px-4 py-3">{formatTrackedTime(row.timeTrackedSeconds)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title="Interactions">
          {interactions.rows.length === 0 ? (
            <EmptyPanel message="No interactions were returned for these filters." />
          ) : (
            <div>
              <p className="px-4 pt-3 text-sm text-slate-600">
                <span className="font-semibold text-[#69BE28]">{interactions.correct} correct</span>
                <span className="mx-2 text-slate-300">·</span>
                <span className="font-semibold text-[#D32F2F]">{interactions.incorrect} incorrect</span>
              </p>
              <div className="overflow-x-auto max-h-64">
                <table className="w-full text-sm">
                  <thead className="text-left text-slate-600">
                    <tr>
                      <th className="px-4 py-3 font-medium">Question</th>
                      <th className="px-4 py-3 font-medium">Result</th>
                      <th className="px-4 py-3 font-medium">Weighting</th>
                    </tr>
                  </thead>
                  <tbody>
                    {interactions.rows.map((row) => (
                      <tr key={row.id} className="border-t border-slate-100">
                        <td className="px-4 py-3">{row.question}</td>
                        <td className="px-4 py-3">{row.result || "—"}</td>
                        <td className="px-4 py-3">{row.weighting == null ? "—" : row.weighting}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Panel>

        <Panel title="Launch history">
          {launches.count === 0 ? (
            <EmptyPanel message="No launch history was returned for these filters." />
          ) : (
            <div className="p-4 grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Launches</p>
                <p className="text-2xl font-semibold text-[#0056A6]">{launches.count}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Session time</p>
                <p className="text-2xl font-semibold text-[#69BE28]">{launches.sessionHours} h</p>
              </div>
            </div>
          )}
        </Panel>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title="Objectives">
          {objectives.length === 0 ? (
            <EmptyPanel message="No objectives were returned for these filters." />
          ) : (
            <div className="overflow-x-auto max-h-64">
              <table className="w-full text-sm">
                <thead className="text-left text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-medium">Trainee</th>
                    <th className="px-4 py-3 font-medium">Objective</th>
                    <th className="px-4 py-3 font-medium">Success</th>
                    <th className="px-4 py-3 font-medium">Completion</th>
                    <th className="px-4 py-3 font-medium">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {objectives.map((row) => (
                    <tr key={row.id} className="border-t border-slate-100">
                      <td className="px-4 py-3">{row.fullName}</td>
                      <td className="px-4 py-3">{row.objectiveId}</td>
                      <td className="px-4 py-3">{row.success || "—"}</td>
                      <td className="px-4 py-3">{row.completion || "—"}</td>
                      <td className="px-4 py-3">{formatScore(row.scorePercent)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel title="Learner comments">
          {comments.length === 0 ? (
            <EmptyPanel message="No learner comments were returned for these filters." />
          ) : (
            <ul className="divide-y divide-slate-100 max-h-64 overflow-auto">
              {comments.map((row) => (
                <li key={row.id} className="px-4 py-3 text-sm">
                  <p className="font-medium">{row.fullName}</p>
                  <p className="text-slate-600">{row.comment}</p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}

function ActivityReportCharts({ report }: { report: ActivityReportData }) {
  const charts = activityReportChartData(report);
  const analytics = report.analytics;
  if (!charts || !analytics) return null;

  const groupAxis = report.breakdownBy === "department" ? "department" : "batch";
  const funnelMax = Math.max(analytics.funnel.assigned, 1);
  const funnelSteps = [
    ["Assigned", analytics.funnel.assigned],
    ["Started", analytics.funnel.started],
    ["Completed", analytics.funnel.completed],
    ["Passed", analytics.funnel.passed],
  ] as const;

  const scorm = analytics.scorm;
  const completed = analytics.funnel.completed;
  const notCompleted = Math.max(0, analytics.funnel.assigned - completed);
  const donut = [
    { name: "Completed", value: completed, fill: "#69BE28" },
    { name: "Not completed", value: notCompleted, fill: "#0056A6" },
  ].filter((item) => item.value > 0);
  const bandData = [
    { name: "Under 50", value: scorm?.scoreBands.under50 ?? 0, fill: "#D32F2F" },
    { name: "50–79", value: scorm?.scoreBands.from50to79 ?? 0, fill: "#F5A623" },
    { name: "80 or above", value: scorm?.scoreBands.from80 ?? 0, fill: "#69BE28" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <h3 className="font-bold">Completion</h3>
          <p className="text-3xl font-semibold text-[#0056A6] mt-1">{analytics.summary.completionRate}%</p>
          <p className="text-xs text-slate-500 mb-2">{completed} completed of {analytics.funnel.assigned} assigned</p>
          <div className="h-52">
            {donut.length === 0 ? (
              <p className="text-sm text-slate-500 pt-8 text-center">No assigned courses in this range.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={donut} dataKey="value" nameKey="name" innerRadius={58} outerRadius={82} paddingAngle={2} stroke="none">
                    {donut.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <h3 className="font-bold mb-4">Score bands</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bandData} margin={{ left: 0, right: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#64748b" }} />
                <Tooltip formatter={(value) => [value, "Scores"]} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={36}>
                  {bandData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <h3 className="font-bold mb-4">Learner journey</h3>
          <div className="space-y-3">
            {funnelSteps.map(([label, value], index) => (
              <div key={label}>
                <div className="flex justify-between text-sm mb-1">
                  <span>{label}</span>
                  <span className="font-medium">{value}</span>
                </div>
                <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(100, (value / funnelMax) * 100)}%`,
                      background: CHART_COLORS[index % CHART_COLORS.length],
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <h3 className="font-bold mb-4">Performance by {groupAxis}</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.groups} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: "#64748b" }} unit="%" />
                <YAxis dataKey="label" type="category" width={96} tick={{ fontSize: 11, fill: "#64748b" }} />
                <Tooltip formatter={(value) => [`${value}%`, "Completion rate"]} />
                <Bar dataKey="completionRate" fill="#0056A6" radius={[0, 4, 4, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <h3 className="font-bold mb-4">Monthly trend</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={analytics.trend} margin={{ left: 0, right: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748b" }} />
                <YAxis yAxisId="hours" tick={{ fontSize: 11, fill: "#64748b" }} />
                <YAxis yAxisId="learners" orientation="right" allowDecimals={false} tick={{ fontSize: 11, fill: "#64748b" }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar yAxisId="hours" dataKey="learningHours" name="Learning hours" fill="#69BE28" radius={[4, 4, 0, 0]} barSize={18} />
                <Line yAxisId="learners" dataKey="activeLearners" name="Active learners" stroke="#0056A6" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <h3 className="font-bold mb-4">Activity mix</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.activityMix} margin={{ left: 0, right: 8, bottom: 24 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} interval={0} angle={-20} textAnchor="end" height={48} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#64748b" }} />
                <Tooltip />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={28}>
                  {charts.activityMix.map((entry, index) => (
                    <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b bg-slate-50">
            <h3 className="font-bold">At-risk trainees</h3>
          </div>
          {analytics.atRisk.length === 0 ? (
            <p className="p-4 text-sm text-slate-500">No trainees are at risk for these filters.</p>
          ) : (
            <div className="max-h-64 overflow-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-slate-600">
                  <tr>
                    <th className="px-4 py-2 font-medium">Trainee</th>
                    <th className="px-4 py-2 font-medium">{groupAxis === "department" ? "Department" : "Batch"}</th>
                    <th className="px-4 py-2 font-medium">Reason</th>
                    <th className="px-4 py-2 font-medium">Days inactive</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.atRisk.map((row) => (
                    <tr key={row.id} className="border-t border-slate-100">
                      <td className="px-4 py-2 font-medium">{row.fullName}</td>
                      <td className="px-4 py-2">
                        {groupAxis === "department" ? formatDepartmentLabel(row.department) : row.batch}
                      </td>
                      <td className="px-4 py-2">{row.reason}</td>
                      <td className="px-4 py-2">{row.daysInactive ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </div>

      <ScormReportPanels scorm={scorm} />

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-x-auto">
        <div className="px-4 py-3 border-b bg-slate-50">
          <h3 className="font-bold">Course effectiveness</h3>
        </div>
        {analytics.courses.length === 0 ? (
          <p className="p-4 text-sm text-slate-500">No course assignments in this date range.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Course</th>
                <th className="px-4 py-3 font-medium">Assigned</th>
                <th className="px-4 py-3 font-medium">Completion rate</th>
                <th className="px-4 py-3 font-medium">Average score</th>
              </tr>
            </thead>
            <tbody>
              {analytics.courses.map((course) => (
                <tr key={course.title} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium">{course.title}</td>
                  <td className="px-4 py-3">{course.assigned}</td>
                  <td className="px-4 py-3">{course.completionRate}%</td>
                  <td className="px-4 py-3">{formatScore(course.averageScore)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export const ActivityReport: React.FC = () => {
  const [batches, setBatches] = useState<LearnerBatch[]>([]);
  const [batchId, setBatchId] = useState("all");
  const [department, setDepartment] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [report, setReport] = useState<ActivityReportData | null>(null);
  const [appliedFilters, setAppliedFilters] = useState<ActivityReportFilters>({});
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [traineePage, setTraineePage] = useState(1);

  const filters = (): ActivityReportFilters => ({
    batchId: batchId === "all" ? undefined : batchId,
    department: department === "all" ? undefined : department,
    from: from || undefined,
    to: to || undefined,
  });

  const loadReport = async (nextFilters = filters()) => {
    setTraineePage(1);
    setLoading(true);
    setError(null);
    try {
      const data = await getActivityReport(nextFilters);
      setAppliedFilters(nextFilters);
      setReport(data);
    } catch (err: unknown) {
      setReport(null);
      setError(err instanceof Error ? err.message : "Failed to load the activity report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        setBatches(await listBatches());
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load batches");
      }
      await loadReport({ });
    };
    load();
    // Initial report uses the default filters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDownload = async () => {
    setDownloading(true);
    setError(null);
    try {
      await downloadActivityReportCsv(appliedFilters);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to download the activity report");
    } finally {
      setDownloading(false);
    }
  };

  const traineePages = paginate(report?.trainees ?? [], traineePage, TRAINEE_PAGE_SIZE);

  useEffect(() => {
    if (traineePage !== traineePages.page) {
      setTraineePage(traineePages.page);
    }
  }, [traineePage, traineePages.page]);

  const totals = report?.totals;

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
          <label className="text-sm">
            <span className="block mb-1 text-slate-600">Batch</span>
            <select
              className="w-full border border-slate-300 rounded px-3 py-2 bg-white"
              value={batchId}
              onChange={(event) => setBatchId(event.target.value)}
            >
              <option value="all">All batches</option>
              <option value="unassigned">Unassigned</option>
              {batches.map((batch) => (
                <option key={batch.id} value={batch.id}>{batch.name}</option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="block mb-1 text-slate-600">Department</span>
            <select
              className="w-full border border-slate-300 rounded px-3 py-2 bg-white"
              value={department}
              onChange={(event) => setDepartment(event.target.value)}
            >
              <option value="all">All departments</option>
              {Object.values(Department).map((value) => (
                <option key={value} value={value}>{formatDepartmentLabel(value)}</option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="block mb-1 text-slate-600">From</span>
            <input
              type="date"
              className="w-full border border-slate-300 rounded px-3 py-2"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
            />
          </label>
          <label className="text-sm">
            <span className="block mb-1 text-slate-600">To</span>
            <input
              type="date"
              className="w-full border border-slate-300 rounded px-3 py-2"
              value={to}
              onChange={(event) => setTo(event.target.value)}
            />
          </label>
          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={() => loadReport()}
              disabled={loading}
              className="flex-1 py-2 bg-brand-primary text-white rounded-lg font-medium hover:bg-brand-primary-dark disabled:bg-slate-300"
            >
              {loading ? "Loading…" : "Apply"}
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading || loading || !report || report.trainees.length === 0}
              className="px-3 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              aria-label="Download CSV"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-3">
          The date range limits which activity is counted. Trainees stay in the report when they match the batch and department.
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {report?.message && (
        <p className="bg-white border border-slate-200 rounded-lg p-6 text-sm text-slate-500 text-center">
          {report.message}
        </p>
      )}

      {totals && report && report.trainees.length > 0 && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            {[
              ["Learners", report.analytics.summary.learners, report.analytics.summary.comparison?.learners, ""],
              ["Average progress", `${report.analytics.summary.averageProgress}%`, report.analytics.summary.comparison?.averageProgress, " pts"],
              ["Completion rate", `${report.analytics.summary.completionRate}%`, report.analytics.summary.comparison?.completionRate, " pts"],
              ["Pass rate", `${report.analytics.summary.passRate}%`, report.analytics.summary.comparison?.passRate, " pts"],
              ["Learning hours", report.analytics.summary.learningHours, report.analytics.summary.comparison?.learningHours, ""],
              ["At-risk trainees", report.analytics.summary.atRisk, report.analytics.summary.comparison?.atRisk, ""],
            ].map(([label, value, delta, suffix]) => (
              <div key={String(label)} className="bg-white border border-slate-200 rounded-lg p-3">
                <p className="text-xs text-slate-500">{label}</p>
                <p className="text-lg font-semibold text-slate-900">{value}</p>
                {typeof delta === "number" && (
                  <p className="text-xs text-slate-500 mt-1">{formatDelta(delta, String(suffix))}</p>
                )}
              </div>
            ))}
          </div>

          <ActivityReportCharts report={report} />

          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-x-auto">
            <div className="px-4 py-3 border-b bg-slate-50">
              <h3 className="font-bold">
                {report.breakdownBy === "department" ? "By department" : "By batch"}
              </h3>
            </div>
            <table className="w-full text-sm">
              <thead className="text-left text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium">{report.breakdownBy === "department" ? "Department" : "Batch"}</th>
                  <th className="px-4 py-3 font-medium">Trainees</th>
                  <th className="px-4 py-3 font-medium">Assigned</th>
                  <th className="px-4 py-3 font-medium">Progress</th>
                  <th className="px-4 py-3 font-medium">Overdue</th>
                  <th className="px-4 py-3 font-medium">Certificates</th>
                  <th className="px-4 py-3 font-medium">Points</th>
                </tr>
              </thead>
              <tbody>
                {report.breakdown.map((row) => (
                  <tr key={row.label} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-medium">
                      {report.breakdownBy === "department" ? formatDepartmentLabel(row.label) : row.label}
                    </td>
                    <td className="px-4 py-3">{row.trainees}</td>
                    <td className="px-4 py-3">{row.assignedCourses}</td>
                    <td className="px-4 py-3">{row.averageProgress}%</td>
                    <td className="px-4 py-3">{row.overdueCourses}</td>
                    <td className="px-4 py-3">{row.certificates}</td>
                    <td className="px-4 py-3">{row.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-x-auto">
            <div className="px-4 py-3 border-b bg-slate-50 flex items-center justify-between gap-3">
              <h3 className="font-bold">Trainees</h3>
              <span className="text-sm text-slate-600">{report.trainees.length} trainees</span>
            </div>
            <table className="w-full text-sm">
              <thead className="text-left text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Trainee</th>
                  <th className="px-4 py-3 font-medium">Batch</th>
                  <th className="px-4 py-3 font-medium">Department</th>
                  <th className="px-4 py-3 font-medium">Assigned</th>
                  <th className="px-4 py-3 font-medium">Progress</th>
                  <th className="px-4 py-3 font-medium">Score</th>
                  <th className="px-4 py-3 font-medium">Hours</th>
                  <th className="px-4 py-3 font-medium">Overdue</th>
                  <th className="px-4 py-3 font-medium">Modules</th>
                  <th className="px-4 py-3 font-medium">SCORM</th>
                  <th className="px-4 py-3 font-medium">Certificates</th>
                  <th className="px-4 py-3 font-medium">Quizzes</th>
                  <th className="px-4 py-3 font-medium">Field tasks</th>
                  <th className="px-4 py-3 font-medium">Points</th>
                  <th className="px-4 py-3 font-medium">Awarded</th>
                  <th className="px-4 py-3 font-medium">Courses</th>
                </tr>
              </thead>
              <tbody>
                {traineePages.items.map((trainee) => (
                  <tr key={trainee.id} className="border-t border-slate-100">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{trainee.fullName}</p>
                      <p className="text-xs text-slate-500">{trainee.email}</p>
                    </td>
                    <td className="px-4 py-3">{trainee.batch}</td>
                    <td className="px-4 py-3">{formatDepartmentLabel(trainee.department)}</td>
                    <td className="px-4 py-3">{trainee.assignedCourses}</td>
                    <td className="px-4 py-3">{trainee.averageProgress}%</td>
                    <td className="px-4 py-3">{formatScore(trainee.averageScore)}</td>
                    <td className="px-4 py-3">{trainee.learningHours}</td>
                    <td className="px-4 py-3">{trainee.overdueCourses}</td>
                    <td className="px-4 py-3">{trainee.moduleProgress}</td>
                    <td className="px-4 py-3">{trainee.scormAttempts}</td>
                    <td className="px-4 py-3">{trainee.certificates}</td>
                    <td className="px-4 py-3">{trainee.quizAttempts}</td>
                    <td className="px-4 py-3">{trainee.fieldTasks}</td>
                    <td className="px-4 py-3">{trainee.points}</td>
                    <td className="px-4 py-3">{trainee.pointsAwarded}</td>
                    <td className="px-4 py-3 text-slate-600">{trainee.courses || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 text-sm md:flex-row md:items-center md:justify-between">
              <p className="text-slate-600">
                Showing {traineePages.from}–{traineePages.to} of {traineePages.total}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTraineePage((page) => Math.max(page - 1, 1))}
                  disabled={traineePages.page === 1}
                  className="rounded border border-slate-300 px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="min-w-24 text-center text-slate-600">
                  Page {traineePages.page} / {traineePages.totalPages}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setTraineePage((page) => Math.min(page + 1, traineePages.totalPages))
                  }
                  disabled={traineePages.page === traineePages.totalPages}
                  className="rounded border border-slate-300 px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
