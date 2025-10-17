import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { getSupabaseServer } from "@/lib/supabase-server"
import { decodeUrlFromRedirect } from "@/lib/utils"

type SupabaseServerClient = Awaited<ReturnType<typeof getSupabaseServer>>

export default async function RedirectPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const supabase = await getSupabaseServer()
  const resolvedParams = await params
  const resolvedSearchParams = await searchParams
  const slug = resolvedParams.slug
  const urlParam = resolvedSearchParams.url
  const querySlug = getFirstParam(resolvedSearchParams.slug)
  const requestHeaders = await headers()
  const userAgent = requestHeaders.get("user-agent") ?? null
  const ipAddress = getClientIp(requestHeaders)

  try {
    // Handle URL-encoded redirect with query parameter (new format)
    if (slug === "redirect") {
      const encodedUrl = getFirstParam(urlParam)

      if (!encodedUrl) {
        return <div className="p-8 text-center">Invalid QR code</div>
      }

      try {
        // Decode the base64url encoded URL directly (no double decoding needed)
        const targetUrl = decodeUrlFromRedirect(encodedUrl)

        // Validate that it's a proper URL before redirecting
        new URL(targetUrl)

        const qrCodeId = await resolveQrCodeId({
          supabase,
          slug: querySlug,
          targetUrl,
        })

        if (qrCodeId) {
          await recordScan(supabase, { qrCodeId, userAgent, ipAddress })
        } else {
          console.warn("Unable to resolve QR code record for redirect request.", {
            querySlug,
            targetUrl,
          })
        }

        redirect(targetUrl)
      } catch (error) {
        // Check if this is a Next.js redirect (which is normal)
        if (isNextRedirectError(error)) {
          // This is normal Next.js redirect behavior, re-throw it
          throw error
        }
        
        // This is a real decode error
        console.error("Failed to decode redirect URL:", error)
        return <div className="p-8 text-center">
          <div className="text-lg font-semibold text-red-600 mb-2">Invalid QR Code</div>
          <div className="text-sm text-gray-600">
            Unable to decode the redirect URL. Please check if the QR code is valid.
          </div>
        </div>
      }
    } else if (slug.startsWith("u/")) {
      // Handle legacy URL-encoded redirect with path segment (old new format)
      const encodedUrl = slug.substring(2) // Remove 'u/' prefix

      try {
        const targetUrl = decodeUrlFromRedirect(encodedUrl)
        // Validate that it's a proper URL before redirecting
        new URL(targetUrl)

        const qrCodeId = await resolveQrCodeId({
          supabase,
          targetUrl,
        })

        if (qrCodeId) {
          await recordScan(supabase, { qrCodeId, userAgent, ipAddress })
        } else {
          console.warn("Unable to resolve QR code record for legacy encoded redirect.", {
            targetUrl,
          })
        }

        redirect(targetUrl)
      } catch (error) {
        // Check if this is a Next.js redirect (which is normal)
        if (isNextRedirectError(error)) {
          // This is normal Next.js redirect behavior, re-throw it
          throw error
        }
        
        // This is a real decode error
        console.error("Failed to decode redirect URL:", error)
        return <div className="p-8 text-center">Invalid QR code</div>
      }
    } else {
      // Handle legacy slug-based redirect (requires database lookup)
      const { data: qrCode, error: fetchError } = await supabase
        .from("qr_codes")
        .select("id, target_url")
        .eq("slug", slug)
        .single()

      if (fetchError || !qrCode) {
        return <div className="p-8 text-center">
          <div className="text-lg font-semibold text-red-600 mb-2">QR Code Not Found</div>
          <div className="text-sm text-gray-600">
            This QR code may have expired or been removed.
          </div>
        </div>
      }

      // Record the scan for analytics
      await recordScan(supabase, { qrCodeId: qrCode.id, userAgent, ipAddress })

      // Redirect to target URL
      redirect(qrCode.target_url)
    }
  } catch (error) {
    if (isNextRedirectError(error)) {
      throw error
    }

    console.error("Redirect error:", error)
    return <div className="p-8 text-center">
      <div className="text-lg font-semibold text-red-600 mb-2">Service Unavailable</div>
      <div className="text-sm text-gray-600">
        Unable to process the QR code at this time. Please try again later.
      </div>
    </div>
  }
}

async function recordScan(
  supabase: SupabaseServerClient,
  {
    qrCodeId,
    userAgent,
    ipAddress,
  }: {
    qrCodeId: string
    userAgent: string | null
    ipAddress: string | null
  }
) {
  const { error } = await supabase.from("qr_scans").insert({
    qr_code_id: qrCodeId,
    user_agent: userAgent,
    ip_address: ipAddress,
  })

  if (error) {
    console.warn("Failed to record scan:", error)
  }
}

async function resolveQrCodeId({
  supabase,
  slug,
  targetUrl,
}: {
  supabase: SupabaseServerClient
  slug?: string | null
  targetUrl: string
}): Promise<string | null> {
  if (slug) {
    const { data, error } = await supabase
      .from("qr_codes")
      .select("id")
      .eq("slug", slug)
      .maybeSingle()

    if (error) {
      console.warn("Failed to resolve QR code by slug:", error)
    }

    if (data?.id) {
      return data.id
    }
  }

  const { data, error } = await supabase
    .from("qr_codes")
    .select("id")
    .eq("target_url", targetUrl)
    .order("created_at", { ascending: false })
    .limit(1)

  if (error) {
    console.warn("Failed to resolve QR code by target URL:", error)
    return null
  }

  return data?.[0]?.id ?? null
}

function getFirstParam(value: string | string[] | undefined): string | undefined {
  if (!value) {
    return undefined
  }

  return Array.isArray(value) ? value[0] : value
}

function getClientIp(headerStore: Awaited<ReturnType<typeof headers>>): string | null {
  const forwardedFor = headerStore.get("x-forwarded-for")
  if (forwardedFor) {
    const [first] = forwardedFor.split(",")
    if (first?.trim()) {
      return first.trim()
    }
  }

  const realIp = headerStore.get("x-real-ip")
  if (realIp) {
    return realIp
  }

  return null
}

function isNextRedirectError(error: unknown): error is Error & { digest?: string } {
  if (!(error instanceof Error)) {
    return false
  }

  if (error.message === "NEXT_REDIRECT") {
    return true
  }

  if (typeof (error as { digest?: string }).digest === "string") {
    return (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  }

  return false
}
