"use client";

import Link from "next/link";
import { Droplet, ArrowRight, MessageSquare, Mail, ShieldAlert } from "lucide-react";

export default function CustomerPortalDeactivated() {
  return (
    <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-slate-50 to-[#CAF0F8] dark:from-slate-950 dark:to-indigo-950/25 p-4 min-h-screen">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-sky-950 rounded-3xl shadow-xl p-8 space-y-6 text-center relative overflow-hidden">
        
        {/* Subtle decorative blob */}
        <div className="absolute right-0 top-0 -mr-6 -mt-6 w-24 h-24 rounded-full bg-[#00B4D8]/10 blur-xl" />
        
        {/* Droplet Logo */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#0077B6] to-[#00B4D8] flex items-center justify-center text-white shadow-md shadow-[#0077B6]/20">
          <Droplet size={32} fill="white" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">
            Customer Portal Deactivated
          </h1>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border border-amber-200/50 text-[10px] font-bold uppercase tracking-wider">
            <ShieldAlert size={12} /> QR Billing Mode Active
          </div>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm mx-auto">
          We have streamlined our service! Customers no longer need to log in to place orders. 
          Your delivery agent will scan your physical account QR code at your doorstep, record the delivery, 
          and instantly trigger your invoice.
        </p>

        {/* Feature Icons Grid */}
        <div className="grid grid-cols-2 gap-4 py-2">
          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100/50 dark:border-sky-950/20 text-center space-y-2">
            <div className="w-8 h-8 rounded-full bg-green-50 dark:bg-green-950/30 text-green-500 flex items-center justify-center mx-auto">
              <MessageSquare size={16} />
            </div>
            <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200">WhatsApp Invoices</p>
            <p className="text-[9px] text-slate-450 leading-normal">Bills sent straight to your WhatsApp number.</p>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100/50 dark:border-sky-950/20 text-center space-y-2">
            <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-950/30 text-blue-500 flex items-center justify-center mx-auto">
              <Mail size={16} />
            </div>
            <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200">Email Receipts</p>
            <p className="text-[9px] text-slate-450 leading-normal">Full HTML invoice records emailed automatically.</p>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100 dark:border-sky-950 space-y-3">
          <p className="text-[10px] text-slate-400 dark:text-slate-550 leading-relaxed">
            Need to update your address or phone number? Please contact support or your delivery executive.
          </p>
          
          <div className="flex justify-center gap-4 text-xs font-bold text-[#0077B6] dark:text-[#00B4D8] pt-2">
            <Link href="/delivery/login" className="hover:underline flex items-center gap-1">
              Delivery Portal <ArrowRight size={12} />
            </Link>
            <span className="text-slate-350 dark:text-sky-950">•</span>
            <Link href="/admin/login" className="hover:underline flex items-center gap-1">
              Admin Portal <ArrowRight size={12} />
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
