import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const product = await prisma.product.findUnique({
    where: { slug },
    include: { variants: true },
  });

  if (!product) {
    return NextResponse.json(
      { error: { code: "PRODUCT_NOT_FOUND", message: `No product with slug '${slug}'` } },
      { status: 404 }
    );
  }

  return NextResponse.json({ data: product });
}
