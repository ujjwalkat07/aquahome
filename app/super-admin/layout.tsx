import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Header from "@/components/Header";

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/admin/login");
  }

  const role = (session.user as any)?.role;
  if (role !== "SUPER_ADMIN") {
    redirect("/admin/login");
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Top Header */}
      <Header title="AquaHome Super Admin Console" />

      {/* Main Dashboard Content */}
      <main className="flex-1 p-4 md:p-6 overflow-y-auto max-w-6xl w-full mx-auto pb-10">
        {children}
      </main>
    </div>
  );
}
