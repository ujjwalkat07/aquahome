"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  TrendingUp,
  ShoppingBag,
  Clock,
  IndianRupee,
  AlertTriangle,
  ArrowUpRight,
  ChevronRight,
  Package,
  Users,
  CreditCard,
  Truck
} from "lucide-react";
import toast from "react-hot-toast";

interface LowStockProduct {
  id: string;
  name: string;
  size: string;
  stock: number;
  lowStockThreshold: number;
}

interface Stats {
  activeOrdersToday: number;
  pendingDeliveriesCount: number;
  unpaidInvoicesTotal: number;
  revenueThisMonth: number;
  revenueLastMonth: number;
  lowStockProducts: LowStockProduct[];
}

export default function AdminDashboard() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch("/api/admin/dashboard-stats");
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        } else {
          toast.error("Failed to load dashboard metrics.");
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (session) {
      fetchStats();
    }
  }, [session]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-lg w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-64 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
        </div>
      </div>
    );
  }

  const modules = [
    {
      name: "Users",
      description: "Manage customer profiles, details, and access.",
      href: "/admin/users",
      icon: Users,
      color: "text-indigo-600 dark:text-indigo-400",
      bgColor: "bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-100/50 dark:border-indigo-950/50",
    },
    {
      name: "Orders",
      description: "Track sales, dispatch, and order fulfillment status.",
      href: "/admin/orders",
      icon: ShoppingBag,
      color: "text-sky-600 dark:text-sky-400",
      bgColor: "bg-sky-50/50 dark:bg-sky-950/20 border-sky-100/50 dark:border-sky-950/50",
    },
    {
      name: "Delivery Partners",
      description: "Manage driver accounts and route assignments.",
      href: "/admin/delivery-partners",
      icon: Truck,
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-50/50 dark:bg-amber-950/20 border-amber-100/50 dark:border-amber-950/50",
    },
    {
      name: "Payments",
      description: "Audit invoices, payment collections, and dues.",
      href: "/admin/payments",
      icon: CreditCard,
      color: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-100/50 dark:border-emerald-950/50",
    },
    {
      name: "Stock Manager",
      description: "Control products, thresholds, and replenishment.",
      href: "/admin/products",
      icon: Package,
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-50/50 dark:bg-purple-950/20 border-purple-100/50 dark:border-purple-950/50",
    },
  ];

  const revenueChange = stats
    ? stats.revenueLastMonth > 0
      ? ((stats.revenueThisMonth - stats.revenueLastMonth) / stats.revenueLastMonth) * 100
      : 0
    : 0;

  return (
    <div className="space-y-6">
      
      {/* Greeting Header */}
      <div>
        <h2 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">
          Welcome back, {session?.user?.name || "Admin"}
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Here is a summary of AquaHome&apos;s operations and sales metrics.
        </p>
      </div>

      {/* Overview Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Today's Active Orders */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-sky-950 rounded-2xl p-5 shadow-sm flex items-start justify-between">
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Active Orders Today</span>
            <span className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 block">{stats?.activeOrdersToday || 0}</span>
            <Link href="/admin/orders?status=PENDING" className="text-[11px] font-bold text-[#0077B6] dark:text-[#00B4D8] hover:underline inline-flex items-center gap-0.5">
              View details <ChevronRight size={12} />
            </Link>
          </div>
          <div className="p-3 bg-sky-50 dark:bg-sky-950/40 text-[#0077B6] dark:text-[#00B4D8] rounded-xl">
            <ShoppingBag size={20} />
          </div>
        </div>

        {/* Revenue This Month */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-sky-950 rounded-2xl p-5 shadow-sm flex items-start justify-between">
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Revenue This Month</span>
            <span className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 block">₹{stats?.revenueThisMonth.toFixed(2) || "0.00"}</span>
            <span className={`text-[10px] font-bold inline-flex items-center gap-0.5 ${revenueChange >= 0 ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>
              <TrendingUp size={12} /> {revenueChange >= 0 ? "+" : ""}{revenueChange.toFixed(0)}% vs last month
            </span>
          </div>
          <div className="p-3 bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400 rounded-xl">
            <IndianRupee size={20} />
          </div>
        </div>

        {/* Pending Deliveries */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-sky-950 rounded-2xl p-5 shadow-sm flex items-start justify-between">
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Pending Deliveries</span>
            <span className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 block">{stats?.pendingDeliveriesCount || 0}</span>
            <Link href="/admin/orders" className="text-[11px] font-bold text-[#0077B6] dark:text-[#00B4D8] hover:underline inline-flex items-center gap-0.5">
              Dispatch orders <ChevronRight size={12} />
            </Link>
          </div>
          <div className="p-3 bg-amber-50 dark:bg-amber-950/20 text-amber-500 rounded-xl">
            <Clock size={20} />
          </div>
        </div>

        {/* Unpaid Invoices Total */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-sky-950 rounded-2xl p-5 shadow-sm flex items-start justify-between">
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Unpaid Invoices Total</span>
            <span className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 block">₹{stats?.unpaidInvoicesTotal.toFixed(2) || "0.00"}</span>
            <Link href="/admin/payments" className="text-[11px] font-bold text-[#0077B6] dark:text-[#00B4D8] hover:underline inline-flex items-center gap-0.5">
              Record collection <ChevronRight size={12} />
            </Link>
          </div>
          <div className="p-3 bg-red-50 dark:bg-red-950/20 text-red-500 rounded-xl">
            <CreditCard size={20} />
          </div>
        </div>

      </div>

      {/* Quick Access Modules */}
      <div className="space-y-3">
        <h3 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
          Quick Access Modules
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {modules.map((m) => {
            const Icon = m.icon;
            return (
              <Link
                key={m.name}
                href={m.href}
                className="group relative bg-white dark:bg-slate-900 border border-slate-100 dark:border-sky-950 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between min-h-[140px]"
              >
                <div className="space-y-3">
                  <div className={`p-2.5 w-fit rounded-xl border ${m.bgColor} transition-transform duration-300 group-hover:scale-110`}>
                    <Icon size={20} className={m.color} />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 group-hover:text-[#0077B6] dark:group-hover:text-[#00B4D8] transition-colors">
                      {m.name}
                    </h4>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-normal">
                      {m.description}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between text-[10px] font-bold text-[#0077B6] dark:text-[#00B4D8]">
                  <span>Manage</span>
                  <ArrowUpRight size={14} className="transform transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Low Stock Alerts */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-sky-950 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 dark:border-sky-950 pb-2">
            <AlertTriangle className="text-amber-500" size={18} />
            Low Stock Alerts
          </h3>

          <div className="space-y-3">
            {!stats || stats.lowStockProducts.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400 dark:text-slate-500 italic">
                Inventory levels are healthy. No items below threshold.
              </div>
            ) : (
              stats.lowStockProducts.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-3.5 bg-amber-50/20 dark:bg-amber-950/10 border border-amber-100/30 dark:border-amber-950/50 rounded-xl"
                >
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {p.name} ({p.size})
                    </h4>
                    <div className="w-40 sm:w-60 bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-amber-500 h-full rounded-full"
                        style={{ width: `${(p.stock / p.lowStockThreshold) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-extrabold text-amber-600 dark:text-amber-400 block">
                      {p.stock} bottles left
                    </span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                      Threshold: {p.lowStockThreshold}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Management Shortcuts */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-sky-950 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 dark:border-sky-950 pb-2">
            <Package className="text-[#0077B6] dark:text-[#00B4D8]" size={18} />
            Quick Shortcuts
          </h3>

          <div className="flex flex-col gap-2.5">
            <Link
              href="/admin/users"
              className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition text-xs font-bold text-slate-700 dark:text-slate-300"
            >
              <span className="flex items-center gap-2">
                <Users size={16} className="text-slate-400" /> Register Customer
              </span>
              <ArrowUpRight size={16} className="text-slate-400" />
            </Link>
            <Link
              href="/admin/orders"
              className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition text-xs font-bold text-slate-700 dark:text-slate-300"
            >
              <span className="flex items-center gap-2">
                <ShoppingBag size={16} className="text-slate-400" /> Manage Active Orders
              </span>
              <ArrowUpRight size={16} className="text-slate-400" />
            </Link>
            <Link
              href="/admin/products"
              className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition text-xs font-bold text-slate-700 dark:text-slate-300"
            >
              <span className="flex items-center gap-2">
                <Package size={16} className="text-slate-400" /> Adjust Stock Count
              </span>
              <ArrowUpRight size={16} className="text-slate-400" />
            </Link>
          </div>
        </div>

      </div>

    </div>
  );
}
