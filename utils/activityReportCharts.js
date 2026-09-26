function formatGroupLabel(label, breakdownBy) {
  if (breakdownBy !== "department") return label;
  return String(label)
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
}

export function activityReportChartData(report) {
  if (!report?.trainees?.length) {
    return null;
  }

  const groups = report.breakdown.map((row) => ({
    label: formatGroupLabel(row.label, report.breakdownBy),
    averageProgress: row.averageProgress,
    overdueCourses: row.overdueCourses,
  }));

  const totals = report.totals;
  return {
    groups,
    activityMix: [
      { name: "SCORM attempts", value: totals.scormAttempts },
      { name: "Certificates", value: totals.certificates },
      { name: "Quiz attempts", value: totals.quizAttempts },
      { name: "Field tasks", value: totals.fieldTasks },
    ],
  };
}
