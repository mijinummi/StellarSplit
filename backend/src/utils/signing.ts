import crypto from "crypto";

export function generateSecret(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function signPayload(secret: string, payload: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

export function verifySignature(secret: string, payload: string, signature: string): boolean {
  const expected = signPayload(secret, payload);
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}
