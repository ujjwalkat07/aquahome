"use client";

import { useSession, signOut } from "next-auth/react";
import { useEffect, useState, useRef } from "react";
import { Bell, Sun, Moon, LogOut, User as UserIcon } from "lucide-react";
import { useTheme } from "@/components/providers";
import Link from "next/link";
import toast from "react-hot-toast";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export default function Header({ title }: { title: string }) {
  const { data: session } = useSession();
  const { theme, toggleTheme } = useTheme();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.ok ? await res.json() : [];
        setNotifications(data);
      }
    } catch (error) {
      console.error("Failed to load notifications", error);
    }
  };

  useEffect(() => {
    if (session) {
      fetchNotifications();
      // Poll notifications every 45 seconds for a dynamic feel
      const interval = setInterval(fetchNotifications, 45000);
      return () => clearInterval(interval);
    }
  }, [session]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNotifDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const markAllAsRead = async () => {
    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        toast.success("All notifications marked as read");
      }
    } catch (error) {
      toast.error("Failed to update notifications");
    }
  };

  const markSingleAsRead = async (id: string) => {
    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: id }),
      });
      if (res.ok) {
        setNotifications(prev =>
          prev.map(n => (n.id === id ? { ...n, isRead: true } : n))
        );
      }
    } catch (error) {
      console.error(error);
    }
  };

  const getProfileLink = () => {
    const role = (session?.user as any)?.role;
    if (role === "ADMIN") return "/admin";
    if (role === "DELIVERY") return "/delivery/orders";
    return "/user/profile";
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-sky-800 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md px-4 py-3 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#0077B6] to-[#00B4D8] flex items-center justify-center text-white font-bold text-sm shadow-md">
          A
        </div>
        <h1 className="text-lg font-bold text-[#0077B6] dark:text-[#00B4D8] tracking-tight md:text-xl">
          {title}
        </h1>
      </div>

      <div className="flex items-center gap-3">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800 transition"
          aria-label="Toggle Theme"
        >
          {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        {/* Notifications Bell */}
        {session && (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowNotifDropdown(!showNotifDropdown)}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800 transition relative"
              aria-label="Notifications"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center ring-2 ring-white dark:ring-slate-900 animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifDropdown && (
              <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-800 border border-slate-200 dark:border-sky-800 rounded-xl shadow-xl z-50 overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-sky-800 flex justify-between items-center">
                  <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-100">Notifications</h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-xs text-[#0077B6] hover:text-[#00B4D8] dark:text-[#00B4D8] dark:hover:text-sky-300 font-medium"
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700">
                  {notifications.length === 0 ? (
                    <div className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                      No notifications yet
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => !n.isRead && markSingleAsRead(n.id)}
                        className={`p-3 text-left transition cursor-pointer ${
                          n.isRead
                            ? "bg-transparent hover:bg-slate-50 dark:hover:bg-slate-700/30"
                            : "bg-sky-50/50 dark:bg-sky-950/20 hover:bg-sky-50 dark:hover:bg-sky-950/30"
                        }`}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <p className={`text-xs font-semibold ${n.isRead ? "text-slate-700 dark:text-slate-300" : "text-slate-900 dark:text-slate-100"}`}>
                            {n.title}
                          </p>
                          {!n.isRead && (
                            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5" />
                          )}
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-tight">
                          {n.message}
                        </p>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 block mt-1">
                          {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* User Info & Logout */}
        {session && (
          <div className="flex items-center gap-2 border-l border-slate-200 dark:border-sky-800 pl-3">
            <Link
              href={getProfileLink()}
              className="hidden sm:flex flex-col text-right hover:opacity-80"
            >
              <span className="text-xs font-semibold truncate max-w-[100px] dark:text-slate-200">
                {session.user?.name}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 capitalize">
                {(session.user as any)?.role?.toLowerCase()}
              </span>
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition"
              aria-label="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
