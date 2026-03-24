import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const targetType = (body.targetType as string) || "orders";

  const syncRun = await prisma.syncRun.create({
    data: {
      triggerType: "manual",
      targetType,
      status: "running",
    },
  });

  try {
    // In a real implementation, this would call Printify's API
    // For now, it's a placeholder that logs the sync attempt
    const apiToken = process.env.PRINTIFY_API_TOKEN;
    if (!apiToken) {
      await prisma.syncRun.update({
        where: { id: syncRun.id },
        data: {
          status: "failed",
          errorMessage: "PRINTIFY_API_TOKEN not configured",
          finishedAt: new Date(),
        },
      });

      return NextResponse.json({
        data: {
          syncRunId: syncRun.id,
          status: "failed",
          message: "Printify API token not configured. Set PRINTIFY_API_TOKEN environment variable.",
        },
      });
    }

    // Placeholder: actual Printify API calls would go here
    await prisma.syncRun.update({
      where: { id: syncRun.id },
      data: {
        status: "completed",
        resultSummary: { synced: 0, message: "Sync endpoint ready — Printify API integration pending" },
        finishedAt: new Date(),
      },
    });

    return NextResponse.json({
      data: {
        syncRunId: syncRun.id,
        status: "completed",
        synced: 0,
        failed: 0,
        message: "Sync endpoint operational. Full Printify API sync will be wired when API token is configured.",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await prisma.syncRun.update({
      where: { id: syncRun.id },
      data: { status: "failed", errorMessage: message, finishedAt: new Date() },
    });

    return NextResponse.json(
      { error: { code: "SYNC_FAILED", message } },
      { status: 500 }
    );
  }
}
