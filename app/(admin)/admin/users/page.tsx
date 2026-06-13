"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as zod from "zod";
import { Loader2, Users, Plus, ShieldCheck, ShieldAlert, X, Eye, Phone, MapPin, Search } from "lucide-react";
import toast from "react-hot-toast";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  pincode: string;
  role: "CUSTOMER" | "DELIVERY" | "ADMIN";
  isActive: boolean;
  firstLogin: boolean;
  createdAt: string;
  totalOrders: number;
  unpaidBalance: number;
}

const userSchema = zod.object({
  name: zod.string().min(2, "Name must be at least 2 characters"),
  email: zod.string().email("Please enter a valid email address"),
  phone: zod.string().min(10, "Phone number must be at least 10 digits"),
  address: zod.string().min(5, "Address must be complete"),
  pincode: zod.string().min(4, "Pincode is too short"),
  role: zod.enum(["CUSTOMER", "DELIVERY"]),
  password: zod.string().min(6, "Password must be at least 6 characters"),
});

type UserForm = zod.infer<typeof userSchema>;

export default function AdminUsers() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");

  // Form modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UserForm>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      role: "CUSTOMER"
    }
  });

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      toast.error("Failed to load users list.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      fetchUsers();
    }
  }, [session]);

  const handleCreateUser = async (data: UserForm) => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        toast.success(`User "${data.name}" created successfully!`);
        setShowAddModal(false);
        reset();
        fetchUsers();
      } else {
        const errData = await res.json();
        toast.error(errData.error || "Failed to create user.");
      }
    } catch (err) {
      toast.error("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleUserActive = async (user: UserProfile) => {
    const confirmAction = confirm(
      `Are you sure you want to ${user.isActive ? "DEACTIVATE" : "REACTIVATE"} user "${user.name}"?`
    );
    if (!confirmAction) return;

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: user.id,
          isActive: !user.isActive,
        }),
      });

      if (res.ok) {
        toast.success(`User status updated successfully!`);
        fetchUsers();
        if (selectedUser?.id === user.id) {
          setSelectedUser(prev => prev ? { ...prev, isActive: !prev.isActive } : null);
        }
      } else {
        toast.error("Failed to update user status.");
      }
    } catch (err) {
      toast.error("Network error.");
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.phone.includes(searchQuery);

    const matchesRole = roleFilter === "ALL" || u.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="w-8 h-8 text-[#0077B6] animate-spin" />
        <p className="text-sm text-slate-500">Loading directory...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-sky-950 pb-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Users className="text-[#0077B6]" />
            User Management
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Register and manage delivery partners and customer details.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 bg-gradient-to-r from-[#0077B6] to-[#00B4D8] text-white text-xs font-bold rounded-xl shadow-md hover:opacity-90 transition flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus size={16} /> Register New Account
        </button>
      </div>

      {/* Filter and Search controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-sky-950 bg-white dark:bg-slate-900 text-sm focus:border-[#0077B6] outline-none transition"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-sky-950 bg-white dark:bg-slate-900 text-sm focus:border-[#0077B6] outline-none transition dark:text-slate-200"
        >
          <option value="ALL">All Roles</option>
          <option value="CUSTOMER">Customers</option>
          <option value="DELIVERY">Delivery Partners</option>
        </select>
      </div>

      {/* User listing table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-sky-950 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/40 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-sky-950">
                <th className="p-4">Name / Contact</th>
                <th className="p-4">Role</th>
                <th className="p-4">Status</th>
                <th className="p-4">Unpaid Balance</th>
                <th className="p-4">Orders Count</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-950 text-xs">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 italic">No users found matching filters.</td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                    <td className="p-4">
                      <p className="font-bold text-slate-800 dark:text-slate-200">{user.name}</p>
                      <p className="text-[10px] text-slate-400">{user.email} • {user.phone}</p>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        user.role === "DELIVERY"
                          ? "bg-cyan-100 text-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-400"
                          : "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400"
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1 font-bold ${user.isActive ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>
                        {user.isActive ? "● Active" : "● Deactivated"}
                      </span>
                    </td>
                    <td className="p-4 font-bold text-slate-700 dark:text-slate-300">
                      ${user.unpaidBalance.toFixed(2)}
                    </td>
                    <td className="p-4 font-medium text-slate-600 dark:text-slate-400">
                      {user.totalOrders} deliveries
                    </td>
                    <td className="p-4 text-right flex items-center justify-end gap-2">
                      <button
                        onClick={() => setSelectedUser(user)}
                        className="p-1.5 rounded-lg border border-slate-100 dark:border-sky-950 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 transition"
                        title="View details"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => toggleUserActive(user)}
                        className={`p-1.5 rounded-lg border text-xs font-bold transition ${
                          user.isActive
                            ? "border-red-100 dark:border-red-950 bg-red-50/20 hover:bg-red-50 text-red-500"
                            : "border-green-100 dark:border-green-950 bg-green-50/20 hover:bg-green-50 text-green-600 dark:text-green-400"
                        }`}
                        title={user.isActive ? "Deactivate" : "Activate"}
                      >
                        {user.isActive ? <ShieldAlert size={16} /> : <ShieldCheck size={16} />}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Details Modal (Drawer) */}
      {selectedUser && (
        <div className="fixed inset-0 bg-slate-950/40 dark:bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-end animate-fadeIn">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border-l border-slate-100 dark:border-sky-950 h-full p-6 shadow-2xl flex flex-col justify-between animate-slideIn">
            
            {/* Header info */}
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-sky-950 pb-4">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{selectedUser.role} Account</span>
                  <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100">{selectedUser.name}</h3>
                </div>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Data body */}
              <div className="space-y-4 text-xs">
                
                <div className="p-3 bg-slate-50/50 dark:bg-slate-800/20 rounded-xl space-y-2.5">
                  <div className="flex items-start gap-2 text-slate-600 dark:text-slate-400">
                    <Phone size={14} className="mt-0.5 text-slate-400 flex-shrink-0" />
                    <span><strong>Phone:</strong> {selectedUser.phone}</span>
                  </div>
                  <div className="flex items-start gap-2 text-slate-600 dark:text-slate-400">
                    <MapPin size={14} className="mt-0.5 text-slate-400 flex-shrink-0" />
                    <span><strong>Address:</strong> {selectedUser.address} ({selectedUser.pincode})</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="p-3.5 bg-sky-50/10 border border-sky-100/30 rounded-xl dark:border-sky-950">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Total Deliveries</span>
                    <span className="text-base font-extrabold text-slate-800 dark:text-slate-100 mt-1 block">
                      {selectedUser.totalOrders}
                    </span>
                  </div>
                  <div className="p-3.5 bg-red-50/10 border border-red-100/10 rounded-xl dark:border-red-950">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Unpaid Invoice Ledger</span>
                    <span className="text-base font-extrabold text-red-500 mt-1 block">
                      ${selectedUser.unpaidBalance.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="font-bold text-slate-700 dark:text-slate-300 block uppercase tracking-wider text-[10px]">Administrative Details</span>
                  <div className="flex justify-between p-2.5 border border-slate-100 dark:border-sky-950 rounded-xl">
                    <span className="text-slate-500">Login Password Change Required:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {selectedUser.firstLogin ? "Yes (Pending)" : "No (Completed)"}
                    </span>
                  </div>
                  <div className="flex justify-between p-2.5 border border-slate-100 dark:border-sky-950 rounded-xl">
                    <span className="text-slate-500">Registered On:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {new Date(selectedUser.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

              </div>
            </div>

            {/* Actions Footer */}
            <div className="border-t border-slate-100 dark:border-sky-950 pt-4 flex gap-3">
              <button
                onClick={() => toggleUserActive(selectedUser)}
                className={`flex-1 py-3 text-xs font-bold rounded-xl transition ${
                  selectedUser.isActive
                    ? "bg-red-50 hover:bg-red-100 dark:bg-red-950/20 text-red-600"
                    : "bg-green-50 hover:bg-green-100 dark:bg-green-950/20 text-green-600 dark:text-green-400"
                }`}
              >
                {selectedUser.isActive ? "Deactivate User" : "Activate User"}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/45 dark:bg-slate-950/65 backdrop-blur-sm z-50 flex items-center justify-center animate-fadeIn p-4">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-sky-950 rounded-2xl p-6 shadow-2xl flex flex-col gap-5 animate-scaleUp max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-sky-950 pb-3">
              <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100">Register New User Account</h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  reset();
                }}
                className="p-1 rounded-lg hover:bg-slate-50 text-slate-400 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit(handleCreateUser)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block">Role Assignment</label>
                  <select
                    {...register("role")}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-sky-950 bg-slate-50/50 dark:bg-slate-800/50 text-sm focus:border-[#0077B6] outline-none transition"
                  >
                    <option value="CUSTOMER">Customer (Sub-User)</option>
                    <option value="DELIVERY">Delivery Partner</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block">Temp Password</label>
                  <input
                    type="text"
                    placeholder="e.g. temp123"
                    {...register("password")}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-sky-950 bg-slate-50/50 dark:bg-slate-800/50 text-sm focus:border-[#0077B6] outline-none transition"
                  />
                  {errors.password && (
                    <p className="text-red-500 text-[10px] font-semibold">{errors.password.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block">Full Name</label>
                <input
                  type="text"
                  placeholder="John Doe"
                  {...register("name")}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-sky-950 bg-slate-50/50 dark:bg-slate-800/50 text-sm focus:border-[#0077B6] outline-none transition"
                />
                {errors.name && (
                  <p className="text-red-500 text-[10px] font-semibold">{errors.name.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block">Email Address</label>
                  <input
                    type="email"
                    placeholder="john@email.com"
                    {...register("email")}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-sky-950 bg-slate-50/50 dark:bg-slate-800/50 text-sm focus:border-[#0077B6] outline-none transition"
                  />
                  {errors.email && (
                    <p className="text-red-500 text-[10px] font-semibold">{errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block">Phone Number</label>
                  <input
                    type="text"
                    placeholder="1234567890"
                    {...register("phone")}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-sky-950 bg-slate-50/50 dark:bg-slate-800/50 text-sm focus:border-[#0077B6] outline-none transition"
                  />
                  {errors.phone && (
                    <p className="text-red-500 text-[10px] font-semibold">{errors.phone.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block">Area Pincode</label>
                  <input
                    type="text"
                    placeholder="700091"
                    {...register("pincode")}
                    className="w-full sm:w-1/2 px-3 py-2 rounded-lg border border-slate-200 dark:border-sky-950 bg-slate-50/50 dark:bg-slate-800/50 text-sm focus:border-[#0077B6] outline-none transition"
                  />
                  {errors.pincode && (
                    <p className="text-red-500 text-[10px] font-semibold">{errors.pincode.message}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block">Physical Delivery Address</label>
                  <textarea
                    placeholder="Flat, building details..."
                    rows={2}
                    {...register("address")}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-sky-950 bg-slate-50/50 dark:bg-slate-800/50 text-sm focus:border-[#0077B6] outline-none transition"
                  />
                  {errors.address && (
                    <p className="text-red-500 text-[10px] font-semibold">{errors.address.message}</p>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-100 dark:border-sky-950">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    reset();
                  }}
                  className="flex-1 py-3 text-xs font-bold text-slate-500 hover:bg-slate-50 border border-slate-100 dark:border-sky-950 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 text-xs font-bold bg-gradient-to-r from-[#0077B6] to-[#00B4D8] text-white rounded-xl shadow transition flex items-center justify-center gap-1.5"
                  disabled={submitting}
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Profile"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
