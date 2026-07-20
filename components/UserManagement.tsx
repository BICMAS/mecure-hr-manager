import React, { useState, useEffect } from "react";
import { User, UserRole, Department } from "../types";
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
import { getAccessToken } from "@/utils/auth";
import { mapFormToHrCreatePayload } from "@/utils/hrUserMappers";


import { getApiV1BaseUrl } from "@/lib/apiConfig";

const API_BASE = getApiV1BaseUrl();

const authFetch = async (endpoint: string, options: RequestInit = {}) => {
  const token = getAccessToken();

  if (!token) {
    throw new Error("Not authenticated");
  }
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Request failed");
  }

  return res.json();
};

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

const createUserByHr = async (formData: Partial<User>) => {
  const payload = mapFormToHrCreatePayload(formData);

  return authFetch("/users", {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

export const UserManagement: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // User Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState<Partial<User>>({
    role: UserRole.LEARNER,
    department: Department.ENGINEERING,
    group: "General",
    password: "",
    phoneNumber: "",
  });

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const data = await authFetch("/users/organization/users");
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

  // Delete State
  const [userToDelete, setUserToDelete] = useState<string | null>(null);

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
    setFormData({
      role: UserRole.LEARNER,
      department: Department.ENGINEERING,
      group: "General",
      password: "",
    });
    generatePassword(); // Auto-generate on open
    setIsModalOpen(true);
    setShowPassword(false);
  };

  const handleOpenEdit = (user: User) => {
    setEditingId(user.id);
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
      await authFetch(`/users/${userToDelete}`, {
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
    if (!formData.name || !formData.email) return;

    try {
      if (editingId) {
        // UPDATE (unchanged unless backend also has HR-specific update rules)
        const updated = await authFetch(`/users/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify(formData),
        });

        setUsers((prev) => prev.map((u) => (u.id === editingId ? normalizeUser(updated) : u)));
      } else {
        // ✅ HR CREATE (correct payload)
        const created = await createUserByHr(formData);

        setUsers((prev) => [normalizeUser(created), ...prev]);
      }

      setIsModalOpen(false);
    } catch (err) {
      console.error("Failed to save user", err);
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
              <th className="px-6 py-3">Group</th>
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredUsers.map((user) => (
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
                    <div className="text-slate-500 text-xs">{user.email}</div>
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
                <td className="px-6 py-3 text-slate-600">{user.department}</td>
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
      </div>

      {/* Add/Edit User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">
              {editingId ? "Edit User" : "Create New User"}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
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
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Email
                </label>
                <input
                  required
                  type="email"
                  className="w-full border p-2 rounded focus:ring-2 focus:ring-brand-primary"
                  value={formData.email || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
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
                  type="text"
                  className="w-full border p-2 rounded"
                  value={formData.phoneNumber || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, phoneNumber: e.target.value })
                  }
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
                        {d}
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
              Upload a CSV file containing user details (Name, Email, Role,
              Department).
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
