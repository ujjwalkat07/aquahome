"use client";

import Link from "next/link";
import { User, Truck, ShieldAlert, Droplet } from "lucide-react";

export default function Home() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-sky-50 to-[#CAF0F8] dark:from-slate-950 dark:via-indigo-950/40 dark:to-slate-950 p-4 md:p-8">
      {/* Visual background decorative element */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 md:w-96 md:h-96 rounded-full bg-[#00B4D8]/10 dark:bg-[#0077B6]/15 blur-3xl -z-10" />

      <div className="max-w-2xl w-full text-center space-y-8">
        {/* App Logo & Header */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-[#0077B6] to-[#00B4D8] flex items-center justify-center text-white shadow-xl shadow-[#0077B6]/20 animate-bounce">
            <Droplet size={36} fill="white" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-[#0077B6] via-[#00B4D8] to-blue-700 bg-clip-text text-transparent dark:from-[#00B4D8] dark:to-cyan-200 sm:text-5xl">
            AquaHome
          </h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 max-w-sm">
            Mineral Water Home & Office Delivery Management System
          </p>
        </div>

        {/* Portals Select Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 mt-8">
          {/* Customer portal */}
          <Link
            href="/login"
            className="group relative flex flex-col items-center p-6 bg-white dark:bg-slate-900/80 dark:hover:bg-slate-900 border border-slate-100 dark:border-sky-950 rounded-2xl shadow-md hover:shadow-xl dark:shadow-slate-950/20 transition-all duration-300 transform hover:-translate-y-1 hover:border-[#00B4D8]/30"
          >
            <div className="p-4 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-[#0077B6] dark:text-[#00B4D8] group-hover:scale-110 transition duration-300">
              <User size={28} />
            </div>
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-200 mt-4">
              Customer
            </h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 text-center mt-2 leading-relaxed">
              Order mineral water bottles, track status, and view invoices.
            </p>
          </Link>

          {/* Delivery Portal */}
          <Link
            href="/delivery/login"
            className="group relative flex flex-col items-center p-6 bg-white dark:bg-slate-900/80 dark:hover:bg-slate-900 border border-slate-100 dark:border-sky-950 rounded-2xl shadow-md hover:shadow-xl dark:shadow-slate-950/20 transition-all duration-300 transform hover:-translate-y-1 hover:border-[#00B4D8]/30"
          >
            <div className="p-4 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 text-[#00B4D8] group-hover:scale-110 transition duration-300">
              <Truck size={28} />
            </div>
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-200 mt-4">
              Delivery Partner
            </h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 text-center mt-2 leading-relaxed">
              Scan order QR codes, view assigned deliveries, and track history.
            </p>
          </Link>

          {/* Admin Portal */}
          <Link
            href="/admin/login"
            className="group relative flex flex-col items-center p-6 bg-white dark:bg-slate-900/80 dark:hover:bg-slate-900 border border-slate-100 dark:border-sky-950 rounded-2xl shadow-md hover:shadow-xl dark:shadow-slate-950/20 transition-all duration-300 transform hover:-translate-y-1 hover:border-[#00B4D8]/30"
          >
            <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition duration-300">
              <ShieldAlert size={28} />
            </div>
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-200 mt-4">
              Administrator
            </h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 text-center mt-2 leading-relaxed">
              Manage customers, assign orders, check stock levels, and record payments.
            </p>
          </Link>
        </div>

        {/* Footer */}
        <p className="text-[11px] text-slate-400 dark:text-slate-500">
          Powered by AquaHome. Built for fast, offline-resilient operations.
        </p>
      </div>
    </main>
  );
}
