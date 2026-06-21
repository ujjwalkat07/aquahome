import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;

    // 1. Fetch the target Business Admin
    const admin = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        pincode: true,
        isActive: true,
        createdAt: true,
      },
    });

    if (!admin) {
      return NextResponse.json({ error: "Business admin not found" }, { status: 404 });
    }

    // 2. Fetch customers in the same pincode
    const customers = await prisma.user.findMany({
      where: {
        role: "CUSTOMER",
        pincode: admin.pincode,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // 3. Fetch delivery partners in the same pincode
    const deliveryPartners = await prisma.user.findMany({
      where: {
        role: "DELIVERY",
        pincode: admin.pincode,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // 4. Fetch orders in the same pincode
    const orders = await prisma.order.findMany({
      where: {
        deliveryPincode: admin.pincode,
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            phone: true,
          },
        },
        deliveryPartner: {
          select: {
            name: true,
          },
        },
        payments: {
          select: {
            amount: true,
            status: true,
            method: true,
            paidAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      admin,
      customers,
      deliveryPartners,
      orders,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
