import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const featured = searchParams.get("featured");
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get("pageSize") || "20")));

  const where: Record<string, unknown> = { status: "active" };
  if (featured === "true") {
    where.featured = true;
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { variants: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.product.count({ where }),
  ]);

  return NextResponse.json({
    data: products,
    pagination: { page, pageSize, total },
  });
}
