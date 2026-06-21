import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admins = await prisma.user.findMany({
      where: {
        role: "ADMIN"
      },
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
          select: { id: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    // Map database user to returned structure
    const processedAdmins = admins.map(admin => ({
      id: admin.id,
      name: admin.name,
      email: admin.email,
      phone: admin.phone,
      address: admin.address,
      pincode: admin.pincode,
      role: admin.role,
      isActive: admin.isActive,
      firstLogin: admin.firstLogin,
      createdAt: admin.createdAt,
      totalOrdersManaged: admin.orders.length
    }));

    return NextResponse.json(processedAdmins);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, name, email, phone, address, pincode, password, isActive } = body;

    // Check if updating an existing business admin
    if (id) {
      // First ensure the target user has role "ADMIN"
      const targetUser = await prisma.user.findUnique({
        where: { id }
      });

      if (!targetUser || targetUser.role !== "ADMIN") {
        return NextResponse.json({ error: "Invalid target user" }, { status: 400 });
      }

      // Check email uniqueness if email is changed
      if (email && email !== targetUser.email) {
        const existingEmail = await prisma.user.findUnique({
          where: { email }
        });
        if (existingEmail) {
          return NextResponse.json({ error: "Email already exists" }, { status: 400 });
        }
      }

      let updateData: any = {
        name,
        email,
        phone,
        address,
        pincode,
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
      // Create new Business Admin
      if (!name || !email || !phone || !address || !pincode || !password) {
        return NextResponse.json({ error: "Missing required registration details" }, { status: 400 });
      }

      // Check existing email
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });
      if (existingUser) {
        return NextResponse.json({ error: "Email already exists" }, { status: 400 });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const newAdmin = await prisma.user.create({
        data: {
          name,
          email,
          phone,
          address,
          pincode,
          role: "ADMIN",
          passwordHash,
          isActive: true,
          firstLogin: false, // Business admins created by Super Admin directly access their console
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          address: true,
          pincode: true,
          role: true,
          isActive: true,
          createdAt: true
        }
      });

      return NextResponse.json(newAdmin, { status: 201 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
