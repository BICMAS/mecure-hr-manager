import React, { useEffect, useState } from "react";
import { getFieldTasks } from "@/api/getFieldTasks";

type FieldTask = {
  id: string;
  moduleTitle: string;
  description: string;
  mediaType?: string;
  mediaUrl?: string;
  createdAt?: string;
  user?: {
    fullName?: string;
    userRole?: string;
  };
};

type FieldTasksProps = {
  tasks?: FieldTask[];
};

export const FieldTasks: React.FC<FieldTasksProps> = ({ tasks: tasksProp }) => {
  const [tasks, setTasks] = useState<FieldTask[]>(tasksProp ?? []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, string>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 3;

  useEffect(() => {
    if (tasksProp) {
      setTasks(tasksProp);
      setLoading(false);
      return;
    }

    const loadTasks = async () => {
      try {
        const data = await getFieldTasks();
        console.log("GET /field-tasks response:", data);
        const normalized = Array.isArray(data) ? data : [data];
        setTasks(normalized);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load field tasks";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    loadTasks();
  }, [tasksProp]);

  useEffect(() => {
    setCurrentPage(1);
  }, [tasks.length]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-slate-500 shadow-sm">
        Loading field tasks...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-600 shadow-sm">
        {error}
      </div>
    );
  }

  if (!tasks.length) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-slate-500 shadow-sm">
        No field tasks submitted yet.
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil(tasks.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedTasks = tasks.slice(startIndex, startIndex + pageSize);
  const from = startIndex + 1;
  const to = Math.min(startIndex + pageSize, tasks.length);

  const isVideo = (url: string, mediaType?: string) =>
    mediaType?.toLowerCase() === "video" || /\.(mp4|webm|mov|avi)$/i.test(url);

  const onCommentChange = (taskId: string, value: string) => {
    setComments((prev) => ({ ...prev, [taskId]: value }));
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {paginatedTasks.map((task) => (
        <article
          key={task.id}
          className="h-full rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-lg"
        >
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-xl font-bold leading-none text-slate-800">
                {task.user?.fullName || "User"}
              </p>
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-primary">
                {task.user?.userRole || "Learner"}
              </p>
            </div>
            <p className="text-xs text-slate-400">
              {task.createdAt ? new Date(task.createdAt).toLocaleDateString() : ""}
            </p>
          </div>

          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Course Title
          </p>
          <p className="mb-3 text-sm font-semibold text-slate-800">
            {task.moduleTitle}
          </p>

          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Description
          </p>
          <p className="mb-4 text-sm font-medium leading-6 text-slate-700">
            {task.description}
          </p>

          {task.mediaUrl ? (
            <div className="mb-4">
              {isVideo(task.mediaUrl, task.mediaType) ? (
                <video
                  src={task.mediaUrl}
                  controls
                  className="h-36 w-full max-w-xs rounded-lg border border-slate-200 object-cover"
                />
              ) : (
                <img
                  src={task.mediaUrl}
                  alt="Field task upload"
                  className="h-32 w-full max-w-xs rounded-lg border border-slate-200 object-cover"
                />
              )}
            </div>
          ) : null}

          <div className="space-y-2">
            <label
              htmlFor={`hr-comment-${task.id}`}
              className="text-xs font-semibold uppercase tracking-wide text-slate-500"
            >
              HR Manager Comment
            </label>
            <textarea
              id={`hr-comment-${task.id}`}
              value={comments[task.id] ?? ""}
              onChange={(e) => onCommentChange(task.id, e.target.value)}
              rows={3}
              placeholder="Write a comment for this learner..."
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-brand-primary focus:bg-white focus:ring-2 focus:ring-brand-primary/20"
            />
          </div>
        </article>
        ))}
      </div>

      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm">
        <p className="text-slate-600">
          Showing {from}-{to} of {tasks.length}
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="rounded-md border border-slate-300 px-3 py-1.5 font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
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
            className="rounded-md border border-slate-300 px-3 py-1.5 font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};
