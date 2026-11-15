import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const cookieName = "jk-staff-session";
const lifetimeSeconds = 60 * 60 * 24 * 7;

function equal(a: string, b: string) {
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(a), digest(b));
}

function sign(expiry: string, key: string) {
  return createHmac("sha256", key).update("jk-staff:" + expiry).digest("base64url");
}

export async function hasSession() {
  const key = process.env.STAFF_ACCESS_KEY;
  const token = (await cookies()).get(cookieName)?.value;
  if (!key || !token) return false;
  const [expiry, signature] = token.split(".");
  return /^\d+$/.test(expiry) && Number(expiry) > Date.now() && !!signature && equal(signature, sign(expiry, key));
}

export async function startSession(input: FormDataEntryValue | null) {
  const key = process.env.STAFF_ACCESS_KEY;
  if (!key || typeof input !== "string" || !equal(input, key)) return false;
  const expiry = String(Date.now() + lifetimeSeconds * 1000);
  (await cookies()).set(cookieName, expiry + "." + sign(expiry, key), {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: lifetimeSeconds,
  });
  return true;
}

export async function endSession() {
  (await cookies()).delete(cookieName);
}
