"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { Loader2, QrCode, CreditCard, IndianRupee, MapPin, Phone, Mail, FileText, CheckCircle, Clock } from "lucide-react";
import QRCode from "qrcode";
import toast from "react-hot-toast";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  pincode: string | null;
}

interface Payment {
  id: string;
  amount: number;
  status: "PAID" | "UNPAID";
  createdAt: string;
}

// Canvas QR Code Component for Customer Account ID
function AccountQRCode({ text }: { text: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current && text) {
      QRCode.toCanvas(
        canvasRef.current,
        text,
        {
          width: 220,
          margin: 2,
          color: {
            dark: "#003049", // dark blue matching the theme
            light: "#FFFFFF"
          }
        },
        (error) => {
          if (error) console.error("QR Code Generation Error:", error);
        }
      );
    }
  }, [text]);

  return (
    <div className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-white rounded-2xl shadow-md border border-slate-100 dark:border-sky-950/20">
      <canvas ref={canvasRef} className="rounded-lg" />
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest select-none">
        Show to Delivery Agent
      </span>
    </div>
  );
}

export default function CustomerDashboard() {
  const { data: session } = useSession();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // 1. Fetch Profile
        const profileRes = await fetch("/api/user/profile");
        let profileData = null;
        if (profileRes.ok) {
          profileData = await profileRes.json();
          setProfile(profileData);
        }

        // 2. Fetch Payments / Billing ledger
        const paymentsRes = await fetch("/api/admin/payments");
        if (paymentsRes.ok) {
          const paymentsData = await paymentsRes.json();
          setPayments(paymentsData);
        }
      } catch (err) {
        console.error("Dashboard load error:", err);
        toast.error("Failed to load dashboard data.");
      } finally {
        setLoading(false);
      }
    };

    if (session) {
      fetchDashboardData();
    }
  }, [session]);

  if (loading || !profile) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="w-8 h-8 text-[#0077B6] animate-spin" />
        <p className="text-sm text-slate-500">Loading Customer Dashboard...</p>
      </div>
    );
  }

  const outstandingPayments = payments.filter((p) => p.status === "UNPAID");
  const totalOutstanding = outstandingPayments.reduce((sum, p) => sum + p.amount, 0);
  const totalDeliveries = payments.length;
  const qrCodeValue = `AQUAHOME-CUSTOMER:${profile.id}`;
  const accountNum = `AQ-2026-${profile.id.slice(0, 6).toUpperCase()}`;

  return (
    <div className="space-y-6 pb-12">
      
      {/* Welcome Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-tr from-[#0077B6] to-[#00B4D8] p-6 text-white shadow-lg">
        <div className="relative z-10 space-y-1">
          <p className="text-xs font-bold text-sky-100 uppercase tracking-wider">Welcome Back,</p>
          <h2 className="text-2xl font-extrabold tracking-tight">{profile.name}</h2>
          <p className="text-xs text-sky-100/90 max-w-sm leading-relaxed pt-1">
            Show your QR Code below to the delivery agent to confirm drop-offs and generate instant invoices.
          </p>
        </div>
        {/* Abstract background blobs */}
        <div className="absolute right-0 top-0 -mr-6 -mt-6 w-32 h-32 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute left-1/2 bottom-0 w-24 h-24 rounded-full bg-sky-200/10 blur-xl" />
      </div>

      {/* Main Grid: QR scanner and Profile details */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Left Side: QR Code (takes 5 cols on md+) */}
        <div className="md:col-span-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-sky-950 rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center text-center space-y-4">
          <div className="space-y-1">
            <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center justify-center gap-1.5">
              <QrCode size={18} className="text-[#0077B6]" />
              Account QR Code
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Scannable customer barcode
            </p>
          </div>

          <AccountQRCode text={qrCodeValue} />

          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Account Number</span>
            <p className="text-sm font-mono font-bold text-slate-850 dark:text-[#00B4D8]">{accountNum}</p>
          </div>
        </div>

        {/* Right Side: Quick Stats & Details (takes 7 cols on md+) */}
        <div className="md:col-span-7 space-y-6">
          
          {/* Stats Cards */}
          <div className="grid grid-cols-2 gap-4">
            {/* Outstanding Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-sky-950 rounded-2xl p-4 shadow-sm flex flex-col justify-between space-y-2">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <CreditCard size={12} className="text-amber-500" /> Outstanding
              </span>
              <div>
                <p className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">
                  ₹{totalOutstanding.toFixed(2)}
                </p>
                <p className="text-[10px] text-slate-450 mt-0.5">
                  {outstandingPayments.length} unpaid invoices
                </p>
              </div>
            </div>

            {/* Total Deliveries */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-sky-950 rounded-2xl p-4 shadow-sm flex flex-col justify-between space-y-2">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <FileText size={12} className="text-blue-500" /> Total Invoices
              </span>
              <div>
                <p className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">
                  {totalDeliveries}
                </p>
                <p className="text-[10px] text-slate-450 mt-0.5 font-medium">
                  Deliveries received
                </p>
              </div>
            </div>
          </div>

          {/* Customer Profile Details Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-sky-950 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-450 uppercase tracking-wider border-b border-slate-100 dark:border-sky-950 pb-2">
              Profile details
            </h3>

            <div className="space-y-3.5 text-xs text-slate-650 dark:text-slate-400">
              <div className="flex items-center gap-3">
                <Phone size={14} className="text-slate-400 flex-shrink-0" />
                <div>
                  <p className="text-[10px] text-slate-450 font-medium">Phone Number</p>
                  <p className="font-semibold text-slate-850 dark:text-slate-200">{profile.phone}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Mail size={14} className="text-slate-400 flex-shrink-0" />
                <div>
                  <p className="text-[10px] text-slate-450 font-medium">Email Address</p>
                  <p className="font-semibold text-slate-850 dark:text-slate-200">{profile.email}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin size={14} className="text-slate-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] text-slate-450 font-medium">Default Delivery Address</p>
                  <p className="font-semibold text-slate-850 dark:text-slate-200">
                    {profile.address} {profile.pincode && `(Pincode: ${profile.pincode})`}
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Recent Bills / Order History */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-sky-950 rounded-2xl p-5 shadow-sm space-y-4">
        <h3 className="text-xs font-bold text-slate-450 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 dark:border-sky-950 pb-2">
          <FileText size={14} className="text-[#0077B6]" />
          Recent Invoices
        </h3>

        {payments.length === 0 ? (
          <p className="text-xs text-slate-400 dark:text-slate-500 italic text-center py-6">
            No bills generated yet. Your delivery boy will scan your QR code to record deliveries.
          </p>
        ) : (
          <div className="space-y-3">
            {payments.slice(0, 5).map((payment) => (
              <div
                key={payment.id}
                className="flex items-center justify-between p-3 bg-slate-50/50 dark:bg-slate-800/20 border border-slate-100 dark:border-sky-950/30 rounded-xl"
              >
                <div className="space-y-0.5">
                  <span className="text-[10px] font-mono font-bold text-slate-400 block">#INV-{payment.id.slice(0, 8).toUpperCase()}</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    {new Date(payment.createdAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 block">
                      ₹{payment.amount.toFixed(2)}
                    </span>
                    <span className="inline-flex items-center gap-0.5 text-[9px] font-bold uppercase mt-0.5">
                      {payment.status === "PAID" ? (
                        <span className="text-green-600 dark:text-green-400 flex items-center gap-0.5">
                          <CheckCircle size={8} /> Paid
                        </span>
                      ) : (
                        <span className="text-amber-500 flex items-center gap-0.5">
                          <Clock size={8} /> Due
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
