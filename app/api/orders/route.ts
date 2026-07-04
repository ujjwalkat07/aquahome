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

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const userIdParam = searchParams.get("userId");
    const deliveryPartnerIdParam = searchParams.get("deliveryPartnerId");

    const userRole = (session.user as any).role;
    const currentUserId = (session.user as any).id;

    let whereClause: any = {};

    // Role-based restrictions
    if (userRole === "CUSTOMER") {
      whereClause.userId = currentUserId;
    } else if (userRole === "DELIVERY") {
      whereClause.deliveryPartnerId = currentUserId;
    } else if (userRole === "ADMIN") {
      if (userIdParam) {
        whereClause.userId = userIdParam;
      }
      if (deliveryPartnerIdParam) {
        whereClause.deliveryPartnerId = deliveryPartnerIdParam;
      }
    }

    if (status) {
      whereClause.status = status;
    }

    const orders = await prisma.order.findMany({
      where: whereClause,
      include: {
        user: { select: { name: true, email: true, phone: true } },
        deliveryPartner: { select: { name: true, phone: true } },
        orderItems: {
          include: { product: true }
        },
        payments: true
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(orders);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentUserId = (session.user as any).id;
    const body = await req.json();
    const {
      items, // array of { productId, quantity }
      deliveryAddress,
      deliveryPincode,
      deliveryTimeSlot,
      isScheduled,
      scheduleFrequency
    } = body;

    if (!items || items.length === 0 || !deliveryAddress || !deliveryPincode || !deliveryTimeSlot) {
      return NextResponse.json({ error: "Missing required order details" }, { status: 400 });
    }

    // 1. Fetch products and calculate total cost
    const productIds = items.map((i: any) => i.productId);
    const dbProducts = await prisma.product.findMany({
      where: { id: { in: productIds } }
    });

    const productsMap = new Map(dbProducts.map(p => [p.id, p]));
    let totalAmount = 0;

    // Validate quantities and stock availability
    for (const item of items) {
      const product = productsMap.get(item.productId);
      if (!product || !product.isAvailable) {
        return NextResponse.json({ error: `Product ${item.productId} is not available.` }, { status: 400 });
      }
      if (item.quantity <= 0) {
        return NextResponse.json({ error: "Quantity must be greater than zero." }, { status: 400 });
      }
      if (item.quantity > product.stock) {
        return NextResponse.json({ error: `Insufficient stock for product "${product.name}" (${product.size}). Only ${product.stock} left.` }, { status: 400 });
      }
      totalAmount += product.pricePerUnit * item.quantity;
    }

    // 2. Perform Transaction: Create Order, Items, Payment, and update Stock
    const result = await prisma.$transaction(async (tx) => {
      // Create Order
      const order = await tx.order.create({
        data: {
          userId: currentUserId,
          status: "PENDING",
          deliveryTimeSlot,
          deliveryAddress,
          deliveryPincode,
          isScheduled: !!isScheduled,
          scheduleFrequency: isScheduled ? scheduleFrequency : null,
        }
      });

      // Create Order Items and update inventory
      for (const item of items) {
        // Fetch current product details inside transaction to prevent concurrency bugs
        const dbProduct = await tx.product.findUnique({
          where: { id: item.productId }
        });
        if (!dbProduct || !dbProduct.isAvailable || dbProduct.stock < item.quantity) {
          throw new Error(`Insufficient stock for product "${dbProduct?.name || item.productId}".`);
        }

        // Create item
        await tx.orderItem.create({
          data: {
            orderId: order.id,
            productId: dbProduct.id,
            quantity: item.quantity,
            unitPrice: dbProduct.pricePerUnit
          }
        });

        // Update product stock
        await tx.product.update({
          where: { id: dbProduct.id },
          data: { stock: dbProduct.stock - item.quantity }
        });
      }

      // Create invoice/payment
      const payment = await tx.payment.create({
        data: {
          userId: currentUserId,
          orderId: order.id,
          amount: totalAmount,
          status: "UNPAID",
        }
      });

      // Generate a unique QR code string using the order details
      const hash = Math.random().toString(36).substring(2, 10);
      const qrCodeString = `ORDER-${order.id}-${Date.now()}-${hash}`;

      // Update Order with QR code
      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: { qrCode: qrCodeString },
        include: {
          orderItems: { include: { product: true } }
        }
      });

      return { order: updatedOrder, payment };
    }, {
      maxWait: 5000,
      timeout: 15000
    });

    // 3. Post-Transaction tasks (notifications & alerts)
    const orderUser = await prisma.user.findUnique({ where: { id: currentUserId } });
    if (orderUser) {
      await notifyUser({
        userId: currentUserId,
        title: "Order Placed Successfully",
        message: `Your order for AquaHome Mineral Water has been placed. Total: ₹${totalAmount.toFixed(2)}. Time slot: ${deliveryTimeSlot}.`,
        email: orderUser.email,
        phone: orderUser.phone
      });
    }

    // Check low stock products to alert Admins
    const lowStockAlerts = dbProducts.filter(p => {
      const orderedItem = items.find((i: any) => i.productId === p.id);
      const remainingStock = p.stock - (orderedItem ? orderedItem.quantity : 0);
      return remainingStock <= p.lowStockThreshold;
    });

    if (lowStockAlerts.length > 0) {
      const admins = await prisma.user.findMany({ where: { role: "ADMIN" } });
      for (const admin of admins) {
        for (const product of lowStockAlerts) {
          const remainingStock = Math.max(0, product.stock - (items.find((i: any) => i.productId === product.id)?.quantity || 0));
          await notifyUser({
            userId: admin.id,
            title: "LOW STOCK ALERT",
            message: `Product "${product.name}" (${product.size}) is low in stock! Remaining: ${remainingStock} bottles (Threshold: ${product.lowStockThreshold}).`
          });
        }
      }
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
