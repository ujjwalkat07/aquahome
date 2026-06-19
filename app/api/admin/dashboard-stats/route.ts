import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    // 1. Total active orders today (Created today, not CANCELLED)
    const activeOrdersToday = await prisma.order.count({
      where: {
        createdAt: { gte: startOfToday },
        status: { in: ["PENDING", "IN_PROGRESS", "DELIVERED"] }
      }
    });

    // 2. Pending deliveries count (PENDING or IN_PROGRESS)
    const pendingDeliveriesCount = await prisma.order.count({
      where: {
        status: { in: ["PENDING", "IN_PROGRESS"] }
      }
    });

    // 3. Unpaid invoices total
    const unpaidPayments = await prisma.payment.findMany({
      where: {
        status: "UNPAID",
        order: {
          status: { not: "CANCELLED" }
        }
      },
      select: { amount: true }
    });
    const unpaidInvoicesTotal = unpaidPayments.reduce((sum, p) => sum + p.amount, 0);

    // 4. Revenue this month vs last month (Payments PAID this month vs last month)
    const paidThisMonth = await prisma.payment.findMany({
      where: {
        status: "PAID",
        paidAt: { gte: startOfThisMonth, lt: startOfNextMonth }
      },
      select: { amount: true }
    });
    const revenueThisMonth = paidThisMonth.reduce((sum, p) => sum + p.amount, 0);

    const paidLastMonth = await prisma.payment.findMany({
      where: {
        status: "PAID",
        paidAt: { gte: startOfLastMonth, lt: startOfThisMonth }
      },
      select: { amount: true }
    });
    const revenueLastMonth = paidLastMonth.reduce((sum, p) => sum + p.amount, 0);

    // 5. Low stock alerts
    const allAvailableProducts = await prisma.product.findMany({
      where: { isAvailable: true }
    });
    const lowStockProducts = allAvailableProducts.filter(
      (p) => p.stock <= p.lowStockThreshold
    );

    return NextResponse.json({
      activeOrdersToday,
      pendingDeliveriesCount,
      unpaidInvoicesTotal,
      revenueThisMonth,
      revenueLastMonth,
      lowStockProducts,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
