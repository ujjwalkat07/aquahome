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

    if (role !== "DELIVERY" && role !== "ADMIN" && role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const body = await req.json();
    const {
      customerId,
      items, // array of { productId, quantity }
      paymentMethod, // CASH, BANK_TRANSFER
      paymentStatus, // PAID, UNPAID
      deliveryAddress,
      deliveryPincode,
    } = body;

    if (!customerId || !items || items.length === 0 || !paymentMethod || !paymentStatus) {
      return NextResponse.json({ error: "Missing required details. Customer, items, and payment info are required." }, { status: 400 });
    }

    // 1. Fetch customer details
    const customer = await prisma.user.findUnique({
      where: { id: customerId },
    });

    if (!customer || customer.role !== "CUSTOMER") {
      return NextResponse.json({ error: "Customer not found." }, { status: 404 });
    }

    const finalAddress = deliveryAddress || customer.address;
    const finalPincode = deliveryPincode || customer.pincode;

    // 2. Fetch products and calculate total cost
    const productIds = items.map((i: any) => i.productId);
    const dbProducts = await prisma.product.findMany({
      where: { id: { in: productIds } }
    });

    const productsMap = new Map(dbProducts.map(p => [p.id, p]));
    let totalAmount = 0;
    const resolvedItems: Array<{
      productName: string;
      size: string;
      quantity: number;
      unitPrice: number;
      total: number;
    }> = [];

    // Validate quantities and stock availability
    for (const item of items) {
      const product = productsMap.get(item.productId);
      if (!product || !product.isAvailable) {
        return NextResponse.json({ error: `Product is not available.` }, { status: 400 });
      }
      if (item.quantity <= 0) {
        return NextResponse.json({ error: "Quantity must be greater than zero." }, { status: 400 });
      }
      if (item.quantity > product.stock) {
        return NextResponse.json({ error: `Insufficient stock for product "${product.name}" (${product.size}). Only ${product.stock} left.` }, { status: 400 });
      }
      const itemTotal = product.pricePerUnit * item.quantity;
      totalAmount += itemTotal;
      resolvedItems.push({
        productName: product.name,
        size: product.size,
        quantity: item.quantity,
        unitPrice: product.pricePerUnit,
        total: itemTotal,
      });
    }

    // 3. Database Transaction: Create Order (DELIVERED), OrderItems, Payment, DeliveryLog and update Stock
    const result = await prisma.$transaction(async (tx) => {
      // Create Order
      const order = await tx.order.create({
        data: {
          userId: customerId,
          deliveryPartnerId: role === "DELIVERY" ? currentUserId : null,
          status: "DELIVERED",
          deliveryTimeSlot: "Immediate Scan Billing",
          deliveryAddress: finalAddress,
          deliveryPincode: finalPincode,
          isScheduled: false,
          deliveredAt: new Date(),
        }
      });

      // Create Order Items and update inventory
      for (const item of items) {
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

      // Create Payment
      const payment = await tx.payment.create({
        data: {
          userId: customerId,
          orderId: order.id,
          amount: totalAmount,
          status: paymentStatus,
          paidAt: paymentStatus === "PAID" ? new Date() : null,
          method: paymentMethod,
          note: `Billed by delivery partner upon scanning customer QR`
        }
      });

      // Update Order with unique QR code string
      const qrCodeString = `ORDER-${order.id}`;
      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: { qrCode: qrCodeString },
        include: {
          orderItems: { include: { product: true } }
        }
      });

      // Create Delivery Log
      await tx.deliveryLog.create({
        data: {
          orderId: order.id,
          deliveryPartnerId: role === "DELIVERY" ? currentUserId : currentUserId,
          location: "Customer QR Scan Billing"
        }
      });

      return { order: updatedOrder, payment };
    }, {
      maxWait: 5000,
      timeout: 15000
    });

    // 4. Generate beautiful billing notifications
    const invoiceNum = result.order.id.slice(0, 8).toUpperCase();
    const accountNum = `AQ-2026-${customer.id.slice(0, 6).toUpperCase()}`;
    const dateStr = new Date().toLocaleDateString([], { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });

    // A. WhatsApp receipt format
    const whatsappMsg = `*💧 AQUAHOME WATER BILL RECEIPT 💧*
-------------------------------------------
*Invoice:* #INV-${invoiceNum}
*Account No:* ${accountNum}
*Customer:* ${customer.name}
*Date:* ${dateStr}
*Delivery Address:* ${finalAddress}

*ITEMS DELIVERED:*
${resolvedItems.map(item => `• ${item.productName} (${item.size}) x ${item.quantity} = ₹${item.total.toFixed(2)}`).join("\n")}

-------------------------------------------
*Total Amount:* ₹${totalAmount.toFixed(2)}
*Payment Status:* ${paymentStatus === "PAID" ? `✅ PAID (${paymentMethod})` : "⚠️ UNPAID (Payment Due)"}
-------------------------------------------
Thank you for choosing AquaHome. Pure drinking water at your doorstep.
For support, contact us at info@aquahome.com`;

    // B. Email Receipt Message (text & HTML)
    const emailSubject = `AquaHome Bill Invoice #INV-${invoiceNum}`;
    const emailBodyText = `AquaHome Mineral Water Bill Invoice\n\nInvoice: #INV-${invoiceNum}\nAccount No: ${accountNum}\nCustomer: ${customer.name}\nTotal: ₹${totalAmount.toFixed(2)}\nPayment: ${paymentStatus} (${paymentMethod})`;
    
    // Custom premium HTML template for the invoice
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
              <p><strong>Customer Name:</strong> ${customer.name}</p>
              <p><strong>Account No:</strong> ${accountNum}</p>
              <p><strong>Phone:</strong> ${customer.phone}</p>
            </div>
            <div class="meta-box" style="text-align: right;">
              <span class="meta-title">Delivery Details</span>
              <p><strong>Date:</strong> ${dateStr}</p>
              <p><strong>Address:</strong> ${finalAddress}</p>
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
            <span class="total-amount">₹${totalAmount.toFixed(2)}</span>
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

    // Trigger Notifications (includes WhatsApp & Email)
    await notifyUser({
      userId: customerId,
      title: `Water Delivered & Bill Generated`,
      message: `Your water delivery has been completed. Invoice #INV-${invoiceNum} of ₹${totalAmount.toFixed(2)} generated. Payment Status: ${paymentStatus}.`,
      email: customer.email,
      phone: customer.phone,
      whatsAppMessage: whatsappMsg,
      emailHtml: emailHtmlBody
    });

    // Alert Admins of low stock products
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
            message: `Product "${product.name}" (${product.size}) is low in stock! Remaining: ${remainingStock} bottles.`
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: "Order billing completed and notifications dispatched.",
      order: result.order,
      payment: result.payment,
      whatsappMessage: whatsappMsg,
      customerPhone: customer.phone
    }, { status: 201 });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
