import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { notifyUser } from "@/lib/notifications";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as any).role;
    const currentUserId = (session.user as any).id;

    if (role !== "DELIVERY" && role !== "ADMIN") {
      return NextResponse.json({ error: "Access denied. Delivery partner or Admin role required." }, { status: 403 });
    }

    const body = await req.json();
    const { qrCode, location } = body;

    console.log("[SCAN API] Received QR Code payload:", qrCode, "from location:", location);

    if (!qrCode) {
      return NextResponse.json({ error: "QR Code string is required." }, { status: 400 });
    }

    // Find order by QR code
    const order = await prisma.order.findUnique({
      where: { qrCode },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        orderItems: { include: { product: true } },
        payments: true
      }
    });

    if (!order) {
      return NextResponse.json({ error: "Invalid QR Code. Order not found." }, { status: 404 });
    }

    if (order.status === "DELIVERED") {
      return NextResponse.json({ error: "This order has already been marked as DELIVERED." }, { status: 400 });
    }

    if (order.status === "CANCELLED") {
      return NextResponse.json({ error: "This order is CANCELLED." }, { status: 400 });
    }

    // If delivery partner is scanning, check if it's assigned to them
    if (role === "DELIVERY" && order.deliveryPartnerId !== currentUserId) {
      return NextResponse.json({ error: "This order is not assigned to you." }, { status: 403 });
    }

    // Set partner ID to scanner if admin scans and no partner was assigned
    const partnerId = order.deliveryPartnerId || currentUserId;

    // Transaction to update order and create logs
    const result = await prisma.$transaction(async (tx) => {
      // 1. Update Order status
      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          status: "DELIVERED",
          deliveredAt: new Date(),
        },
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } },
          payments: true
        }
      });

      // 2. Create Delivery Log
      await tx.deliveryLog.create({
        data: {
          orderId: order.id,
          deliveryPartnerId: partnerId,
          location: location || "Camera Scan confirm"
        }
      });

      return updatedOrder;
    });

    // Notify customer
    const partnerName = session.user?.name || "Delivery Partner";
    const paymentAmount = order.payments[0]?.amount || 0;
    const paymentStatus = order.payments[0]?.status || "UNPAID";
    const paymentMsg = paymentStatus === "PAID"
      ? `Your payment of ₹${paymentAmount.toFixed(2)} was received successfully.`
      : `Total amount due: ₹${paymentAmount.toFixed(2)}. Please make offline payment to the delivery partner or transfer to the account.`;
    
    await notifyUser({
      userId: order.userId,
      title: "Delivery Confirmed",
      message: `Your mineral water has been delivered by ${partnerName}. ${paymentMsg}`,
      email: order.user.email,
      phone: order.user.phone
    });

    return NextResponse.json({
      success: true,
      message: "Delivery confirmed successfully.",
      order: result
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
