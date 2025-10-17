// app/api/qr/track/route.ts
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getSupabaseServer } from "@/lib/supabase-server";
import crypto from "node:crypto";

export async function POST(req: Request) {
  const h = await headers();

  // Require same-origin; if not, quietly ignore.
  const secSite = h.get("sec-fetch-site");
  if (secSite !== "same-origin") {
    return new NextResponse(null, { status: 204 });
  }

  // Parse JSON body
  let token: string | undefined;
  try {
    const body = await req.json();
    token = typeof body?.t === "string" ? body.t : undefined;
  } catch {
    return new NextResponse(null, { status: 204 });
  }
  if (!token) return new NextResponse(null, { status: 204 });

  // Verify token; if invalid, ignore.
  const parsed = parseAndVerify(token);
  if (!parsed) return new NextResponse(null, { status: 204 });

  const { qrCodeId, iat } = parsed;
  if (!isFresh(iat)) return new NextResponse(null, { status: 204 });

  // Record click best-effort; any failure is swallowed.
  try {
    const supabase = await getSupabaseServer();
    const ip = getClientIp(h);
    const ua = h.get("user-agent") ?? null;

    await supabase.from("qr_scans").insert({
      qr_code_id: qrCodeId,
      user_agent: ua,
      ip_address: ip,
    });
  } catch {
    // swallow
  }

  return new NextResponse(null, { status: 204 });
}

/* ------------------------------ helpers ------------------------------- */

function parseAndVerify(token: string): { qrCodeId: string; targetUrl: string; iat: number } | null {
  try {
    const raw = Buffer.from(token, "base64url").toString("utf8");
    const { d, s } = JSON.parse(raw) as { d: string; s: string };
    const secret = process.env.QR_HMAC_SECRET!;
    const expected = crypto.createHmac("sha256", secret).update(d).digest("base64url");
    if (!timingSafeEq(s, expected)) return null;
    const payload = JSON.parse(d) as { qrCodeId: string; targetUrl: string; iat: number };
    // basic sanity
    new URL(payload.targetUrl);
    return payload;
  } catch {
    return null;
  }
}

function timingSafeEq(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

function isFresh(iat: number) {
  const maxAgeMs = 10 * 60 * 1000; // 10 minutes
  return Date.now() - iat <= maxAgeMs;
}

function getClientIp(h: Headers): string | null {
  const vercel = h.get("x-vercel-forwarded-for");
  if (vercel && vercel.trim()) return vercel.split(",")[0].trim();
  const xff = h.get("x-forwarded-for");
  if (xff && xff.trim()) return xff.split(",")[0].trim();
  const rip = h.get("x-real-ip");
  if (rip && rip.trim()) return rip.trim();
  return null;
}
