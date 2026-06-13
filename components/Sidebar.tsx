"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Users,
  ShoppingBag,
  Truck,
  CreditCard,
  Package,
  ChevronLeft,
  ChevronRight,
  Menu
} from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const menuItems = [
    { name: "Overview", href: "/admin", icon: LayoutDashboard },
    { name: "Users", href: "/admin/users", icon: Users },
    { name: "Orders", href: "/admin/orders", icon: ShoppingBag },
    { name: "Delivery Partners", href: "/admin/delivery-partners", icon: Truck },
    { name: "Payments", href: "/admin/payments", icon: CreditCard },
    { name: "Stock Manager", href: "/admin/products", icon: Package },
  ];

  return (
    <aside
      className={`hidden md:flex flex-col border-r border-slate-200 dark:border-sky-900 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-all duration-300 shadow-sm ${
        isCollapsed ? "w-20" : "w-64"
      } h-screen sticky top-0`}
    >
      {/* Brand & Toggle Header */}
      <div className="p-4 flex items-center justify-between border-b border-slate-100 dark:border-sky-950 h-16">
        {!isCollapsed && (
          <span className="font-extrabold text-[#0077B6] dark:text-[#00B4D8] text-lg tracking-wide">
            AQUAHOME ADMIN
          </span>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 mx-auto"
          aria-label={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      {/* Navigation list */}
      <nav className="flex-1 p-3 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition ${
                isActive
                  ? "bg-[#0077B6]/10 text-[#0077B6] dark:bg-[#00B4D8]/15 dark:text-[#00B4D8]"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40 hover:text-slate-900 dark:hover:text-slate-100"
              }`}
              title={isCollapsed ? item.name : undefined}
            >
              <Icon size={20} className="flex-shrink-0" />
              {!isCollapsed && <span className="truncate">{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Collapsed Footer */}
      {!isCollapsed && (
        <div className="p-4 border-t border-slate-100 dark:border-sky-950 text-center text-[10px] text-slate-400">
          AquaHome Admin Panel v1.0
        </div>
      )}
    </aside>
  );
}
