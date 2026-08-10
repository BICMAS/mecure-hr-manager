import React, { useState, useEffect } from "react";
import { User, UserRole, Department, formatDepartmentLabel } from "../types";
import {
  Plus,
  Upload,
  Search,
  FileUp,
  Trash2,
  Edit2,
  Key,
  RefreshCw,
  Eye,
  EyeOff,
  AlertTriangle,
  X,
} from "lucide-react";
import { authFetchJson } from "@/utils/fetchWithAuth";
import { mapFormToHrCreatePayload, mapFormToHrUpdatePayload } from "@/utils/hrUserMappers";

const DEFAULT_PAGE_SIZE = 20;

const normalizeUser = (u: any): User => ({
  id: u.id,
  name: u.name ?? u.fullName ?? "",
  email: u.email ?? "",
  phoneNumber: u.phoneNumber ?? "",
  role: u.role ?? u.userRole,
  department: u.department ?? "",
  designation: u.designation ?? "",
  group: u.group ?? "General",
  avatarUrl:
    u.avatarUrl ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      u.name ?? u.fullName ?? "User"
    )}&background=random`,
  points: u.points ?? 0,
});

const userContactLabel = (user: User) =>
  user.email?.trim() || user.phoneNumber?.trim() || "—";

const createUserByHr = async (formData: Partial<User>) => {
  const payload = mapFormToHrCreatePayload(formData);

  return authFetchJson("/users", {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

export const UserManagement: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(DEFAULT_PAGE_SIZE);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // User Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState<Partial<User>>({
    role: UserRole.LEARNER,
    department: Department.SALES,
    group: "General",
    password: "",
    phoneNumber: "",
  });

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const data = await authFetchJson<any[]>("/users/organization/users");
        setUsers(data.map(normalizeUser));
      } catch (err: any) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Delete State
  const [userToDelete, setUserToDelete] = useState<string | null>(null);

  const filteredUsers = users.filter((user) => {
    const term = searchTerm.toLowerCase();
    return (
      user.name.toLowerCase().includes(term) ||
      (user.email ?? "").toLowerCase().includes(term) ||
      (user.phoneNumber ?? "").toLowerCase().includes(term) ||
      (user.designation ?? "").toLowerCase().includes(term) ||
      user.department.toLowerCase().includes(term)
    );
  });

  const totalUsers = filteredUsers.length;
  const totalPages = Math.max(1, Math.ceil(totalUsers / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStartIndex = (safeCurrentPage - 1) * pageSize;
  const pageEndIndex = Math.min(pageStartIndex + pageSize, totalUsers);
  const paginatedUsers = filteredUsers.slice(pageStartIndex, pageEndIndex);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const generatePassword = () => {
    const chars =
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let pass = "";
    for (let i = 0; i < 12; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData({ ...formData, password: pass });
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormError(null);
    setFormData({
      role: UserRole.LEARNER,
      department: Department.SALES,
      group: "General",
      password: "",
      phoneNumber: "",
      email: "",
    });
    generatePassword(); // Auto-generate on open
    setIsModalOpen(true);
    setShowPassword(false);
  };

  const handleOpenEdit = (user: User) => {
    setEditingId(user.id);
    setFormError(null);
    setFormData({ ...user, password: user.password || "" }); // Populate if available, else blank
    setIsModalOpen(true);
    setShowPassword(false);
  };

  const handleDeleteUser = (id: string) => {
    setUserToDelete(id);
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;

    try {
      await authFetchJson(`/users/${userToDelete}`, {
        method: "DELETE",
      });

      setUsers((prev) => prev.filter((u) => u.id !== userToDelete));
      setUserToDelete(null);
    } catch (err) {
      console.error("Failed to delete user", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const hasEmail = Boolean(formData.email?.trim());
    const hasPhone = Boolean(formData.phoneNumber?.trim());

    if (!formData.name?.trim()) {
      setFormError("Full name is required.");
      return;
    }

    if (!hasEmail && !hasPhone) {
      setFormError("Provide an email address and/or phone number.");
      return;
    }

    try {
      if (editingId) {
        const updated = await authFetchJson(`/users/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(mapFormToHrUpdatePayload(formData)),
        });

        setUsers((prev) =>
          prev.map((u) => (u.id === editingId ? normalizeUser(updated) : u)),
        );
      } else {
        const created = await createUserByHr(formData);

        setUsers((prev) => [normalizeUser(created), ...prev]);
      }

      setIsModalOpen(false);
    } catch (err: any) {
      console.error("Failed to save user", err);
      setFormError(err.message || "Failed to save user");
    }
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
      {/* Toolbar */}
      <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search users..."
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={() => setIsBulkOpen(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded text-sm font-medium hover:bg-slate-50"
          >
            <Upload className="w-4 h-4" /> Bulk Upload
          </button>
          <button
            onClick={handleOpenCreate}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-brand-primary text-white rounded text-sm font-medium hover:bg-brand-primary-dark"
          >
            <Plus className="w-4 h-4" /> Add User
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        {loading && (
          <div className="p-6 text-sm text-slate-500">Loading users…</div>
        )}

        {error && (
          <div className="p-6 text-sm text-red-600">
            Failed to load users: {error}
          </div>
        )}

        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
            <tr>
              <th className="px-6 py-3">Name</th>
              <th className="px-6 py-3">Role</th>
              <th className="px-6 py-3">Department</th>
              <th className="px-6 py-3">Designation</th>
              <th className="px-6 py-3">Group</th>
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedUsers.map((user) => (
              <tr key={user.id} className="hover:bg-slate-50/50">
                <td className="px-6 py-3 flex items-center gap-3">
                  <img
                    src={user.avatarUrl}
                    alt=""
                    className="w-8 h-8 rounded-full"
                  />
                  <div>
                    <div className="font-medium text-slate-900">
                      {user.name}
                    </div>
                    <div className="text-slate-500 text-xs">
                      {userContactLabel(user)}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-3">
                  <span
                    className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      user.role === UserRole.ADMIN
                        ? "bg-purple-100 text-purple-700"
                        : user.role === UserRole.MANAGER
                        ? "bg-brand-primary/10 text-brand-primary"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-3 text-slate-600">
                  {formatDepartmentLabel(String(user.department))}
                </td>
                <td className="px-6 py-3 text-slate-600">
                  {user.designation?.trim() || "—"}
                </td>
                <td className="px-6 py-3 text-slate-500">{user.group}</td>
                <td className="px-6 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => handleOpenEdit(user)}
                      className="p-1.5 text-slate-500 hover:text-brand-primary hover:bg-brand-primary/10 rounded transition"
                      title="Edit User"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteUser(user.id)}
                      className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded transition"
                      title="Delete User"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {!loading && !error && totalUsers > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50/80">
            <p className="text-sm text-slate-600">
              Showing {pageStartIndex + 1}–{pageEndIndex} of {totalUsers}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={safeCurrentPage <= 1}
                className="px-3 py-1.5 text-sm border border-slate-300 rounded bg-white text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
              >
                Previous
              </button>
              <span className="text-sm text-slate-600 min-w-[7rem] text-center">
                Page {safeCurrentPage} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() =>
                  setCurrentPage((page) => Math.min(totalPages, page + 1))
                }
                disabled={safeCurrentPage >= totalPages}
                className="px-3 py-1.5 text-sm border border-slate-300 rounded bg-white text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {!loading && !error && totalUsers === 0 && (
          <div className="px-6 py-8 text-sm text-slate-500 text-center border-t border-slate-200">
            No users match your search.
          </div>
        )}
      </div>

      {/* Add/Edit User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">
              {editingId ? "Edit User" : "Create New User"}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              {formError && (
                <div className="bg-red-50 text-red-700 text-sm p-3 rounded border border-red-100">
                  {formError}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Full Name
                </label>
                <input
                  required
                  type="text"
                  className="w-full border p-2 rounded focus:ring-2 focus:ring-brand-primary"
                  value={formData.name || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>
              <p className="text-xs text-slate-500 -mt-2">
                Provide an email address and/or phone number.
              </p>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  className="w-full border p-2 rounded focus:ring-2 focus:ring-brand-primary"
                  value={formData.email || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="email@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Password
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input
                      type={showPassword ? "text" : "password"}
                      className="w-full pl-9 pr-10 py-2 border border-slate-300 rounded text-slate-700 font-mono text-sm focus:ring-2 focus:ring-brand-primary focus:outline-none"
                      value={formData.password || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      placeholder={
                        editingId
                          ? "Enter to reset..."
                          : "Generated automatically"
                      }
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={generatePassword}
                    className="px-3 py-2 bg-slate-100 border border-slate-200 rounded hover:bg-slate-200 text-slate-600"
                    title="Generate Random Password"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
                {editingId && (
                  <p className="text-xs text-slate-500 mt-1">
                    Leave as is to keep current password, or type to reset.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  className="w-full border p-2 rounded focus:ring-2 focus:ring-brand-primary"
                  value={formData.phoneNumber || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, phoneNumber: e.target.value })
                  }
                  placeholder="123-456-7890"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Department
                  </label>
                  <select
                    className="w-full border p-2 rounded"
                    value={formData.department}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        department: e.target.value as Department,
                      })
                    }
                  >
                    {Object.values(Department).map((d) => (
                      <option key={d} value={d}>
                        {formatDepartmentLabel(d)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Role
                  </label>
                  <select
                    className="w-full border p-2 rounded"
                    value={formData.role}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        role: e.target.value as UserRole,
                      })
                    }
                  >
                    {Object.values(UserRole).map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Designation (Optional)
                </label>
                <input
                  type="text"
                  className="w-full border p-2 rounded focus:ring-2 focus:ring-brand-primary"
                  value={formData.designation || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, designation: e.target.value })
                  }
                  placeholder="e.g. Senior Medical Rep"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Group (Optional)
                </label>
                <input
                  type="text"
                  className="w-full border p-2 rounded focus:ring-2 focus:ring-brand-primary"
                  value={formData.group || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, group: e.target.value })
                  }
                />
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-primary text-white rounded hover:bg-brand-primary-dark"
                >
                  {editingId ? "Update User" : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Upload Modal */}
      {isBulkOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              Bulk User Upload
            </h3>
            <p className="text-sm text-slate-500 mb-6">
              Upload a CSV file containing user details (Name, Email and/or
              Phone, Role, Department, Designation).
            </p>

            <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 flex flex-col items-center justify-center text-center bg-slate-50 hover:bg-slate-100 transition cursor-pointer">
              <FileUp className="w-10 h-10 text-slate-400 mb-3" />
              <p className="text-sm font-medium text-slate-700">
                Click to upload or drag and drop
              </p>
              <p className="text-xs text-slate-400 mt-1">
                CSV or Excel (max 5MB)
              </p>
              <input type="file" className="hidden" />
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setIsBulkOpen(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-fade-in">
            <div className="p-6 text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                Delete User?
              </h3>
              <p className="text-sm text-slate-600 mb-6">
                Are you sure you want to delete this user? This action cannot be
                undone and all progress data will be removed.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setUserToDelete(null)}
                  className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
