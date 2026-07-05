"use client";

import { useSession } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as zod from "zod";
import { Loader2, User, KeyRound, MapPin, AlertTriangle, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";

const profileSchema = zod.object({
  name: zod.string().min(2, "Name must be at least 2 characters"),
  phone: zod.string().min(10, "Phone number must be at least 10 digits"),
  address: zod.string().min(5, "Please enter a complete address"),
  pincode: zod.string().optional().or(zod.literal("")),
  oldPassword: zod.string().optional().or(zod.literal("")),
  newPassword: zod.string().optional().or(zod.literal("")),
}).refine((data) => {
  if (data.newPassword && !data.oldPassword) {
    return false;
  }
  return true;
}, {
  message: "Current password is required to set a new password",
  path: ["oldPassword"]
});

type ProfileForm = zod.infer<typeof profileSchema>;

export default function UserProfile() {
  const { data: session, update } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();

  const isFirstLogin = searchParams.get("firstLogin") === "true";
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
    resetField,
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      oldPassword: "",
      newPassword: "",
    }
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch("/api/user/profile");
        if (res.ok) {
          const data = await res.json();
          setValue("name", data.name);
          setValue("phone", data.phone);
          setValue("address", data.address);
          setValue("pincode", data.pincode);
        }
      } catch (err) {
        toast.error("Failed to load profile details.");
      } finally {
        setLoadingProfile(false);
      }
    };

    if (session) {
      fetchProfile();
    }
  }, [session, setValue]);

  const onSubmit = async (data: ProfileForm) => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          phone: data.phone,
          address: data.address,
          pincode: data.pincode,
          oldPassword: data.oldPassword || undefined,
          newPassword: data.newPassword || undefined,
        }),
      });

      const result = await res.json();

      if (res.ok) {
        toast.success("Profile updated successfully!");

        // Reset password fields
        resetField("oldPassword");
        resetField("newPassword");

        // Trigger session update programmatically
        await update({
          firstLogin: false,
          name: data.name,
        });

        if (isFirstLogin) {
          toast.success("Password changed. Welcome to your account!");
          router.push("/user/order/new");
        }
      } else {
        toast.error(result.error || "Failed to update profile.");
      }
    } catch (err) {
      toast.error("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingProfile) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="w-8 h-8 text-[#0077B6] animate-spin" />
        <p className="text-sm text-slate-500">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-xl mx-auto pb-10">
      
      {/* First login warning */}
      {isFirstLogin && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-2xl flex gap-3 text-slate-800 dark:text-slate-200 animate-pulse">
          <AlertTriangle className="text-amber-500 flex-shrink-0" />
          <div className="space-y-1">
            <h4 className="text-xs font-bold uppercase tracking-wider">Change Password Required</h4>
            <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              This is your first login. To secure your account, you must change your temporary password before you can proceed to place orders.
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="border-b border-slate-200 dark:border-sky-950 pb-4">
        <h2 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <User className="text-[#0077B6] dark:text-[#00B4D8]" />
          My Profile
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Keep your contact information and delivery address up to date.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        
        {/* Profile Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-sky-950 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 dark:border-sky-950 pb-2">
            <MapPin size={16} className="text-[#0077B6] dark:text-[#00B4D8]" />
            Personal & Address Details
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400" htmlFor="name">Full Name</label>
              <input
                id="name"
                type="text"
                {...register("name")}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-sky-950 bg-slate-50/50 dark:bg-slate-800/50 text-sm focus:border-[#0077B6] outline-none transition"
              />
              {errors.name && (
                <p className="text-red-500 text-[10px] font-semibold">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400" htmlFor="phone">Phone Number</label>
              <input
                id="phone"
                type="text"
                {...register("phone")}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-sky-950 bg-slate-50/50 dark:bg-slate-800/50 text-sm focus:border-[#0077B6] outline-none transition"
              />
              {errors.phone && (
                <p className="text-red-500 text-[10px] font-semibold">{errors.phone.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400" htmlFor="pincode">Pincode / Area Code</label>
              <input
                id="pincode"
                type="text"
                {...register("pincode")}
                className="w-full sm:w-1/2 px-3 py-2 rounded-lg border border-slate-200 dark:border-sky-950 bg-slate-50/50 dark:bg-slate-800/50 text-sm focus:border-[#0077B6] outline-none transition"
              />
              {errors.pincode && (
                <p className="text-red-500 text-[10px] font-semibold">{errors.pincode.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400" htmlFor="address">Default Delivery Address</label>
              <textarea
                id="address"
                rows={3}
                {...register("address")}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-sky-950 bg-slate-50/50 dark:bg-slate-800/50 text-sm focus:border-[#0077B6] outline-none transition"
              />
              {errors.address && (
                <p className="text-red-500 text-[10px] font-semibold">{errors.address.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Change Password Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-sky-950 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 dark:border-sky-950 pb-2">
            <KeyRound size={16} className="text-red-500" />
            Security & Password Change
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400" htmlFor="oldPassword">Current Password</label>
              <input
                id="oldPassword"
                type="password"
                placeholder="Required for password change"
                {...register("oldPassword")}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-sky-950 bg-slate-50/50 dark:bg-slate-800/50 text-sm focus:border-[#0077B6] outline-none transition"
              />
              {errors.oldPassword && (
                <p className="text-red-500 text-[10px] font-semibold">{errors.oldPassword.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400" htmlFor="newPassword">New Password</label>
              <input
                id="newPassword"
                type="password"
                placeholder="At least 6 characters"
                {...register("newPassword")}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-sky-950 bg-slate-50/50 dark:bg-slate-800/50 text-sm focus:border-[#0077B6] outline-none transition"
              />
              {errors.newPassword && (
                <p className="text-red-500 text-[10px] font-semibold">{errors.newPassword.message}</p>
              )}
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="w-full py-3 bg-gradient-to-r from-[#0077B6] to-[#00B4D8] text-white rounded-xl text-sm font-bold shadow-md hover:opacity-90 transition flex items-center justify-center gap-2"
          disabled={submitting}
        >
          {submitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Saving Profile...
            </>
          ) : (
            <>
              <ShieldCheck size={16} />
              Save Modifications
            </>
          )}
        </button>
      </form>
    </div>
  );
}
