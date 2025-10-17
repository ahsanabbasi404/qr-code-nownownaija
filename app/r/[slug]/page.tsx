// app/qr/[slug]/page.tsx
import "server-only";
import { notFound } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase-server";
import { decodeUrlFromRedirect } from "@/lib/utils";
import crypto from "node:crypto";
import AutoRedirect from "./redirect-client";

type SupabaseServerClient = Awaited<ReturnType<typeof getSupabaseServer>>;

export default async function RedirectPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const supabase = await getSupabaseServer();
  const { slug } = await params;
  const qs = await searchParams;

  // Only support /qr/redirect?url=...
  if (slug !== "redirect") notFound();

  const encodedUrl = first(qs.url);
  const querySlug  = first(qs.slug);
  if (!encodedUrl) return <ErrorBox title="Invalid QR code" />;

  // Decode with graceful fallback: base64url -> plain URL
  let targetUrl: string;
  try {
    targetUrl = normalizeUrl(decodeUrlFromRedirect(encodedUrl));
  } catch {
    try {
      targetUrl = normalizeUrl(encodedUrl); // fallback if param is already a URL
    } catch {
      return <ErrorBox title="Invalid QR code" />;
    }
  }

  // Try to resolve a qr_code row; if it fails we still redirect (skip tracking)
  const qrCodeId = await safeResolveQrCodeId({ supabase, slug: querySlug, targetUrl });

  // Only sign a token if we CAN track (qrCodeId + secret). If not, we still redirect.
  const trackAllowed = isAllowedTarget(targetUrl); // optional allow-list (edit or set to always true)
  const token = qrCodeId && process.env.QR_HMAC_SECRET && trackAllowed
    ? signToken({ qrCodeId, targetUrl })
    : null;

  return <AutoRedirect targetUrl={targetUrl} token={token} />;
}

/* ----------------------------- components ----------------------------- */

function ErrorBox({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="p-8 text-center">
      <div className="text-lg font-semibold text-red-600 mb-2">{title}</div>
      {subtitle && <div className="text-sm text-gray-600">{subtitle}</div>}
    </div>
  );
}

/* ------------------------------ helpers ------------------------------- */

async function safeResolveQrCodeId({
  supabase,
  slug,
  targetUrl,
}: {
  supabase: SupabaseServerClient;
  slug?: string | null;
  targetUrl: string;
}): Promise<string | null> {
  try {
    if (slug) {
      const { data, error } = await supabase
        .from("qr_codes")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      if (!error && data?.id) return data.id;
    }
    const { data, error } = await supabase
      .from("qr_codes")
      .select("id")
      .eq("target_url", targetUrl)
      .order("created_at", { ascending: false })
      .limit(1);
    if (!error && data?.[0]?.id) return data[0].id;
  } catch {
    // swallow — tracking is best-effort
  }
  return null;
}

function first(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

function normalizeUrl(u: string) {
  return new URL(u).toString(); // throws if invalid
}

/** Optional: only gate TRACKING, never the redirect. You can just `return true` to disable. */
function isAllowedTarget(urlStr: string): boolean {
  try {
    const u = new URL(urlStr);
    if (!["https:", "http:"].includes(u.protocol)) return false;
    const env = process.env.QR_ALLOWED_HOSTS; // e.g. "example.com,www.example.com"
    if (!env) return true; // allow all if not configured
    const allowed = new Set(env.split(",").map((s) => s.trim()).filter(Boolean));
    return allowed.size ? allowed.has(u.hostname) : true;
  } catch {
    return false;
  }
}

/** Short-lived HMAC token; if this fails, caller will just skip tracking. */
function signToken(payload: { qrCodeId: string; targetUrl: string }) {
  const secret = process.env.QR_HMAC_SECRET!;
  const iat = Date.now(); // ms epoch
  const blob = JSON.stringify({ ...payload, iat });
  const sig = crypto.createHmac("sha256", secret).update(blob).digest("base64url");
  return Buffer.from(JSON.stringify({ d: blob, s: sig }), "utf8").toString("base64url");
}
