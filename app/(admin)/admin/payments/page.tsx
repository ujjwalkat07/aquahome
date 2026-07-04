"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Loader2, CreditCard, IndianRupee, CheckCircle2, Clock, Check, X, FileText, Printer, ArrowDown, Search, Calendar, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";

interface User {
  name: string;
  email: string;
  phone: string;
}

interface OrderInfo {
  status: string;
  deliveryTimeSlot: string;
  createdAt: string;
  isScheduled: boolean;
  scheduleFrequency: string | null;
}

interface Payment {
  id: string;
  amount: number;
  status: "PAID" | "UNPAID";
  paidAt: string | null;
  method: string | null;
  note: string | null;
  createdAt: string;
  user: User;
  order: OrderInfo;
}

interface UserSummary {
  name: string;
  email: string;
  invoiced: number;
  paid: number;
  outstanding: number;
}

export default function AdminPayments() {
  const { data: session } = useSession();
  
  // States
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReport, setShowReport] = useState(false);

  // Filters State
  const [dateFilter, setDateFilter] = useState<"ALL" | "TODAY" | "PAST">("ALL");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "ONETIME" | "RECURRING">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Form State
  const [recordPaymentId, setRecordPaymentId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [paymentNote, setPaymentNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchPayments = async () => {
    try {
      const res = await fetch("/api/admin/payments");
      if (res.ok) {
        const data = await res.json();
        setPayments(data);
      }
    } catch (err) {
      toast.error("Failed to load payments ledgers.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      fetchPayments();
    }
  }, [session]);

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recordPaymentId) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentId: recordPaymentId,
          method: paymentMethod,
          note: paymentNote,
        }),
      });

      if (res.ok) {
        toast.success("Payment recorded successfully!");
        setRecordPaymentId(null);
        setPaymentNote("");
        fetchPayments();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to record payment.");
      }
    } catch (err) {
      toast.error("Network error.");
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered Payments computation
  const filteredPayments = payments.filter((p) => {
    // 1. Date Filter
    let matchesDate = true;
    const paymentDate = new Date(p.createdAt);
    const today = new Date();
    const isToday = paymentDate.toDateString() === today.toDateString();
    
    if (dateFilter === "TODAY") {
      matchesDate = isToday;
    } else if (dateFilter === "PAST") {
      const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      matchesDate = paymentDate < startOfToday;
    }

    // 2. Type Filter (Recurring vs One-time)
    let matchesType = true;
    if (typeFilter === "ONETIME") {
      matchesType = !p.order?.isScheduled;
    } else if (typeFilter === "RECURRING") {
      matchesType = !!p.order?.isScheduled;
    }

    // 3. Search Query
    let matchesSearch = true;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      matchesSearch =
        p.user.name.toLowerCase().includes(q) ||
        p.user.email.toLowerCase().includes(q) ||
        p.user.phone.includes(q) ||
        p.id.toLowerCase().includes(q) ||
        (p.order?.deliveryTimeSlot || "").toLowerCase().includes(q);
    }

    return matchesDate && matchesType && matchesSearch;
  });

  // Compile user summaries for the report
  const getUserSummaries = (): UserSummary[] => {
    const map = new Map<string, UserSummary>();

    filteredPayments.forEach((p) => {
      const email = p.user.email;
      let existing = map.get(email);

      if (!existing) {
        existing = {
          name: p.user.name,
          email: p.user.email,
          invoiced: 0,
          paid: 0,
          outstanding: 0,
        };
        map.set(email, existing);
      }

      existing.invoiced += p.amount;
      if (p.status === "PAID") {
        existing.paid += p.amount;
      } else {
        existing.outstanding += p.amount;
      }
    });

    return Array.from(map.values());
  };

  const totalOutstanding = filteredPayments
    .filter((p) => p.status === "UNPAID")
    .reduce((sum, p) => sum + p.amount, 0);

  const totalCollected = filteredPayments
    .filter((p) => p.status === "PAID")
    .reduce((sum, p) => sum + p.amount, 0);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="w-8 h-8 text-[#0077B6] animate-spin" />
        <p className="text-sm text-slate-500">Loading billing registry...</p>
      </div>
    );
  }

  const summaries = getUserSummaries();

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-sky-950 pb-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <CreditCard className="text-[#0077B6]" />
            Payment & Accounts Ledger
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Reconcile outstanding balances and inspect invoices list.
          </p>
        </div>
        <button
          onClick={() => setShowReport(!showReport)}
          className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 border border-slate-200 dark:border-sky-950 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl shadow transition flex items-center gap-1.5 self-start sm:self-auto"
        >
          <FileText size={16} /> {showReport ? "Show Transactions Log" : "Generate Balance Report"}
        </button>
      </div>

      {/* Filters Control Panel */}
      <div className="bg-slate-50/50 dark:bg-slate-800/10 border border-slate-100 dark:border-sky-950/60 rounded-2xl p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search by customer name, phone, email or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-sky-950 bg-white dark:bg-slate-900 text-xs focus:border-[#0077B6] outline-none transition"
          />
        </div>
        
        <div className="flex flex-wrap w-full md:w-auto gap-3 items-center">
          {/* Date Filter */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-sky-950 px-2.5 py-1.5 rounded-xl">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Date:</span>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="text-xs font-semibold bg-transparent border-none outline-none dark:text-slate-200 cursor-pointer"
            >
              <option value="ALL">All Time</option>
              <option value="TODAY">Today (Daily)</option>
              <option value="PAST">Past Billing</option>
            </select>
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-sky-950 px-2.5 py-1.5 rounded-xl">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Type:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="text-xs font-semibold bg-transparent border-none outline-none dark:text-slate-200 cursor-pointer"
            >
              <option value="ALL">All Types</option>
              <option value="ONETIME">One-time Orders</option>
              <option value="RECURRING">Recurring (Subscription)</option>
            </select>
          </div>

          {/* Reset Filters */}
          {(dateFilter !== "ALL" || typeFilter !== "ALL" || searchQuery) && (
            <button
              onClick={() => {
                setDateFilter("ALL");
                setTypeFilter("ALL");
                setSearchQuery("");
              }}
              className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-xl transition text-xs font-bold flex items-center gap-1"
              title="Reset Filters"
            >
              <RefreshCw size={13} className="animate-spin-once" />
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Grid of stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-[#0077B6] text-white rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-sky-100 uppercase tracking-wider block">Total Outstanding Balance</span>
            <span className="text-2xl font-extrabold mt-1 block">₹{totalOutstanding.toFixed(2)}</span>
          </div>
          <div className="p-2.5 bg-white/10 rounded-full">
            <Clock size={20} />
          </div>
        </div>
        <div className="bg-green-600 text-white rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-green-100 uppercase tracking-wider block">Total Collected Revenue</span>
            <span className="text-2xl font-extrabold mt-1 block">₹{totalCollected.toFixed(2)}</span>
          </div>
          <div className="p-2.5 bg-white/10 rounded-full">
            <CheckCircle2 size={20} />
          </div>
        </div>
      </div>

      {/* Show balance report if toggled */}
      {showReport ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-sky-950 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-50 dark:border-sky-950 pb-3">
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Customer Accounts Balance Report
            </h3>
            <button
              onClick={() => window.print()}
              className="px-2.5 py-1.5 border border-slate-200 dark:border-sky-950 hover:bg-slate-50 dark:hover:bg-slate-800 text-[10px] font-bold rounded-lg flex items-center gap-1 text-slate-500"
            >
              <Printer size={12} /> Print Report
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-850 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-sky-950">
                  <th className="p-3">Customer Name</th>
                  <th className="p-3">Email Address</th>
                  <th className="p-3">Total Invoiced</th>
                  <th className="p-3">Total Paid</th>
                  <th className="p-3">Outstanding Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-950">
                {summaries.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-slate-400 italic">No customer data.</td>
                  </tr>
                ) : (
                  summaries.map((sum) => (
                    <tr key={sum.email} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                      <td className="p-3 font-bold text-slate-800 dark:text-slate-200">{sum.name}</td>
                      <td className="p-3 text-slate-500">{sum.email}</td>
                      <td className="p-3 font-semibold text-slate-700 dark:text-slate-300">₹{sum.invoiced.toFixed(2)}</td>
                      <td className="p-3 font-semibold text-green-600 dark:text-green-400">₹{sum.paid.toFixed(2)}</td>
                      <td className="p-3 font-bold text-red-500">₹{sum.outstanding.toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Transactions Ledger Table */
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-sky-950 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/40 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-sky-950">
                  <th className="p-4">Invoice ID</th>
                  <th className="p-4">Customer</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4">Date Generated</th>
                  <th className="p-4">Billing Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-950 text-xs">
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400 italic">No invoices found.</td>
                  </tr>
                ) : (
                  filteredPayments.map((p) => {
                    const isPaid = p.status === "PAID";
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                        <td className="p-4">
                          <div className="flex flex-col gap-1 items-start">
                            <p className="font-extrabold text-slate-400 uppercase">#{p.id.slice(0, 8)}</p>
                            <div className="flex flex-wrap gap-1">
                              {isPaid && p.method && (
                                <span className="text-[9px] font-bold text-green-600 bg-green-50 dark:bg-green-950/40 px-1 py-0.5 rounded">
                                  {p.method}
                                </span>
                              )}
                              {p.order?.isScheduled && (
                                <span className="text-[9px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.5 rounded">
                                  Recurring ({p.order.scheduleFrequency})
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <p className="font-bold text-slate-800 dark:text-slate-200">{p.user.name}</p>
                          <p className="text-[10px] text-slate-400">{p.user.phone}</p>
                        </td>
                        <td className="p-4 font-bold text-slate-700 dark:text-slate-300">
                          ₹{p.amount.toFixed(2)}
                        </td>
                        <td className="p-4 text-slate-500">
                          {new Date(p.createdAt).toLocaleDateString()}
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center gap-0.5 font-bold ${isPaid ? "text-green-600 dark:text-green-400" : "text-amber-500"}`}>
                            {isPaid ? "● PAID" : "● UNPAID"}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          {!isPaid ? (
                            <button
                              onClick={() => setRecordPaymentId(p.id)}
                              className="px-3 py-1.5 bg-green-50 hover:bg-green-100 dark:bg-green-950/20 text-green-600 dark:text-green-400 text-xs font-bold rounded-lg border border-green-100 dark:border-green-950/50 transition"
                            >
                              Collect Fee
                            </button>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-500 text-[10px] font-semibold italic">Reconciled</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Record Payment Dialog */}
      {recordPaymentId && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center animate-fadeIn p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-100 dark:border-sky-950 rounded-2xl p-6 shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-sky-950 pb-3">
              <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-100">Record Fee Collection</h3>
              <button onClick={() => setRecordPaymentId(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block">Collection Mode</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-sky-950 bg-slate-50/50 dark:bg-slate-800 text-sm focus:border-[#0077B6] outline-none transition"
                >
                  <option value="CASH">Cash Payment</option>
                  <option value="BANK_TRANSFER">Bank Wire Transfer</option>
                  <option value="CARD">Debit / Credit Card</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block">Transaction Reference / Note</label>
                <textarea
                  placeholder="e.g. Received cash at door step, transfer ref ID..."
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-sky-950 bg-slate-50/50 dark:bg-slate-800 text-sm focus:border-[#0077B6] outline-none transition"
                />
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-100 dark:border-sky-950">
                <button
                  type="button"
                  onClick={() => setRecordPaymentId(null)}
                  className="flex-1 py-2.5 font-bold text-slate-500 border border-slate-100 dark:border-sky-950 hover:bg-slate-50 rounded-xl transition"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition flex items-center justify-center"
                  disabled={submitting}
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Reconcile Invoice"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
