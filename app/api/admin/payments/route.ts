import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { notifyUser } from "@/lib/notifications";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as any).role;
    const currentUserId = (session.user as any).id;

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const status = searchParams.get("status"); // PAID or UNPAID

    let whereClause: any = {};

    if (role === "CUSTOMER") {
      whereClause.userId = currentUserId;
    } else if (role === "ADMIN") {
      // Fetch the admin's details (specifically pincode) to scope payments
      const adminUser = await prisma.user.findUnique({
        where: { id: currentUserId },
        select: { pincode: true }
      });
      if (!adminUser) {
        return NextResponse.json({ error: "Admin not found" }, { status: 404 });
      }

      whereClause.order = {
        deliveryPincode: adminUser.pincode
      };

      if (userId) {
        whereClause.userId = userId;
      }
    } else {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    if (status) {
      whereClause.status = status;
    }

    const payments = await prisma.payment.findMany({
      where: whereClause,
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        order: { select: { status: true, deliveryTimeSlot: true, createdAt: true, isScheduled: true, scheduleFrequency: true } }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(payments);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { paymentId, userId, method, note } = body;

    if (!method) {
      return NextResponse.json({ error: "Payment method is required." }, { status: 400 });
    }

    const currentUserId = (session.user as any).id;
    const adminUser = await prisma.user.findUnique({
      where: { id: currentUserId },
      select: { pincode: true }
    });
    if (!adminUser) {
      return NextResponse.json({ error: "Admin not found" }, { status: 404 });
    }

    if (userId) {
      // Process collection of all unpaid payments for a customer
      const customer = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true, phone: true, pincode: true }
      });
      if (!customer) {
        return NextResponse.json({ error: "Customer not found." }, { status: 404 });
      }

      if (customer.pincode !== adminUser.pincode) {
        return NextResponse.json({ error: "Access denied: Customer belongs to a different pincode region." }, { status: 403 });
      }

      const unpaidPayments = await prisma.payment.findMany({
        where: {
          userId: userId,
          status: "UNPAID",
          order: {
            deliveryPincode: adminUser.pincode
          }
        }
      });

      if (unpaidPayments.length === 0) {
        return NextResponse.json({ error: "No outstanding payments found for this customer." }, { status: 400 });
      }

      const totalAmount = unpaidPayments.reduce((sum, p) => sum + p.amount, 0);
      const paymentIds = unpaidPayments.map((p) => p.id);

      await prisma.payment.updateMany({
        where: {
          id: { in: paymentIds }
        },
        data: {
          status: "PAID",
          paidAt: new Date(),
          method,
          note: note || `Consolidated payment of ${unpaidPayments.length} invoices recorded by Admin`
        }
      });

      await notifyUser({
        userId: customer.id,
        title: "Consolidated Payment Received",
        message: `We have received a consolidated payment of ₹${totalAmount.toFixed(2)} for ${unpaidPayments.length} outstanding invoices via ${method}. Thank you for your business!`,
        email: customer.email,
        phone: customer.phone
      });

      return NextResponse.json({ success: true, count: unpaidPayments.length, totalAmount });
    } else if (paymentId) {
      // Process single payment collection
      const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } },
          order: { select: { deliveryPincode: true } }
        }
      });

      if (!payment) {
        return NextResponse.json({ error: "Payment record not found." }, { status: 404 });
      }

      if (payment.order.deliveryPincode !== adminUser.pincode) {
        return NextResponse.json({ error: "Access denied: Payment belongs to a different pincode region." }, { status: 403 });
      }

      if (payment.status === "PAID") {
        return NextResponse.json({ error: "Payment has already been marked as PAID." }, { status: 400 });
      }

      const updatedPayment = await prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: "PAID",
          paidAt: new Date(),
          method,
          note: note || `Offline payment recorded by Admin`
        }
      });

      await notifyUser({
        userId: payment.userId,
        title: "Payment Received",
        message: `We have received your payment of ₹${payment.amount.toFixed(2)} via ${method}. Thank you for your business!`,
        email: payment.user.email,
        phone: payment.user.phone
      });

      return NextResponse.json(updatedPayment);
    } else {
      return NextResponse.json({ error: "Either Payment ID or User ID is required." }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
