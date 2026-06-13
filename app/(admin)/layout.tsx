import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/admin/login");
  }

  const role = (session.user as any)?.role;
  if (role !== "ADMIN") {
    redirect("/admin/login");
  }

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Left Sidebar Navigation */}
      <Sidebar />

      {/* Right Content Area */}
      <div className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
        {/* Top Header */}
        <Header title="AquaHome Admin Console" />

        {/* Dashboard Content */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto max-w-6xl w-full mx-auto pb-10">
          {children}
        </main>
      </div>
    </div>
  );
}
