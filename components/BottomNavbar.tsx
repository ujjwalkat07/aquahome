"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PlusCircle, ShoppingBag, CreditCard, User, Truck, QrCode, History } from "lucide-react";

export default function BottomNavbar() {
  const { data: session } = useSession();
  const pathname = usePathname();

  if (!session) return null;

  const role = (session.user as any)?.role;

  const customerTabs = [
    { name: "Dashboard", href: "/user", icon: QrCode },
    { name: "My Bills", href: "/user/orders", icon: ShoppingBag },
    { name: "Payments", href: "/user/payments", icon: CreditCard },
    { name: "Profile", href: "/user/profile", icon: User },
  ];

  const deliveryTabs = [
    { name: "Deliveries", href: "/delivery/orders", icon: Truck },
    { name: "Scan QR", href: "/delivery/scan", icon: QrCode },
    { name: "History", href: "/delivery/history", icon: History },
  ];

  const tabs = role === "DELIVERY" ? deliveryTabs : role === "CUSTOMER" ? customerTabs : [];

  if (tabs.length === 0) return null;

  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-sky-900 shadow-lg px-2 pb-safe-bottom">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = pathname === tab.href || pathname.startsWith(tab.href + "/");

          return (
            <Link
              key={tab.name}
              href={tab.href}
              className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-center transition ${
                isActive
                  ? "text-[#0077B6] dark:text-[#00B4D8]"
                  : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
              }`}
            >
              <Icon size={20} className={`${isActive ? "scale-110" : ""} transition-transform duration-200`} />
              <span className="text-[10px] font-medium mt-1 tracking-tight truncate w-full px-1">
                {tab.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
