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

    const partnerName = session.user?.name || "Delivery Partner";
    const paymentAmount = order.payments[0]?.amount || 0;
    const paymentStatus = order.payments[0]?.status || "UNPAID";
    const paymentMethod = order.payments[0]?.method || "CASH";
    const paymentMsg = paymentStatus === "PAID"
      ? `Your payment of ₹${paymentAmount.toFixed(2)} was received successfully.`
      : `Total amount due: ₹${paymentAmount.toFixed(2)}. Please make offline payment to the delivery partner or transfer to the account.`;
    
    // Generate HTML email invoice/receipt
    const invoiceNum = order.id.slice(0, 8).toUpperCase();
    const accountNum = `AQ-2026-${order.user.id.slice(0, 6).toUpperCase()}`;
    const dateStr = new Date().toLocaleDateString([], { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });

    const resolvedItems = order.orderItems.map(item => ({
      productName: item.product.name,
      size: item.product.size,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      total: item.unitPrice * item.quantity
    }));

    const emailHtmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>AquaHome Invoice</title>
      <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #334155; margin: 0; padding: 0; background-color: #f8fafc; }
        .container { max-width: 600px; margin: 30px auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
        .header { background: linear-gradient(135deg, #0077b6 0%, #00b4d8 100%); padding: 30px; text-align: center; color: white; }
        .header h1 { margin: 0; font-size: 26px; font-weight: 800; }
        .header p { margin: 5px 0 0 0; opacity: 0.9; font-size: 14px; }
        .content { padding: 30px; }
        .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 25px; font-size: 13px; }
        .meta-box p { margin: 3px 0; }
        .meta-title { font-weight: 750; color: #64748b; text-transform: uppercase; font-size: 10px; letter-spacing: 0.5px; }
        .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .table th { background-color: #f1f5f9; color: #475569; font-weight: 700; text-align: left; padding: 10px; font-size: 12px; text-transform: uppercase; }
        .table td { padding: 12px 10px; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
        .total-section { text-align: right; padding: 15px 10px; background-color: #fafafa; border-radius: 8px; margin-top: 15px; }
        .total-amount { font-size: 20px; font-weight: 800; color: #0077b6; }
        .status-badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
        .status-paid { background-color: #dcfce7; color: #15803d; }
        .status-unpaid { background-color: #fef3c7; color: #b45309; }
        .footer { background-color: #f1f5f9; padding: 20px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>💧 AquaHome</h1>
          <p>Official Water Delivery Invoice</p>
        </div>
        <div class="content">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #f1f5f9; padding-bottom: 15px; margin-bottom: 20px;">
            <div>
              <span class="meta-title">Invoice Number</span>
              <p style="margin: 3px 0; font-size: 16px; font-weight: bold; color: #1e293b;">#INV-${invoiceNum}</p>
            </div>
            <div>
              <span class="status-badge ${paymentStatus === "PAID" ? "status-paid" : "status-unpaid"}">${paymentStatus}</span>
            </div>
          </div>
          
          <div class="meta-grid">
            <div class="meta-box">
              <span class="meta-title">Bill To</span>
              <p><strong>Customer Name:</strong> ${order.user.name}</p>
              <p><strong>Account No:</strong> ${accountNum}</p>
              <p><strong>Phone:</strong> ${order.user.phone}</p>
            </div>
            <div class="meta-box" style="text-align: right;">
              <span class="meta-title">Delivery Details</span>
              <p><strong>Date:</strong> ${dateStr}</p>
              <p><strong>Address:</strong> ${order.deliveryAddress}</p>
              <p><strong>Delivered By:</strong> ${partnerName}</p>
            </div>
          </div>

          <table class="table">
            <thead>
              <tr>
                <th>Product Description</th>
                <th style="text-align: center;">Qty</th>
                <th style="text-align: right;">Price</th>
                <th style="text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${resolvedItems.map(item => `
                <tr>
                  <td>${item.productName} (${item.size})</td>
                  <td style="text-align: center;">${item.quantity}</td>
                  <td style="text-align: right;">₹${item.unitPrice.toFixed(2)}</td>
                  <td style="text-align: right; font-weight: bold;">₹${item.total.toFixed(2)}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>

          <div class="total-section">
            <span class="meta-title" style="display: block; margin-bottom: 5px;">Grand Total</span>
            <span class="total-amount">₹${paymentAmount.toFixed(2)}</span>
            <p style="margin: 5px 0 0 0; font-size: 11px; color: #64748b;">
              Method: <strong>${paymentMethod}</strong>
            </p>
          </div>
        </div>
        <div class="footer">
          <p><strong>AquaHome Water Delivery Services</strong></p>
          <p>Purity Guaranteed. Thank you for your continued business!</p>
        </div>
      </div>
    </body>
    </html>
    `;

    await notifyUser({
      userId: order.userId,
      title: "Delivery Confirmed",
      message: `Your mineral water has been delivered by ${partnerName}. ${paymentMsg}`,
      email: order.user.email,
      phone: order.user.phone,
      emailHtml: emailHtmlBody
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
