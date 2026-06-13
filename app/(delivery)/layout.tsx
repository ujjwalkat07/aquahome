import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Header from "@/components/Header";
import BottomNavbar from "@/components/BottomNavbar";

export default async function DeliveryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/delivery/login");
  }

  const role = (session.user as any)?.role;
  if (role !== "DELIVERY") {
    redirect("/delivery/login");
  }

  return (
    <div className="flex flex-col min-h-screen pb-16 sm:pb-0">
      {/* Dynamic Header */}
      <Header title="AquaHome Logistics" />

      {/* Main View Area */}
      <main className="flex-1 max-w-lg w-full mx-auto p-4 md:p-6">
        {children}
      </main>

      {/* Bottom Mobile Navbar */}
      <BottomNavbar />
    </div>
  );
}
