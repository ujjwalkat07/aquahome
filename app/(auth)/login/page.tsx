"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as zod from "zod";
import Link from "next/link";
import { Droplet, Lock, Mail } from "lucide-react";
import toast from "react-hot-toast";

const loginSchema = zod.object({
  email: zod.string().email("Please enter a valid email address"),
  password: zod.string().min(6, "Password must be at least 6 characters"),
});

type LoginForm = zod.infer<typeof loginSchema>;

export default function CustomerLogin() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    try {
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        toast.error(result.error || "Failed to sign in. Please verify your credentials.");
      } else {
        toast.success("Welcome back to AquaHome!");
        
        // Fetch session to determine redirection
        const sessionRes = await fetch("/api/auth/session");
        const session = await sessionRes.json();
        
        const role = session?.user?.role;
        const isFirstLogin = session?.user?.firstLogin;

        if (role !== "CUSTOMER") {
          // Sign out unauthorized role from this dashboard
          await signIn("credentials", { redirect: false });
          toast.error("Unauthorized. Please use the appropriate login portal.");
          return;
        }

        if (isFirstLogin) {
          router.push("/user/profile?firstLogin=true");
        } else {
          router.push("/user/order/new");
        }
      }
    } catch (err) {
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-slate-50 to-[#CAF0F8] dark:from-slate-950 dark:to-indigo-950/25 p-4">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-sky-950 rounded-2xl shadow-xl p-6 md:p-8 space-y-6">
        
        {/* Portal Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <Link href="/" className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#0077B6] to-[#00B4D8] flex items-center justify-center text-white shadow-md">
            <Droplet size={24} fill="white" />
          </Link>
          <h1 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 mt-2">
            Customer Login
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Sign in to place orders and manage your water delivery subscription.
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block" htmlFor="email">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                id="email"
                type="email"
                placeholder="customer@email.com"
                {...register("email")}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-sky-950 bg-slate-50/50 dark:bg-slate-800/50 text-sm focus:border-[#0077B6] dark:focus:border-[#00B4D8] focus:ring-1 focus:ring-[#0077B6] outline-none transition"
                disabled={loading}
              />
            </div>
            {errors.email && (
              <p className="text-red-500 text-[11px] font-medium mt-0.5">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block" htmlFor="password">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                {...register("password")}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-sky-950 bg-slate-50/50 dark:bg-slate-800/50 text-sm focus:border-[#0077B6] dark:focus:border-[#00B4D8] focus:ring-1 focus:ring-[#0077B6] outline-none transition"
                disabled={loading}
              />
            </div>
            {errors.password && (
              <p className="text-red-500 text-[11px] font-medium mt-0.5">{errors.password.message}</p>
            )}
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-gradient-to-r from-[#0077B6] to-[#00B4D8] hover:opacity-90 text-white rounded-xl text-sm font-semibold transition shadow-md shadow-[#0077B6]/10 flex items-center justify-center"
            disabled={loading}
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        <div className="text-center pt-2 border-t border-slate-100 dark:border-sky-950">
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Account not registered? Accounts are generated by administrators. Please contact support.
          </p>
          <div className="mt-4 flex justify-center gap-4 text-xs font-bold text-[#0077B6] dark:text-[#00B4D8]">
            <Link href="/delivery/login" className="hover:underline">Delivery Portal</Link>
            <span className="text-slate-300 dark:text-sky-900">•</span>
            <Link href="/admin/login" className="hover:underline">Admin Portal</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
