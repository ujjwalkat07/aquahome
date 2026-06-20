import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Business admin counts
    const totalAdmins = await prisma.user.count({
      where: { role: "ADMIN" }
    });

    const activeAdmins = await prisma.user.count({
      where: { role: "ADMIN", isActive: true }
    });

    // 2. Other roles
    const totalCustomers = await prisma.user.count({
      where: { role: "CUSTOMER" }
    });

    const totalDeliveryPartners = await prisma.user.count({
      where: { role: "DELIVERY" }
    });

    // 3. Overall Orders count
    const totalOrders = await prisma.order.count({
      where: {
        status: { not: "CANCELLED" }
      }
    });

    // 4. Platform revenue (PAID payments total)
    const paidPayments = await prisma.payment.findMany({
      where: { status: "PAID" },
      select: { amount: true }
    });
    const totalRevenue = paidPayments.reduce((sum, p) => sum + p.amount, 0);

    return NextResponse.json({
      totalAdmins,
      activeAdmins,
      totalCustomers,
      totalDeliveryPartners,
      totalOrders,
      totalRevenue
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
