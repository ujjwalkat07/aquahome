"use client";

import { useEffect, useState, useRef, useMemo } from "react";
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
  Eye, 
  Phone, 
  MapPin, 
  Search, 
  ShoppingBag,
  QrCode,
  Printer,
  Edit
} from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import QRCode from "qrcode";

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
  vendorId?: string | null;
  vendorName?: string | null;
}

const userSchema = zod.object({
  name: zod.string().min(2, "Name must be at least 2 characters"),
  email: zod.string().email("Please enter a valid email address"),
  phone: zod.string().min(10, "Phone number must be at least 10 digits"),
  address: zod.string().min(5, "Address must be complete"),
  pincode: zod.string().optional().or(zod.literal("")),
  role: zod.enum(["CUSTOMER", "DELIVERY"]),
  password: zod.string().optional().or(zod.literal("")),
});

const editUserSchema = zod.object({
  name: zod.string().min(2, "Name must be at least 2 characters"),
  email: zod.string().email("Please enter a valid email address"),
  phone: zod.string().min(10, "Phone number must be at least 10 digits"),
  address: zod.string().min(5, "Address must be complete"),
  pincode: zod.string().optional().or(zod.literal("")),
  password: zod.string().optional().or(zod.literal("")),
});

type UserForm = zod.infer<typeof userSchema>;
type EditUserForm = zod.infer<typeof editUserSchema>;

// Inline Canvas QR Renderer
function AdminQRCodeCanvas({ text }: { text: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current && text) {
      QRCode.toCanvas(
        canvasRef.current,
        text,
        {
          width: 140,
          margin: 1,
          color: {
            dark: "#0f172a",
            light: "#ffffff",
          },
        },
        (error) => {
          if (error) console.error("QR Code Generation Error:", error);
        }
      );
    }
  }, [text]);

  return <canvas ref={canvasRef} className="rounded-lg shadow-sm border border-slate-100 dark:border-sky-950/20" />;
}

export default function AdminUsers() {
  const { data: session } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [vendorFilter, setVendorFilter] = useState("ALL");

  const vendorsList = useMemo(() => {
    const list: { id: string; name: string }[] = [];
    users.forEach(u => {
      if (u.vendorId && u.vendorName) {
        if (!list.some(v => v.id === u.vendorId)) {
          list.push({ id: u.vendorId, name: u.vendorName });
        }
      }
    });
    return list;
  }, [users]);

  // Form modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<UserForm>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      role: "CUSTOMER"
    }
  });

  const selectedRole = watch("role");

  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    reset: resetEdit,
    formState: { errors: editErrors },
  } = useForm<EditUserForm>({
    resolver: zodResolver(editUserSchema),
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

  const startEditUser = (user: UserProfile) => {
    setEditingUser(user);
    resetEdit({
      name: user.name,
      email: user.email,
      phone: user.phone,
      address: user.address,
      pincode: user.pincode || "",
      password: "",
    });
    setShowEditModal(true);
  };

  const handleUpdateUser = async (data: EditUserForm) => {
    if (!editingUser) return;
    setSubmitting(true);
    try {
      const payload: any = {
        id: editingUser.id,
        name: data.name,
        email: data.email,
        phone: data.phone,
        address: data.address,
        pincode: data.pincode,
      };
      if (data.password) {
        payload.password = data.password;
      }
      
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success(`User details updated successfully!`);
        setShowEditModal(false);
        setEditingUser(null);
        fetchUsers();
      } else {
        const errData = await res.json();
        toast.error(errData.error || "Failed to update user details.");
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

  const handlePrintQR = (user: UserProfile) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Popup blocked! Please allow popups to print QR Code.");
      return;
    }

    const qrValue = `AQUAHOME-CUSTOMER:${user.id}`;
    const accountNum = `AQ-2026-${user.id.slice(0, 6).toUpperCase()}`;

    // Get QR image source from a temporary canvas
    const tempCanvas = document.createElement("canvas");
    QRCode.toCanvas(tempCanvas, qrValue, { width: 300, margin: 1 }, (err) => {
      if (err) {
        console.error(err);
        return;
      }
      const dataUrl = tempCanvas.toDataURL("image/png");

      printWindow.document.write(`
        <html>
          <head>
            <title>Print Customer Card - ${user.name}</title>
            <style>
              body {
                font-family: system-ui, -apple-system, sans-serif;
                text-align: center;
                margin: 0;
                padding: 40px;
                background-color: white;
                color: black;
              }
              .card {
                border: 2px dashed #0077b6;
                border-radius: 20px;
                padding: 30px;
                display: inline-block;
                max-width: 320px;
                margin: 0 auto;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
              }
              .logo {
                font-weight: 800;
                font-size: 22px;
                color: #0077b6;
                margin: 0 0 12px 0;
              }
              .qr-img {
                width: 210px;
                height: 210px;
                margin: 15px auto;
                display: block;
              }
              .acc-num {
                font-family: monospace;
                font-size: 16px;
                font-weight: bold;
                margin: 5px 0;
                background: #f1f5f9;
                padding: 6px 12px;
                border-radius: 8px;
                display: inline-block;
                color: #334155;
              }
              .name {
                font-size: 16px;
                font-weight: bold;
                margin: 12px 0 6px 0;
                color: #1e293b;
              }
              .details {
                font-size: 11px;
                color: #475569;
                margin: 4px 0;
              }
              .footer-text {
                font-size: 9px;
                color: #94a3b8;
                margin-top: 18px;
                letter-spacing: 0.5px;
              }
            </style>
          </head>
          <body>
            <div class="card">
              <div class="logo">💧 AquaHome</div>
              <div class="acc-num">${accountNum}</div>
              <div>
                <img class="qr-img" src="${dataUrl}" alt="QR Code" />
              </div>
              <div class="name">${user.name}</div>
              <div class="details"><strong>Phone:</strong> ${user.phone}</div>
              <div class="details" style="max-width: 260px; margin: 4px auto; word-wrap: break-word;"><strong>Address:</strong> ${user.address}</div>
              <div class="footer-text">Scan Customer QR to record deliveries</div>
            </div>
            <script>
              window.onload = function() {
                window.print();
                setTimeout(function() { window.close(); }, 500);
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    });
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.phone.includes(searchQuery);

    const matchesRole = roleFilter === "ALL" || u.role === roleFilter;

    const matchesVendor =
      vendorFilter === "ALL" ||
      (vendorFilter === "SYSTEM" && !u.vendorId) ||
      u.vendorId === vendorFilter;

    return matchesSearch && matchesRole && matchesVendor;
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
        <select
          value={vendorFilter}
          onChange={(e) => setVendorFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-sky-950 bg-white dark:bg-slate-900 text-sm focus:border-[#0077B6] outline-none transition dark:text-slate-200"
        >
          <option value="ALL">All Vendors</option>
          <option value="SYSTEM">System / Default</option>
          {vendorsList.map(v => (
            <option key={v.id} value={v.id}>{v.name}</option>
          ))}
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
                <th className="p-4">Vendor</th>
                <th className="p-4">Status</th>
                <th className="p-4">Unpaid Balance</th>
                <th className="p-4">Orders Count</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-950 text-xs">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 italic">No users found matching filters.</td>
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
                      <p className="font-semibold text-slate-700 dark:text-slate-350">{user.vendorName || "System / Default"}</p>
                      {user.vendorId && (
                        <p className="text-[9px] text-slate-400 font-mono">ID: {user.vendorId.slice(0, 8)}</p>
                      )}
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1 font-bold ${user.isActive ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>
                        {user.isActive ? "● Active" : "● Deactivated"}
                      </span>
                    </td>
                    <td className="p-4 font-bold text-slate-700 dark:text-slate-300">
                      ₹{user.unpaidBalance.toFixed(2)}
                    </td>
                    <td className="p-4 font-medium text-slate-600 dark:text-slate-400">
                      {user.totalOrders} deliveries
                    </td>
                    <td className="p-4 text-right flex items-center justify-end gap-1.5">
                      {user.role === "CUSTOMER" && (
                        <button
                          onClick={() => router.push(`/admin/orders?customerId=${user.id}`)}
                          className="p-1.5 rounded-lg border border-slate-100 dark:border-sky-950 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 hover:text-[#0077B6] transition"
                          title="Place order on behalf"
                        >
                          <ShoppingBag size={16} />
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedUser(user)}
                        className="p-1.5 rounded-lg border border-slate-100 dark:border-sky-950 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 transition"
                        title="View details & QR"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => startEditUser(user)}
                        className="p-1.5 rounded-lg border border-slate-100 dark:border-sky-950 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 hover:text-sky-600 transition"
                        title="Edit user profile"
                      >
                        <Edit size={16} />
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
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border-l border-slate-100 dark:border-sky-950 h-full p-6 shadow-2xl flex flex-col justify-between overflow-y-auto animate-slideIn">
            
            {/* Header info */}
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-sky-950 pb-4">
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
              <div className="space-y-5 text-xs">
                
                {/* QR Code Section for Customer */}
                {selectedUser.role === "CUSTOMER" && (
                  <div className="border border-slate-200 dark:border-sky-950 p-4 rounded-2xl flex flex-col items-center justify-center bg-slate-50/50 dark:bg-slate-950/20 text-center gap-2">
                    <span className="text-[10px] font-bold text-[#0077B6] uppercase tracking-wider block">Customer Scannable Code</span>
                    <AdminQRCodeCanvas text={`AQUAHOME-CUSTOMER:${selectedUser.id}`} />
                    <span className="text-[11px] font-mono text-slate-700 dark:text-slate-350 font-bold mt-1">
                      AQ-2026-{selectedUser.id.slice(0, 6).toUpperCase()}
                    </span>
                    <button
                      onClick={() => handlePrintQR(selectedUser)}
                      className="mt-2 px-3.5 py-2 bg-gradient-to-r from-[#0077B6] to-[#00B4D8] hover:opacity-90 text-white text-[11px] font-bold rounded-xl flex items-center gap-1.5 transition shadow animate-pulse"
                    >
                      <Printer size={13} /> Print Customer Card
                    </button>
                  </div>
                )}
                
                <div className="p-3 bg-slate-50/50 dark:bg-slate-800/20 rounded-xl space-y-2.5">
                  <div className="flex items-start gap-2 text-slate-600 dark:text-slate-400">
                    <Phone size={14} className="mt-0.5 text-slate-400 flex-shrink-0" />
                    <span><strong>Phone:</strong> {selectedUser.phone}</span>
                  </div>
                  <div className="flex items-start gap-2 text-slate-600 dark:text-slate-400">
                    <MapPin size={14} className="mt-0.5 text-slate-400 flex-shrink-0" />
                    <span><strong>Address:</strong> {selectedUser.address}{selectedUser.pincode ? ` (${selectedUser.pincode})` : ""}</span>
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
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Unpaid Balance</span>
                    <span className="text-base font-extrabold text-red-500 mt-1 block">
                      ₹{selectedUser.unpaidBalance.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="font-bold text-slate-700 dark:text-slate-300 block uppercase tracking-wider text-[10px]">Administrative Details</span>
                  <div className="flex justify-between p-2.5 border border-slate-150 dark:border-sky-950 rounded-xl">
                    <span className="text-slate-500">Registered On:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {new Date(selectedUser.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

              </div>
            </div>

            {/* Actions Footer */}
            <div className="border-t border-slate-200 dark:border-sky-950 pt-4 mt-6 flex gap-3">
              {selectedUser.role === "CUSTOMER" && (
                <button
                  onClick={() => {
                    setSelectedUser(null);
                    router.push(`/admin/orders?customerId=${selectedUser.id}`);
                  }}
                  className="flex-1 py-3 text-xs font-bold bg-[#0077B6] hover:bg-[#023E8A] text-white rounded-xl transition flex items-center justify-center gap-1.5"
                >
                  <ShoppingBag size={14} /> Place Order
                </button>
              )}
              <button
                onClick={() => {
                  setSelectedUser(null);
                  startEditUser(selectedUser);
                }}
                className="flex-1 py-3 text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-750 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-750 rounded-xl transition flex items-center justify-center gap-1.5"
              >
                <Edit size={14} /> Edit Profile
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/45 dark:bg-slate-950/65 backdrop-blur-sm z-50 flex items-center justify-center animate-fadeIn p-4">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-sky-950 rounded-2xl p-6 shadow-2xl flex flex-col gap-5 animate-scaleUp max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-slate-150 dark:border-sky-950 pb-3">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-650 dark:text-slate-400 block">Role Assignment</label>
                  <select
                    {...register("role")}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-sky-950 bg-slate-50/50 dark:bg-slate-800/50 text-sm focus:border-[#0077B6] outline-none transition"
                  >
                    <option value="CUSTOMER">Customer (Sub-User)</option>
                    <option value="DELIVERY">Delivery Partner</option>
                  </select>
                </div>

                {selectedRole === "DELIVERY" && (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-650 dark:text-slate-400 block">Temp Password</label>
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
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-650 dark:text-slate-400 block">Full Name</label>
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
                  <label className="text-xs font-semibold text-slate-650 dark:text-slate-400 block">Email Address</label>
                  <input
                    type="email"
                    placeholder="john@email.com"
                    {...register("email")}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-sky-950 bg-slate-50/50 dark:bg-slate-800/55 text-sm focus:border-[#0077B6] outline-none transition"
                  />
                  {errors.email && (
                    <p className="text-red-500 text-[10px] font-semibold">{errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-650 dark:text-slate-400 block">Phone Number</label>
                  <input
                    type="text"
                    placeholder="1234567890"
                    {...register("phone")}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-sky-950 bg-slate-50/50 dark:bg-slate-800/55 text-sm focus:border-[#0077B6] outline-none transition"
                  />
                  {errors.phone && (
                    <p className="text-red-500 text-[10px] font-semibold">{errors.phone.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-650 dark:text-slate-400 block">Area Pincode</label>
                  <input
                    type="text"
                    placeholder="700091"
                    {...register("pincode")}
                    className="w-full sm:w-1/2 px-3 py-2 rounded-lg border border-slate-200 dark:border-sky-950 bg-slate-50/50 dark:bg-slate-800/55 text-sm focus:border-[#0077B6] outline-none transition"
                  />
                  {errors.pincode && (
                    <p className="text-red-500 text-[10px] font-semibold">{errors.pincode.message}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-650 dark:text-slate-400 block">Physical Delivery Address</label>
                  <textarea
                    placeholder="Flat, building details..."
                    rows={2}
                    {...register("address")}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-sky-950 bg-slate-50/50 dark:bg-slate-800/55 text-sm focus:border-[#0077B6] outline-none transition"
                  />
                  {errors.address && (
                    <p className="text-red-500 text-[10px] font-semibold">{errors.address.message}</p>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-150 dark:border-sky-950">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    reset();
                  }}
                  className="flex-1 py-3 text-xs font-bold text-slate-500 hover:bg-slate-50 border border-slate-200 dark:border-sky-950 rounded-xl transition"
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

      {/* Edit User Modal */}
      {showEditModal && editingUser && (
        <div className="fixed inset-0 bg-slate-950/45 dark:bg-slate-950/65 backdrop-blur-sm z-50 flex items-center justify-center animate-fadeIn p-4">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-sky-950 rounded-2xl p-6 shadow-2xl flex flex-col gap-5 animate-scaleUp max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-slate-150 dark:border-sky-950 pb-3">
              <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100">
                Edit {editingUser.role === "CUSTOMER" ? "Customer" : "Delivery Executive"} Account
              </h3>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingUser(null);
                }}
                className="p-1 rounded-lg hover:bg-slate-50 text-slate-400 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitEdit(handleUpdateUser)} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-650 dark:text-slate-400 block">Full Name</label>
                <input
                  type="text"
                  placeholder="John Doe"
                  {...registerEdit("name")}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-sky-950 bg-slate-50/50 dark:bg-slate-800/50 text-sm focus:border-[#0077B6] outline-none transition"
                />
                {editErrors.name && (
                  <p className="text-red-500 text-[10px] font-semibold">{editErrors.name.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-650 dark:text-slate-400 block">Email Address</label>
                  <input
                    type="email"
                    placeholder="john@email.com"
                    {...registerEdit("email")}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-sky-950 bg-slate-50/50 dark:bg-slate-800/50 text-sm focus:border-[#0077B6] outline-none transition"
                  />
                  {editErrors.email && (
                    <p className="text-red-500 text-[10px] font-semibold">{editErrors.email.message}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-650 dark:text-slate-400 block">Phone Number</label>
                  <input
                    type="text"
                    placeholder="1234567890"
                    {...registerEdit("phone")}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-sky-950 bg-slate-50/50 dark:bg-slate-800/50 text-sm focus:border-[#0077B6] outline-none transition"
                  />
                  {editErrors.phone && (
                    <p className="text-red-500 text-[10px] font-semibold">{editErrors.phone.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-650 dark:text-slate-400 block">Area Pincode</label>
                  <input
                    type="text"
                    placeholder="700091"
                    {...registerEdit("pincode")}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-sky-950 bg-slate-50/50 dark:bg-slate-800/50 text-sm focus:border-[#0077B6] outline-none transition"
                  />
                  {editErrors.pincode && (
                    <p className="text-red-500 text-[10px] font-semibold">{editErrors.pincode.message}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-650 dark:text-slate-400 block">
                    Change Password <span className="text-[10px] text-slate-400 font-normal">(Leave blank to keep current)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="New password (optional)"
                    {...registerEdit("password")}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-sky-950 bg-slate-50/50 dark:bg-slate-800/50 text-sm focus:border-[#0077B6] outline-none transition"
                  />
                  {editErrors.password && (
                    <p className="text-red-500 text-[10px] font-semibold">{editErrors.password.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-650 dark:text-slate-400 block">Physical Delivery Address</label>
                <textarea
                  placeholder="Flat, building details..."
                  rows={2}
                  {...registerEdit("address")}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-sky-950 bg-slate-50/50 dark:bg-slate-800/50 text-sm focus:border-[#0077B6] outline-none transition"
                />
                {editErrors.address && (
                  <p className="text-red-500 text-[10px] font-semibold">{editErrors.address.message}</p>
                )}
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-150 dark:border-sky-950">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingUser(null);
                  }}
                  className="flex-1 py-3 text-xs font-bold text-slate-500 hover:bg-slate-50 border border-slate-200 dark:border-sky-950 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 text-xs font-bold bg-gradient-to-r from-[#0077B6] to-[#00B4D8] text-white rounded-xl shadow transition flex items-center justify-center gap-1.5"
                  disabled={submitting}
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
