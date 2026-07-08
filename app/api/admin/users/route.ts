import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const role = searchParams.get("role");

    const adminUser = await prisma.user.findUnique({
      where: { id: (session.user as any).id },
      select: { pincode: true }
    });

    if (!adminUser) {
      return NextResponse.json({ error: "Admin not found" }, { status: 404 });
    }

    let whereClause: any = {
      role: { in: ["CUSTOMER", "DELIVERY", "ADMIN"] }
    };

    if (adminUser.pincode) {
      whereClause.pincode = adminUser.pincode;
    }

    if (role && (role === "CUSTOMER" || role === "DELIVERY" || role === "ADMIN" || role === "SUPER_ADMIN")) {
      whereClause.role = role;
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        pincode: true,
        role: true,
        isActive: true,
        firstLogin: true,
        createdAt: true,
        orders: {
          select: {
            id: true,
            status: true,
            createdAt: true,
            payments: {
              select: {
                amount: true,
                status: true
              }
            }
          }
        },
        payments: {
          select: {
            amount: true,
            status: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    // Calculate details like unpaid balance and total orders
    const processedUsers = users.map(user => {
      const unpaidBalance = user.payments
        .filter(p => p.status === "UNPAID")
        .reduce((sum, p) => sum + p.amount, 0);

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        address: user.address,
        pincode: user.pincode,
        role: user.role,
        isActive: user.isActive,
        firstLogin: user.firstLogin,
        createdAt: user.createdAt,
        totalOrders: user.orders.length,
        unpaidBalance
      };
    });

    return NextResponse.json(processedUsers);
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

    const currentUserId = (session.user as any).id;
    const adminUser = await prisma.user.findUnique({
      where: { id: currentUserId },
      select: { pincode: true }
    });
    if (!adminUser) {
      return NextResponse.json({ error: "Admin not found" }, { status: 404 });
    }
    const adminPincode = adminUser.pincode;

    const body = await req.json();
    const { id, name, email, phone, address, pincode, role, password, isActive } = body;

    // Check if updating
    if (id) {
      const targetUser = await prisma.user.findUnique({
        where: { id }
      });
      if (!targetUser) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      // Enforce data separation
      if (adminPincode && targetUser.pincode && targetUser.pincode !== adminPincode) {
        return NextResponse.json({ error: "Access denied: User is in a different pincode region." }, { status: 403 });
      }

      let finalPincode = pincode;
      if (adminPincode) {
        if (pincode && pincode !== adminPincode) {
          return NextResponse.json({ error: "Access denied: Cannot assign a different pincode region." }, { status: 403 });
        }
        finalPincode = adminPincode;
      }

      let updateData: any = {
        name,
        email,
        phone,
        address,
        pincode: finalPincode !== undefined ? (finalPincode || null) : undefined,
        isActive: isActive !== undefined ? !!isActive : undefined
      };

      if (password) {
        updateData.passwordHash = await bcrypt.hash(password, 10);
      }

      const updatedUser = await prisma.user.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          address: true,
          pincode: true,
          role: true,
          isActive: true
        }
      });
      return NextResponse.json(updatedUser);
    } else {
      // Create user
      if (!name || !email || !phone || !address || !role) {
        return NextResponse.json({ error: "Missing required registration details" }, { status: 400 });
      }

      let finalPincode = pincode;
      if (adminPincode) {
        if (pincode && pincode !== adminPincode) {
          return NextResponse.json({ error: "Access denied: Cannot register users in a different pincode region." }, { status: 403 });
        }
        finalPincode = adminPincode;
      }

      // Check existing email
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });
      if (existingUser) {
        return NextResponse.json({ error: "Email already exists" }, { status: 400 });
      }

      const activePassword = password || (Math.random().toString(36).slice(-12) + "AqHome#2026");
      const passwordHash = await bcrypt.hash(activePassword, 10);
      const newUser = await prisma.user.create({
        data: {
          name,
          email,
          phone,
          address,
          pincode: finalPincode || null,
          role,
          passwordHash,
          isActive: true,
          firstLogin: role === "CUSTOMER",
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          address: true,
          pincode: true,
          role: true,
          isActive: true
        }
      });

      return NextResponse.json(newUser, { status: 201 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
