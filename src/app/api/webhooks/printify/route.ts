import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyHmac } from "@/lib/printify/verify-hmac";
import { getHandler } from "@/lib/printify/router";

export async function POST(request: NextRequest) {
  const secret = process.env.PRINTIFY_WEBHOOK_SECRET;
  if (!secret) {
    console.error("PRINTIFY_WEBHOOK_SECRET not configured");
    return NextResponse.json(
      { error: { code: "CONFIG_ERROR", message: "Webhook not configured" } },
      { status: 500 }
    );
  }

  // Read raw body for signature verification
  const rawBody = await request.text();
  const signature = request.headers.get("x-printify-signature");
  const eventType = request.headers.get("x-printify-event") || "";

  // Verify HMAC signature
  if (!verifyHmac(rawBody, signature, secret)) {
    // Log invalid signature attempt
    await prisma.webhookEvent.create({
      data: {
        provider: "printify",
        eventType: eventType || "unknown",
        signatureValid: false,
        payload: {},
        processingStatus: "failed",
        errorMessage: "Invalid signature",
      },
    });

    return NextResponse.json(
      { error: { code: "INVALID_SIGNATURE", message: "Invalid webhook signature" } },
      { status: 401 }
    );
  }

  // Parse payload
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json(
      { error: { code: "INVALID_PAYLOAD", message: "Invalid JSON payload" } },
      { status: 400 }
    );
  }

  // Resolve event type from header or payload
  const resolvedEventType = eventType || (payload.type as string) || "unknown";

  // Check idempotency — skip if we've already processed this event
  const eventId = (payload.id as string) || null;
  if (eventId) {
    const existing = await prisma.webhookEvent.findFirst({
      where: {
        provider: "printify",
        eventId,
        processingStatus: "processed",
      },
    });
    if (existing) {
      return NextResponse.json({ status: "already_processed" }, { status: 200 });
    }
  }

  // Log the event before processing
  const webhookEvent = await prisma.webhookEvent.create({
    data: {
      provider: "printify",
      eventType: resolvedEventType,
      eventId,
      signatureValid: true,
      payload: payload as Record<string, unknown>,
      processingStatus: "pending",
    },
  });

  // Route to handler
  const handler = getHandler(resolvedEventType);
  if (!handler) {
    await prisma.webhookEvent.update({
      where: { id: webhookEvent.id },
      data: {
        processingStatus: "processed",
        processedAt: new Date(),
        errorMessage: `No handler for event type: ${resolvedEventType}`,
      },
    });
    return NextResponse.json({ status: "unhandled_event" }, { status: 200 });
  }

  try {
    await handler(payload);
    await prisma.webhookEvent.update({
      where: { id: webhookEvent.id },
      data: { processingStatus: "processed", processedAt: new Date() },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await prisma.webhookEvent.update({
      where: { id: webhookEvent.id },
      data: { processingStatus: "failed", errorMessage: message },
    });
    console.error(`Webhook processing failed for ${resolvedEventType}:`, message);
  }

  return NextResponse.json({ status: "ok" }, { status: 200 });
}
