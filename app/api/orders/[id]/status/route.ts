import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { notifyUser } from "@/lib/notifications";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const userRole = (session.user as any).role;
    const currentUserId = (session.user as any).id;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true, pincode: true } },
        deliveryPartner: { select: { id: true, name: true, email: true, phone: true } },
        payments: true
      }
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const body = await req.json();
    const { status, deliveryPartnerId, cancelReason } = body;

    // Authorization checks
    // Customers can only cancel their own order and only if it's PENDING
    if (userRole === "CUSTOMER") {
      if (order.userId !== currentUserId) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
      if (status !== "CANCELLED") {
        return NextResponse.json({ error: "Customers can only cancel orders" }, { status: 400 });
      }
      if (order.status !== "PENDING") {
        return NextResponse.json({ error: "Cannot cancel order. It is already in progress or completed." }, { status: 400 });
      }
    }

    // Admins and Delivery Partners can update.
    if (userRole === "DELIVERY" && order.deliveryPartnerId !== currentUserId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    if (userRole === "ADMIN") {
      const adminUser = await prisma.user.findUnique({
        where: { id: currentUserId },
        select: { id: true }
      });
      if (!adminUser) {
        return NextResponse.json({ error: "Admin not found" }, { status: 404 });
      }

      const orderUser = await prisma.user.findUnique({
        where: { id: order.userId },
        select: { vendorId: true }
      });

      if (orderUser && orderUser.vendorId && orderUser.vendorId !== adminUser.id) {
        return NextResponse.json({ error: "Access denied: Order belongs to a different vendor's customer." }, { status: 403 });
      }
    }

    // Build update payload
    let updateData: any = {};
    if (status !== undefined) {
      updateData.status = status;
    }
    if (deliveryPartnerId !== undefined && userRole === "ADMIN") {
      updateData.deliveryPartnerId = deliveryPartnerId || null;
      // If a delivery partner is assigned, we automatically update status to IN_PROGRESS (Out for Delivery)
      if (deliveryPartnerId && order.status === "PENDING") {
        updateData.status = "IN_PROGRESS";
      }
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: updateData,
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        deliveryPartner: { select: { id: true, name: true, email: true, phone: true } }
      }
    });

    // Handle payments adjustments on cancel
    if (status === "CANCELLED" && order.status !== "CANCELLED") {
      // Restore product stock
      const orderWithItems = await prisma.order.findUnique({
        where: { id },
        include: { orderItems: true }
      });
      if (orderWithItems) {
        for (const item of orderWithItems.orderItems) {
          await prisma.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } }
          });
        }
      }

      await prisma.payment.updateMany({
        where: { orderId: id },
        data: {
          note: `Cancelled. Reason: ${cancelReason || "User request"}`
        }
      });
      
      // Notify customer
      await notifyUser({
        userId: order.userId,
        title: "Order Cancelled",
        message: `Your order (#${order.id.slice(0, 8)}) has been cancelled. Reason: ${cancelReason || "No reason specified"}.`,
        email: order.user.email,
        phone: order.user.phone
      });
    }

    // Handle notification upon status update to IN_PROGRESS
    if (status === "IN_PROGRESS" || (updateData.status === "IN_PROGRESS" && order.status !== "IN_PROGRESS")) {
      await notifyUser({
        userId: order.userId,
        title: "Order Out for Delivery",
        message: `Your AquaHome delivery is out for delivery! Time slot: ${order.deliveryTimeSlot}.`,
        email: order.user.email,
        phone: order.user.phone
      });
    }

    // Handle notification upon status update to DELIVERED
    if (status === "DELIVERED" || (updateData.status === "DELIVERED" && order.status !== "DELIVERED")) {
      const partnerName = updatedOrder.deliveryPartner?.name || session.user?.name || "Delivery Partner";
      const paymentAmount = order.payments?.[0]?.amount || 0;
      const paymentStatus = order.payments?.[0]?.status || "UNPAID";
      const paymentMsg = paymentStatus === "PAID"
        ? `Your payment of ₹${paymentAmount.toFixed(2)} was received successfully.`
        : `Total amount due: ₹${paymentAmount.toFixed(2)}. Please make offline payment to the delivery partner or transfer to the account.`;

      await notifyUser({
        userId: order.userId,
        title: "Order Delivered",
        message: `Your AquaHome order (#${order.id.slice(0, 8)}) has been successfully delivered by ${partnerName}. ${paymentMsg}`,
        email: order.user.email,
        phone: order.user.phone
      });
    }

    // Notify delivery partner on assignment
    if (deliveryPartnerId && deliveryPartnerId !== order.deliveryPartnerId && userRole === "ADMIN") {
      const partner = await prisma.user.findUnique({ where: { id: deliveryPartnerId } });
      if (partner) {
        await notifyUser({
          userId: partner.id,
          title: "New Delivery Assigned",
          message: `You have been assigned a new delivery for customer ${order.user.name}. Address: ${order.deliveryAddress}. Pincode: ${order.deliveryPincode}. Time Slot: ${order.deliveryTimeSlot}.`,
          email: partner.email,
          phone: partner.phone
        });
      }
    }

    return NextResponse.json(updatedOrder);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
