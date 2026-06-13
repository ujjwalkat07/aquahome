import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Header from "@/components/Header";
import BottomNavbar from "@/components/BottomNavbar";

export default async function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const role = (session.user as any)?.role;
  if (role !== "CUSTOMER") {
    redirect("/login");
  }

  return (
    <div className="flex flex-col min-h-screen pb-16 sm:pb-0">
      {/* Shared Header */}
      <Header title="AquaHome Customer" />

      {/* Main Page Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-6">
        {children}
      </main>

      {/* Mobile Bottom Navigation Tab Bar */}
      <BottomNavbar />
    </div>
  );
}
