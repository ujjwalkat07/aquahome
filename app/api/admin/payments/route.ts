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
        user: { select: { name: true, email: true, phone: true } },
        order: { select: { status: true, deliveryTimeSlot: true, createdAt: true } }
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
    const { paymentId, method, note } = body;

    if (!paymentId || !method) {
      return NextResponse.json({ error: "Payment ID and payment method are required." }, { status: 400 });
    }

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

    // Verify the payment is in the admin's pincode region
    const currentUserId = (session.user as any).id;
    const adminUser = await prisma.user.findUnique({
      where: { id: currentUserId },
      select: { pincode: true }
    });
    if (!adminUser) {
      return NextResponse.json({ error: "Admin not found" }, { status: 404 });
    }

    if (payment.order.deliveryPincode !== adminUser.pincode) {
      return NextResponse.json({ error: "Access denied: Payment belongs to a different pincode region." }, { status: 403 });
    }

    if (payment.status === "PAID") {
      return NextResponse.json({ error: "Payment has already been marked as PAID." }, { status: 400 });
    }

    // Update payment record to PAID
    const updatedPayment = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: "PAID",
        paidAt: new Date(),
        method,
        note: note || `Offline payment recorded by Admin`
      }
    });

    // Notify Customer about payment confirmation
    await notifyUser({
      userId: payment.userId,
      title: "Payment Received",
      message: `We have received your payment of ₹${payment.amount.toFixed(2)} via ${method}. Thank you for your business!`,
      email: payment.user.email,
      phone: payment.user.phone
    });

    return NextResponse.json(updatedPayment);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
