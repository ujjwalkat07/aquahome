import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
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
        user: { select: { name: true, email: true, phone: true, address: true, pincode: true } },
        deliveryPartner: { select: { name: true, phone: true } },
        orderItems: {
          include: { product: true }
        },
        payments: true,
        deliveryLogs: {
          include: { deliveryPartner: { select: { name: true } } }
        }
      }
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Authorization checks
    if (userRole === "CUSTOMER" && order.userId !== currentUserId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    if (userRole === "DELIVERY" && order.deliveryPartnerId !== currentUserId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    if (userRole === "ADMIN") {
      const adminUser = await prisma.user.findUnique({
        where: { id: currentUserId },
        select: { pincode: true }
      });
      if (!adminUser) {
        return NextResponse.json({ error: "Admin not found" }, { status: 404 });
      }

      if (adminUser.pincode) {
        const matchesOrderPincode = order.deliveryPincode === adminUser.pincode;
        const matchesUserPincode = order.user?.pincode === adminUser.pincode;
        if (!matchesOrderPincode && !matchesUserPincode) {
          return NextResponse.json({ error: "Access denied: Order belongs to a different pincode region" }, { status: 403 });
        }
      }
    }

    return NextResponse.json(order);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
