import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      orderBy: { name: "asc" }
    });
    return NextResponse.json(products);
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
    const { id, name, size, pricePerUnit, stock, lowStockThreshold, isAvailable } = body;

    if (!name || !size || pricePerUnit === undefined) {
      return NextResponse.json({ error: "Name, size, and price are required" }, { status: 400 });
    }

    if (id) {
      const product = await prisma.product.update({
        where: { id },
        data: {
          name,
          size,
          pricePerUnit: parseFloat(pricePerUnit),
          stock: stock !== undefined ? parseInt(stock) : undefined,
          lowStockThreshold: lowStockThreshold !== undefined ? parseInt(lowStockThreshold) : undefined,
          isAvailable: isAvailable !== undefined ? !!isAvailable : undefined,
        }
      });
      return NextResponse.json(product);
    } else {
      const product = await prisma.product.create({
        data: {
          name,
          size,
          pricePerUnit: parseFloat(pricePerUnit),
          stock: stock !== undefined ? parseInt(stock) : 0,
          lowStockThreshold: lowStockThreshold !== undefined ? parseInt(lowStockThreshold) : 10,
          isAvailable: isAvailable !== undefined ? !!isAvailable : true,
        }
      });
      return NextResponse.json(product, { status: 201 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
