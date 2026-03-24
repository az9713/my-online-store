import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q")?.trim() || "";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get("pageSize") || "20")));

  if (!query) {
    // Return all active products when no query
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where: { status: "active" },
        include: { variants: true },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.product.count({ where: { status: "active" } }),
    ]);

    return NextResponse.json({
      data: products,
      pagination: { page, pageSize, total },
    });
  }

  // Search by title, description, or tags
  const where = {
    status: "active" as const,
    OR: [
      { title: { contains: query, mode: "insensitive" as const } },
      { description: { contains: query, mode: "insensitive" as const } },
      { tags: { has: query.toLowerCase() } },
    ],
  };

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
