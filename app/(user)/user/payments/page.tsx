"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Loader2, CreditCard, IndianRupee, Receipt, CheckCircle, Clock } from "lucide-react";
import toast from "react-hot-toast";

interface Order {
  createdAt: string;
}

interface Payment {
  id: string;
  amount: number;
  status: "PAID" | "UNPAID";
  paidAt: string | null;
  method: string | null;
  note: string | null;
  createdAt: string;
  order: Order;
}

export default function UserPayments() {
  const { data: session } = useSession();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPayments = async () => {
    try {
      const res = await fetch("/api/admin/payments");
      if (res.ok) {
        const data = await res.json();
        setPayments(data);
      }
    } catch (err) {
      toast.error("Failed to load payment history.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      loadPayments();
    }
  }, [session]);

  const unpaidInvoices = payments.filter((p) => p.status === "UNPAID");
  const paidInvoices = payments.filter((p) => p.status === "PAID");
  const totalOutstanding = unpaidInvoices.reduce((sum, p) => sum + p.amount, 0);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="w-8 h-8 text-[#0077B6] animate-spin" />
        <p className="text-sm text-slate-500">Retrieving invoices...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      
      {/* Page Header */}
      <div className="border-b border-slate-200 dark:border-sky-950 pb-4">
        <h2 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <CreditCard className="text-[#0077B6] dark:text-[#00B4D8]" />
          Payments & Billing
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Monitor outstanding invoices and review transaction logs. Note that payments are recorded manually by the admin upon collection.
        </p>
      </div>

      {/* Outstanding Balance card */}
      <div className="bg-gradient-to-r from-[#0077B6] to-[#00B4D8] text-white rounded-2xl p-6 shadow-md flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-xs font-bold text-sky-100 uppercase tracking-wider">Total Outstanding Balance</p>
          <p className="text-3xl font-extrabold">₹{totalOutstanding.toFixed(2)}</p>
        </div>
        <div className="p-3 bg-white/10 rounded-full">
          <IndianRupee size={32} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Unpaid Invoices */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-sky-950 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 dark:border-sky-950 pb-2">
            <Receipt className="text-amber-500" size={16} />
            Unpaid Invoices
          </h3>

          <div className="space-y-3">
            {unpaidInvoices.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400 dark:text-slate-500 italic">
                All bills are paid! Thank you.
              </div>
            ) : (
              unpaidInvoices.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-3.5 bg-amber-50/20 dark:bg-amber-950/10 border border-amber-100/30 dark:border-amber-950/50 rounded-xl"
                >
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Invoice #{payment.id.slice(0, 8)}</span>
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                      Placed on {new Date(payment.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-extrabold text-slate-800 dark:text-slate-200 block">
                      ₹{payment.amount.toFixed(2)}
                    </span>
                    <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-amber-500 dark:text-amber-400 uppercase">
                      <Clock size={10} /> Payment Due
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Paid Ledger History */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-sky-950 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 dark:border-sky-950 pb-2">
            <CheckCircle className="text-green-500" size={16} />
            Payment Ledger History
          </h3>

          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {paidInvoices.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400 dark:text-slate-500 italic">
                No payment logs recorded yet.
              </div>
            ) : (
              paidInvoices.map((payment) => (
                <div
                  key={payment.id}
                  className="p-3 bg-slate-50/50 dark:bg-slate-800/20 border border-slate-100 dark:border-sky-950/50 rounded-xl space-y-1.5"
                >
                  <div className="flex justify-between items-start">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Invoice #{payment.id.slice(0, 8)}</span>
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                        Paid: {payment.paidAt ? new Date(payment.paidAt).toLocaleDateString() : ""}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-extrabold text-green-600 dark:text-green-400 block">
                        +₹{payment.amount.toFixed(2)}
                      </span>
                      <span className="inline-block px-1.5 py-0.5 rounded bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-400 text-[9px] font-bold uppercase tracking-wider">
                        {payment.method || "Paid"}
                      </span>
                    </div>
                  </div>
                  {payment.note && (
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-tight italic bg-white dark:bg-slate-800/40 p-2 rounded-lg border border-slate-100/50 dark:border-sky-950/20">
                      Note: {payment.note}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
