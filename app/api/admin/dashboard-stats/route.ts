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

    // Fetch the admin's details (specifically pincode) to scope stats
    const adminUser = await prisma.user.findUnique({
      where: { id: (session.user as any).id },
      select: { pincode: true }
    });

    if (!adminUser) {
      return NextResponse.json({ error: "Admin not found" }, { status: 404 });
    }

    const pincode = adminUser.pincode;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    // 1. Total active orders today in the admin's pincode (Created today, not CANCELLED)
    const activeOrdersToday = await prisma.order.count({
      where: {
        createdAt: { gte: startOfToday },
        status: { in: ["PENDING", "IN_PROGRESS", "DELIVERED"] },
        deliveryPincode: pincode
      }
    });

    // 2. Pending deliveries count in the admin's pincode (PENDING or IN_PROGRESS)
    const pendingDeliveriesCount = await prisma.order.count({
      where: {
        status: { in: ["PENDING", "IN_PROGRESS"] },
        deliveryPincode: pincode
      }
    });

    // 3. Unpaid invoices total in the admin's pincode
    const unpaidPayments = await prisma.payment.findMany({
      where: {
        status: "UNPAID",
        order: {
          status: { not: "CANCELLED" },
          deliveryPincode: pincode
        }
      },
      select: { amount: true }
    });
    const unpaidInvoicesTotal = unpaidPayments.reduce((sum, p) => sum + p.amount, 0);

    // 4. Revenue this month vs last month in the admin's pincode (Payments PAID this month vs last month)
    const paidThisMonth = await prisma.payment.findMany({
      where: {
        status: "PAID",
        paidAt: { gte: startOfThisMonth, lt: startOfNextMonth },
        order: {
          deliveryPincode: pincode
        }
      },
      select: { amount: true }
    });
    const revenueThisMonth = paidThisMonth.reduce((sum, p) => sum + p.amount, 0);

    const paidLastMonth = await prisma.payment.findMany({
      where: {
        status: "PAID",
        paidAt: { gte: startOfLastMonth, lt: startOfThisMonth },
        order: {
          deliveryPincode: pincode
        }
      },
      select: { amount: true }
    });
    const revenueLastMonth = paidLastMonth.reduce((sum, p) => sum + p.amount, 0);

    // 5. Low stock alerts (global inventory)
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
