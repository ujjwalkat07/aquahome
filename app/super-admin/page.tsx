"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as zod from "zod";
import {
  Loader2,
  Users,
  Plus,
  ShieldCheck,
  ShieldAlert,
  X,
  Phone,
  MapPin,
  Search,
  Copy,
  Check,
  DollarSign,
  ShoppingBag,
  Activity,
  UserCheck,
  Mail,
  Lock,
  Pencil
} from "lucide-react";
import toast from "react-hot-toast";

interface BusinessAdmin {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  pincode: string;
  role: string;
  isActive: boolean;
  firstLogin: boolean;
  createdAt: string;
  totalOrdersManaged: number;
}

interface Stats {
  totalAdmins: number;
  activeAdmins: number;
  totalCustomers: number;
  totalDeliveryPartners: number;
  totalOrders: number;
  totalRevenue: number;
}

const adminSchema = zod.object({
  id: zod.string().optional(),
  name: zod.string().min(2, "Name must be at least 2 characters"),
  email: zod.string().email("Please enter a valid email address"),
  phone: zod.string().min(10, "Phone number must be at least 10 digits"),
  address: zod.string().min(5, "Address must be complete"),
  pincode: zod.string().min(4, "Pincode is too short"),
  password: zod.string().optional().or(zod.literal("")),
}).superRefine((data, ctx) => {
  // If editing, password is optional but if provided it must be at least 6 characters
  if (data.id) {
    if (data.password && data.password.length > 0 && data.password.length < 6) {
      ctx.addIssue({
        code: zod.ZodIssueCode.custom,
        message: "Password must be at least 6 characters",
        path: ["password"],
      });
    }
  } else {
    // If creating, password is required and must be at least 6 characters
    if (!data.password || data.password.length < 6) {
      ctx.addIssue({
        code: zod.ZodIssueCode.custom,
        message: "Password must be at least 6 characters",
        path: ["password"],
      });
    }
  }
});

type AdminForm = zod.infer<typeof adminSchema>;

export default function SuperAdminDashboard() {
  const { data: session } = useSession();
  const [admins, setAdmins] = useState<BusinessAdmin[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<BusinessAdmin | null>(null);
  const [createdCredentials, setCreatedCredentials] = useState<{
    name: string;
    email: string;
    passwordHash: string; // we will display what the super admin entered as password
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<AdminForm>({
    resolver: zodResolver(adminSchema),
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [adminsRes, statsRes] = await Promise.all([
        fetch("/api/super-admin/admins"),
        fetch("/api/super-admin/stats")
      ]);

      if (adminsRes.ok && statsRes.ok) {
        const adminsData = await adminsRes.json();
        const statsData = await statsRes.json();
        setAdmins(adminsData);
        setStats(statsData);
      } else {
        toast.error("Failed to load platform data.");
      }
    } catch (err) {
      toast.error("Network error loading dashboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      fetchData();
    }
  }, [session]);

  const handleEditClick = (admin: BusinessAdmin) => {
    setEditingAdmin(admin);
    setValue("id", admin.id);
    setValue("name", admin.name);
    setValue("email", admin.email);
    setValue("phone", admin.phone);
    setValue("address", admin.address);
    setValue("pincode", admin.pincode);
    setValue("password", "");
    setShowAddModal(true);
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setEditingAdmin(null);
    reset({
      id: "",
      name: "",
      email: "",
      phone: "",
      address: "",
      pincode: "",
      password: ""
    });
  };

  const handleSaveAdmin = async (data: AdminForm) => {
    setSubmitting(true);
    try {
      const payload: any = { ...data };
      if (editingAdmin) {
        payload.id = editingAdmin.id;
        if (!payload.password || payload.password.trim() === "") {
          delete payload.password;
        }
      } else {
        delete payload.id;
      }

      const res = await fetch("/api/super-admin/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        if (editingAdmin) {
          toast.success(`Business Admin "${data.name}" updated!`);
          handleCloseModal();
          fetchData();
        } else {
          toast.success(`Business Admin "${data.name}" created!`);
          setCreatedCredentials({
            name: data.name,
            email: data.email,
            passwordHash: data.password || ""
          });
          handleCloseModal();
          fetchData();
        }
      } else {
        const errData = await res.json();
        toast.error(errData.error || `Failed to ${editingAdmin ? "update" : "create"} business admin.`);
      }
    } catch (err) {
      toast.error("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleAdminStatus = async (admin: BusinessAdmin) => {
    const confirmAction = confirm(
      `Are you sure you want to ${admin.isActive ? "DEACTIVATE" : "REACTIVATE"} Business Admin "${admin.name}"?`
    );
    if (!confirmAction) return;

    try {
      const res = await fetch("/api/super-admin/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: admin.id,
          isActive: !admin.isActive,
        }),
      });

      if (res.ok) {
        toast.success(`Admin account status updated!`);
        fetchData();
      } else {
        toast.error("Failed to update status.");
      }
    } catch (err) {
      toast.error("Network error.");
    }
  };

  const handleCopyCredentials = () => {
    if (!createdCredentials) return;
    const text = `AquaHome Business Admin Credentials:\nName: ${createdCredentials.name}\nEmail: ${createdCredentials.email}\nPassword: ${createdCredentials.passwordHash}\n\nLogin at: ${window.location.origin}/admin/login`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Credentials copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const generateRandomPassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < 10; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setValue("password", password);
    toast.success("Random strong password generated!");
  };

  const filteredAdmins = admins.filter((admin) => {
    const matchesSearch =
      admin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      admin.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      admin.phone.includes(searchQuery);

    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "ACTIVE" && admin.isActive) ||
      (statusFilter === "DEACTIVATED" && !admin.isActive);

    return matchesSearch && matchesStatus;
  });

  if (loading && !stats) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-lg w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-28 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          ))}
        </div>
        <div className="h-96 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Welcome banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">
            Platform Control Center
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Monitor system metrics and manage Business Administrator access.
          </p>
        </div>
        <button
          onClick={() => {
            setEditingAdmin(null);
            reset({
              id: "",
              name: "",
              email: "",
              phone: "",
              address: "",
              pincode: "",
              password: ""
            });
            setShowAddModal(true);
          }}
          className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-sky-500 text-white text-xs font-bold rounded-xl shadow-md hover:opacity-90 transition flex items-center gap-1.5 self-start md:self-auto"
        >
          <Plus size={16} /> Create Business Admin
        </button>
      </div>

      {/* Platform stats summary grid */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-sky-950 rounded-2xl p-4 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Business Admins</span>
              <span className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 block mt-1">{stats.totalAdmins}</span>
              <span className="text-[10px] text-green-600 dark:text-green-400 font-bold">{stats.activeAdmins} active accounts</span>
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-xl">
              <UserCheck size={20} />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-sky-950 rounded-2xl p-4 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Total Customers</span>
              <span className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 block mt-1">{stats.totalCustomers}</span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500">Registered on app</span>
            </div>
            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <Users size={20} />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-sky-950 rounded-2xl p-4 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Delivery Partners</span>
              <span className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 block mt-1">{stats.totalDeliveryPartners}</span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500">Active dispatch team</span>
            </div>
            <div className="p-3 bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400 rounded-xl">
              <Activity size={20} />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-sky-950 rounded-2xl p-4 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">System Orders</span>
              <span className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 block mt-1">{stats.totalOrders}</span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500">Excludes cancelled</span>
            </div>
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-500 rounded-xl">
              <ShoppingBag size={20} />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-sky-950 rounded-2xl p-4 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Platform Revenue</span>
              <span className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 block mt-1">${stats.totalRevenue.toFixed(2)}</span>
              <span className="text-[10px] text-green-600 dark:text-green-400 font-bold">Total paid transactions</span>
            </div>
            <div className="p-3 bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-400 rounded-xl">
              <DollarSign size={20} />
            </div>
          </div>

        </div>
      )}

      {/* Admin management section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-sky-950 rounded-2xl shadow-sm overflow-hidden p-5 space-y-4">
        
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2">
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Business Administrator Directory
          </h3>
          
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input
                type="text"
                placeholder="Search administrators..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-60 pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-sky-950 bg-slate-50/50 dark:bg-slate-800/50 text-xs focus:border-blue-500 outline-none transition dark:text-slate-200"
              />
            </div>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-sky-950 bg-slate-50/50 dark:bg-slate-800/50 text-xs focus:border-blue-500 outline-none transition dark:text-slate-200"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="DEACTIVATED">Deactivated</option>
            </select>
          </div>
        </div>

        {/* Admins Table */}
        <div className="overflow-x-auto border border-slate-50 dark:border-sky-950/40 rounded-xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/40 text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest border-b border-slate-100 dark:border-sky-950">
                <th className="p-3.5">Name / Contact</th>
                <th className="p-3.5">Physical Address / region</th>
                <th className="p-3.5">Joined Date</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Access Management</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-950 text-xs">
              {filteredAdmins.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400 dark:text-slate-500 italic">
                    No administrators found matching filter conditions.
                  </td>
                </tr>
              ) : (
                filteredAdmins.map((admin) => (
                  <tr key={admin.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                    <td className="p-3.5">
                      <p className="font-bold text-slate-800 dark:text-slate-200">{admin.name}</p>
                      <p className="text-[10px] text-slate-400">{admin.email} • {admin.phone}</p>
                    </td>
                    <td className="p-3.5">
                      <p className="text-slate-700 dark:text-slate-300 font-medium">{admin.address}</p>
                      <p className="text-[10px] text-slate-400">Pincode: {admin.pincode}</p>
                    </td>
                    <td className="p-3.5 text-slate-500 font-medium">
                      {new Date(admin.createdAt).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </td>
                    <td className="p-3.5">
                      <span className={`inline-flex items-center gap-1 font-bold ${admin.isActive ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>
                        {admin.isActive ? "● Active" : "● Deactivated"}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEditClick(admin)}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-sky-950 hover:bg-slate-50 dark:hover:bg-slate-800 text-[10px] font-extrabold tracking-wider uppercase transition text-slate-600 dark:text-slate-400 flex items-center gap-1"
                        >
                          <Pencil size={10} /> Edit
                        </button>
                        <button
                          onClick={() => toggleAdminStatus(admin)}
                          className={`px-3 py-1.5 rounded-lg border text-[10px] font-extrabold tracking-wider uppercase transition ${
                            admin.isActive
                              ? "border-red-100 dark:border-red-950 bg-red-50/20 hover:bg-red-50 text-red-500"
                              : "border-green-100 dark:border-green-950 bg-green-50/20 hover:bg-green-50 text-green-600 dark:text-green-400"
                          }`}
                        >
                          {admin.isActive ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* Credentials presentation screen / success modal */}
      {createdCredentials && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-100 dark:border-sky-950 rounded-2xl p-6 shadow-2xl space-y-4 animate-scaleUp">
            
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-sky-950 pb-2">
              <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <ShieldCheck className="text-green-500" />
                Account Created Successfully!
              </h3>
              <button
                onClick={() => setCreatedCredentials(null)}
                className="p-1 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              The credentials for the newly created Business Administrator are listed below. Please copy and store them securely, as they will not be shown again.
            </p>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-sky-950 rounded-xl space-y-3 text-xs">
              <div className="flex justify-between border-b border-slate-100 dark:border-sky-950 pb-2">
                <span className="text-slate-400 font-medium">Name:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{createdCredentials.name}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 dark:border-sky-950 pb-2">
                <span className="text-slate-400 font-medium">Portal Email:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{createdCredentials.email}</span>
              </div>
              <div className="flex justify-between pb-1">
                <span className="text-slate-400 font-medium">Temporary Password:</span>
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{createdCredentials.passwordHash}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleCopyCredentials}
                className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-sky-500 text-white rounded-xl text-xs font-bold shadow hover:opacity-90 transition flex items-center justify-center gap-1.5"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? "Copied!" : "Copy Credentials"}
              </button>
              <button
                onClick={() => setCreatedCredentials(null)}
                className="flex-1 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-50 border border-slate-100 dark:border-sky-950 rounded-xl transition"
              >
                Close Portal
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Add Admin Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-sky-950 rounded-2xl p-6 shadow-2xl flex flex-col gap-4 animate-scaleUp max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-sky-950 pb-2">
              <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100">
                {editingAdmin ? "Edit Business Administrator" : "Register Business Administrator"}
              </h3>
              <button
                onClick={handleCloseModal}
                className="p-1 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit(handleSaveAdmin)} className="space-y-3.5">
              
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block">Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Robert Smith"
                  {...register("name")}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-sky-950 bg-slate-50/50 dark:bg-slate-800/50 text-sm focus:border-blue-500 outline-none transition dark:text-slate-200"
                />
                {errors.name && (
                  <p className="text-red-500 text-[10px] font-semibold">{errors.name.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block">Portal Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input
                      type="email"
                      placeholder="admin@email.com"
                      {...register("email")}
                      className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-sky-950 bg-slate-50/50 dark:bg-slate-800/50 text-sm focus:border-blue-500 outline-none transition dark:text-slate-200"
                    />
                  </div>
                  {errors.email && (
                    <p className="text-red-500 text-[10px] font-semibold">{errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input
                      type="text"
                      placeholder="e.g. 9876543210"
                      {...register("phone")}
                      className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-sky-950 bg-slate-50/50 dark:bg-slate-800/50 text-sm focus:border-blue-500 outline-none transition dark:text-slate-200"
                    />
                  </div>
                  {errors.phone && (
                    <p className="text-red-500 text-[10px] font-semibold">{errors.phone.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block">Pincode / Zipcode</label>
                  <input
                    type="text"
                    placeholder="700091"
                    {...register("pincode")}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-sky-950 bg-slate-50/50 dark:bg-slate-800/50 text-sm focus:border-blue-500 outline-none transition dark:text-slate-200"
                  />
                  {errors.pincode && (
                    <p className="text-red-500 text-[10px] font-semibold">{errors.pincode.message}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block">
                      {editingAdmin ? "Change Password (Optional)" : "Admin Password"}
                    </label>
                    <button
                      type="button"
                      onClick={generateRandomPassword}
                      className="text-[10px] text-blue-600 dark:text-blue-400 font-bold hover:underline"
                    >
                      Auto Generate
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input
                      type="text"
                      placeholder={editingAdmin ? "Leave blank to keep current" : "Min 6 characters"}
                      {...register("password")}
                      className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-sky-950 bg-slate-50/50 dark:bg-slate-800/50 text-sm focus:border-blue-500 outline-none transition dark:text-slate-200 font-mono"
                    />
                  </div>
                  {errors.password && (
                    <p className="text-red-500 text-[10px] font-semibold">{errors.password.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block">Physical Address</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 text-slate-400" size={14} />
                  <textarea
                    placeholder="Enter full physical address details..."
                    rows={2.5}
                    {...register("address")}
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-sky-950 bg-slate-50/50 dark:bg-slate-800/50 text-sm focus:border-blue-500 outline-none transition dark:text-slate-200"
                  />
                </div>
                {errors.address && (
                  <p className="text-red-500 text-[10px] font-semibold">{errors.address.message}</p>
                )}
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-100 dark:border-sky-950">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-50 border border-slate-100 dark:border-sky-950 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 text-xs font-bold bg-gradient-to-r from-blue-600 to-sky-500 text-white rounded-xl shadow transition flex items-center justify-center gap-1.5"
                  disabled={submitting}
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingAdmin ? "Update Administrator" : "Save Administrator")}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
