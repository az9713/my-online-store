import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function handleApiError(error: unknown) {
  if (error instanceof ZodError) {
    const messages = error.errors.map((e) => `${e.path.join(".")}: ${e.message}`);
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: messages.join("; ") } },
      { status: 400 }
    );
  }

  console.error("Unhandled API error:", error);
  return NextResponse.json(
    { error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" } },
    { status: 500 }
  );
}
