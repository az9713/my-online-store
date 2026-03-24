import { createHmac, timingSafeEqual } from "crypto";

/**
 * Verify HMAC-SHA256 signature from Printify webhook.
 *
 * @param rawBody - The raw request body as a string (must be unchanged from receipt)
 * @param signature - The signature from the X-Printify-Signature header
 * @param secret - The webhook secret shared between Printify and our app
 * @returns true if the signature is valid
 */
export function verifyHmac(
  rawBody: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature || !rawBody || !secret) return false;

  // Remove "sha256=" prefix if present
  const providedSig = signature.replace(/^sha256=/, "");

  const expectedSig = createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  // Use constant-time comparison to prevent timing attacks
  try {
    return timingSafeEqual(
      Buffer.from(providedSig, "hex"),
      Buffer.from(expectedSig, "hex")
    );
  } catch {
    // If signatures have different lengths, timingSafeEqual throws
    return false;
  }
}
