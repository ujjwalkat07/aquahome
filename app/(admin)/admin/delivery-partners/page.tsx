"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as zod from "zod";
import { Loader2, Truck, Plus, Eye, Phone, MapPin, X, ShieldCheck, ShieldAlert, Award, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";

interface AssignedOrder {
  id: string;
  status: "PENDING" | "IN_PROGRESS" | "DELIVERED" | "CANCELLED";
}

interface PartnerProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  pincode: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  orders: AssignedOrder[]; // assignedOrders for delivery
}

const partnerSchema = zod.object({
  name: zod.string().min(2, "Name must be at least 2 characters"),
  email: zod.string().email("Please enter a valid email address"),
  phone: zod.string().min(10, "Phone number must be at least 10 digits"),
  address: zod.string().min(5, "Address must be complete"),
  pincode: zod.string().min(4, "Pincode is too short"),
  password: zod.string().min(6, "Password must be at least 6 characters"),
});

type PartnerForm = zod.infer<typeof partnerSchema>;

export default function DeliveryPartners() {
  const { data: session } = useSession();
  const [partners, setPartners] = useState<PartnerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals / forms state
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<PartnerProfile | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PartnerForm>({
    resolver: zodResolver(partnerSchema),
  });

  const fetchPartners = async () => {
    try {
      const res = await fetch("/api/admin/users?role=DELIVERY");
      if (res.ok) {
        const data = await res.json();
        // Map user orders to the layout format
        const mapped = data.map((user: any) => ({
          ...user,
          // Since the API aggregates customer orders or assignedOrders depending on role, let's read the orders list
          orders: user.orders || []
        }));
        setPartners(mapped);
      }
    } catch (err) {
      toast.error("Failed to load delivery partners.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      fetchPartners();
    }
  }, [session]);

  const handleCreatePartner = async (data: PartnerForm) => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          role: "DELIVERY"
        }),
      });

      if (res.ok) {
        toast.success(`Delivery partner "${data.name}" registered successfully!`);
        setShowAddModal(false);
        reset();
        fetchPartners();
      } else {
        const errData = await res.json();
        toast.error(errData.error || "Failed to register partner.");
      }
    } catch (err) {
      toast.error("Network error.");
    } finally {
      setSubmitting(false);
    }
  };

  const togglePartnerActive = async (partner: PartnerProfile) => {
    const confirmAction = confirm(
      `Are you sure you want to ${partner.isActive ? "DEACTIVATE" : "REACTIVATE"} partner "${partner.name}"?`
    );
    if (!confirmAction) return;

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: partner.id,
          isActive: !partner.isActive,
        }),
      });

      if (res.ok) {
        toast.success("Status updated!");
        fetchPartners();
        if (selectedPartner?.id === partner.id) {
          setSelectedPartner(prev => prev ? { ...prev, isActive: !prev.isActive } : null);
        }
      }
    } catch (err) {
      toast.error("Failed to update status.");
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-sky-950 pb-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Truck className="text-[#0077B6]" />
            Delivery Partner Management
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Register and audit delivery partners and view logistics performance metrics.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 bg-gradient-to-r from-[#0077B6] to-[#00B4D8] text-white text-xs font-bold rounded-xl shadow hover:opacity-90 transition flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus size={16} /> Register Partner Account
        </button>
      </div>

      {/* Grid of Partners */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {partners.length === 0 ? (
          <div className="col-span-full text-center py-16 bg-white dark:bg-slate-900 border rounded-2xl p-6 italic text-slate-400">
            No delivery partners registered yet.
          </div>
        ) : (
          partners.map((partner) => {
            // Count status from logs or database orders if available
            // Note: Since this aggregates assigned orders (mapped on client-side)
            const completedCount = partner.orders?.filter(o => o.status === "DELIVERED").length || 0;
            const activeCount = partner.orders?.filter(o => o.status === "PENDING" || o.status === "IN_PROGRESS").length || 0;
            const rate = partner.orders?.length > 0 ? (completedCount / partner.orders.length) * 100 : 100;

            return (
              <div
                key={partner.id}
                className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-sky-950 rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-50 dark:border-sky-950 pb-3">
                    <div className="space-y-0.5">
                      <h3 className="font-bold text-slate-800 dark:text-slate-200">{partner.name}</h3>
                      <span className={`text-[10px] font-bold ${partner.isActive ? "text-green-600" : "text-red-500"}`}>
                        ● {partner.isActive ? "Active" : "Deactivated"}
                      </span>
                    </div>
                    <Award className="text-[#00B4D8]" size={22} />
                  </div>

                  <div className="space-y-2 text-xs text-slate-500 dark:text-slate-400">
                    <p className="flex items-center gap-1.5"><Phone size={13} /> {partner.phone}</p>
                    <p className="flex items-start gap-1.5">
                      <MapPin size={13} className="mt-0.5 flex-shrink-0" />
                      <span className="truncate">{partner.address}</span>
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center pt-2">
                    <div className="p-2 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                      <span className="text-[9px] font-bold text-slate-400 block uppercase">Active</span>
                      <span className="text-sm font-extrabold text-slate-700 dark:text-slate-300 mt-0.5 block">{activeCount}</span>
                    </div>
                    <div className="p-2 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                      <span className="text-[9px] font-bold text-slate-400 block uppercase">Done</span>
                      <span className="text-sm font-extrabold text-green-600 dark:text-green-400 mt-0.5 block">{completedCount}</span>
                    </div>
                    <div className="p-2 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                      <span className="text-[9px] font-bold text-slate-400 block uppercase">Rate</span>
                      <span className="text-sm font-extrabold text-[#0077B6] dark:text-[#00B4D8] mt-0.5 block">{rate.toFixed(0)}%</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-4 border-t border-slate-50 dark:border-sky-950/50 mt-4">
                  <button
                    onClick={() => setSelectedPartner(partner)}
                    className="flex-1 py-2 rounded-lg border border-slate-100 dark:border-sky-950 hover:bg-slate-50 text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center justify-center gap-1"
                  >
                    <Eye size={13} /> View Audit
                  </button>
                  <button
                    onClick={() => togglePartnerActive(partner)}
                    className={`px-3 py-2 rounded-lg border text-xs font-bold transition ${
                      partner.isActive
                        ? "border-red-100 text-red-500 bg-red-50/10 hover:bg-red-50"
                        : "border-green-100 text-green-600 dark:text-green-400 bg-green-50/10 hover:bg-green-50"
                    }`}
                  >
                    {partner.isActive ? <ShieldAlert size={14} /> : <ShieldCheck size={14} />}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Partner Audit Drawer */}
      {selectedPartner && (
        <div className="fixed inset-0 bg-slate-950/40 z-50 flex items-center justify-end animate-fadeIn">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border-l border-slate-100 dark:border-sky-950 h-full p-6 shadow-2xl flex flex-col justify-between animate-slideIn">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-sky-950 pb-4">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Partner Performance Audit</span>
                  <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100">{selectedPartner.name}</h3>
                </div>
                <button onClick={() => setSelectedPartner(null)} className="p-1.5 rounded-lg hover:bg-slate-50 text-slate-400">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <div className="p-3.5 bg-slate-50/50 dark:bg-slate-800/20 border border-slate-100 dark:border-sky-950 rounded-xl space-y-2">
                  <p className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                    <Phone size={14} className="text-slate-400" /> Phone: {selectedPartner.phone}
                  </p>
                  <p className="flex items-start gap-2 text-slate-600 dark:text-slate-400">
                    <MapPin size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
                    <span>Hub Address: {selectedPartner.address} ({selectedPartner.pincode})</span>
                  </p>
                </div>

                <div className="space-y-2">
                  <span className="font-bold text-slate-400 block uppercase tracking-wider text-[10px]">Logistics Summary</span>
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="p-3 border border-slate-100 dark:border-sky-950 rounded-xl">
                      <span className="text-[9px] font-bold text-slate-400 block uppercase">Total Assigned</span>
                      <span className="text-base font-extrabold text-slate-800 dark:text-slate-100 mt-0.5 block">
                        {selectedPartner.orders?.length || 0}
                      </span>
                    </div>
                    <div className="p-3 border border-slate-100 dark:border-sky-950 rounded-xl">
                      <span className="text-[9px] font-bold text-slate-400 block uppercase">Total Completed</span>
                      <span className="text-base font-extrabold text-green-600 dark:text-green-400 mt-0.5 block">
                        {selectedPartner.orders?.filter(o => o.status === "DELIVERED").length || 0}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-sky-50/20 dark:bg-sky-950/20 border border-sky-100/50 dark:border-sky-950 rounded-xl space-y-1.5">
                  <h4 className="font-bold text-[#0077B6] dark:text-[#00B4D8] flex items-center gap-1.5">
                    <Award size={15} /> Delivery Performance Rating
                  </h4>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    This partner is active and matches dispatch areas near <strong>{selectedPartner.pincode}</strong>. They have completed <strong>{selectedPartner.orders?.filter(o => o.status === "DELIVERED").length || 0}</strong> deliveries out of <strong>{selectedPartner.orders?.length || 0}</strong> assigned tasks.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => togglePartnerActive(selectedPartner)}
              className={`w-full py-3 text-xs font-bold rounded-xl transition ${
                selectedPartner.isActive
                  ? "bg-red-50 hover:bg-red-100 text-red-600"
                  : "bg-green-50 hover:bg-green-100 text-green-600 dark:text-green-400"
              }`}
            >
              {selectedPartner.isActive ? "Deactivate Partner" : "Activate Partner"}
            </button>
          </div>
        </div>
      )}

      {/* Add Partner Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/40 z-50 flex items-center justify-center animate-fadeIn p-4">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-sky-950 rounded-2xl p-6 shadow-2xl flex flex-col gap-4 animate-scaleUp">
            
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-sky-950 pb-3">
              <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100">Register Delivery Partner</h3>
              <button onClick={() => { setShowAddModal(false); reset(); }} className="p-1 rounded-lg hover:bg-slate-50 text-slate-400">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit(handleCreatePartner)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1 col-span-2 sm:col-span-1">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block">Full Name</label>
                  <input
                    type="text"
                    placeholder="John Driver"
                    {...register("name")}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-sky-950 bg-slate-50/50 dark:bg-slate-800/50 text-sm focus:border-[#0077B6] outline-none transition"
                  />
                  {errors.name && <p className="text-red-500 text-[10px] font-semibold">{errors.name.message}</p>}
                </div>
                
                <div className="space-y-1 col-span-2 sm:col-span-1">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block">Temporary Password</label>
                  <input
                    type="text"
                    placeholder="At least 6 chars"
                    {...register("password")}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-sky-950 bg-slate-50/50 dark:bg-slate-800/50 text-sm focus:border-[#0077B6] outline-none transition"
                  />
                  {errors.password && <p className="text-red-500 text-[10px] font-semibold">{errors.password.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block">Email Address</label>
                  <input
                    type="email"
                    placeholder="driver@email.com"
                    {...register("email")}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-sky-950 bg-slate-50/50 dark:bg-slate-800/50 text-sm focus:border-[#0077B6] outline-none transition"
                  />
                  {errors.email && <p className="text-red-500 text-[10px] font-semibold">{errors.email.message}</p>}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block">Phone Number</label>
                  <input
                    type="text"
                    placeholder="9876543210"
                    {...register("phone")}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-sky-950 bg-slate-50/50 dark:bg-slate-800/50 text-sm focus:border-[#0077B6] outline-none transition"
                  />
                  {errors.phone && <p className="text-red-500 text-[10px] font-semibold">{errors.phone.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block">Dispatch Pincode</label>
                  <input
                    type="text"
                    placeholder="700091"
                    {...register("pincode")}
                    className="w-full sm:w-1/2 px-3 py-2 rounded-lg border border-slate-200 dark:border-sky-950 bg-slate-50/50 dark:bg-slate-800/50 text-sm focus:border-[#0077B6] outline-none transition"
                  />
                  {errors.pincode && <p className="text-red-500 text-[10px] font-semibold">{errors.pincode.message}</p>}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block">Physical Address / Hub Hub</label>
                  <textarea
                    placeholder="Street, locality details..."
                    rows={2}
                    {...register("address")}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-sky-950 bg-slate-50/50 dark:bg-slate-800/50 text-sm focus:border-[#0077B6] outline-none transition"
                  />
                  {errors.address && <p className="text-red-500 text-[10px] font-semibold">{errors.address.message}</p>}
                </div>
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-100 dark:border-sky-950">
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); reset(); }}
                  className="flex-1 py-3 text-xs font-bold text-slate-500 hover:bg-slate-50 border border-slate-100 dark:border-sky-950 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 text-xs font-bold bg-gradient-to-r from-[#0077B6] to-[#00B4D8] text-white rounded-xl shadow transition flex items-center justify-center gap-1.5"
                  disabled={submitting}
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Partner"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
