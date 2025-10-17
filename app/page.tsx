"use client"

import React, { useMemo, useState, RefObject } from "react"
import QRGenerator from "@/components/qr-generator"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { QRCodeSVG } from "qrcode.react"
import DownloadButtons from "@/components/download-buttons"
import { encodeUrlForRedirect } from "@/lib/utils"

export default function Home() {
  const [view, setView] = useState<"generator" | "dashboard">("generator")
  const [supabaseError, setSupabaseError] = useState<string | null>(null)

  React.useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      setSupabaseError(
        "Supabase is not configured. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables in your Vercel project settings.",
      )
    }
  }, [])

  return (
    <main className="min-h-screen bg-gradient-to-br from-background to-secondary/20 flex flex-col items-center justify-center p-4">
      {supabaseError && (
        <Alert className="mb-8 max-w-2xl border-red-200 bg-red-50">
          <AlertDescription className="text-red-800">{supabaseError}</AlertDescription>
        </Alert>
      )}

      {/* Navigation */}
      <div className="mb-8 flex gap-4">
        <Button variant={view === "generator" ? "default" : "outline"} onClick={() => setView("generator")}>
          Generator
        </Button>
        <Button
          variant={view === "dashboard" ? "default" : "outline"}
          onClick={() => setView("dashboard")}
          disabled={!!supabaseError}
        >
          Dashboard
        </Button>
      </div>

      {/* Content */}
      {view === "generator" ? (
        <QRGenerator />
      ) : (
        <div className="w-full max-w-4xl">
          <DashboardContent supabaseError={supabaseError} />
        </div>
      )}
    </main>
  )
}

function DashboardContent({ supabaseError }: { supabaseError: string | null }) {
  const [qrCodes, setQrCodes] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const redirectBase = useMemo(() => getRedirectBase(), [])

  React.useEffect(() => {
    if (!supabaseError) {
      loadQRCodes()
    } else {
      setIsLoading(false)
    }
  }, [supabaseError])

  const loadQRCodes = async () => {
    try {
      const { getSupabaseClient } = await import("@/lib/supabase-client")
      const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from("qr_codes")
    .select(
      `
      id,
      slug,
      target_url,
      base_url,
      created_at,
      qr_scans(count)
    `,
    )
    .order("created_at", { ascending: false })

      if (error) throw error

      setQrCodes(data || [])
    } catch (err) {
      console.error("Failed to load QR codes:", err)
    } finally {
      setIsLoading(false)
    }
  }

  if (supabaseError) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertDescription className="text-red-800">{supabaseError}</AlertDescription>
      </Alert>
    )
  }

  if (isLoading) {
    return <div className="text-center text-muted-foreground">Loading your QR codes from database...</div>
  }

  if (qrCodes.length === 0) {
    return (
      <div className="text-center text-muted-foreground">No QR codes generated yet. Create one to get started!</div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-foreground mb-6">Your QR Codes</h2>
      <div className="grid gap-4">
        {qrCodes.map((qr: any) => (
          <DashboardQRCodeCard key={qr.id} qr={qr} redirectBase={redirectBase} />
        ))}
      </div>
    </div>
  )
}

function DashboardQRCodeCard({
  qr,
  redirectBase,
}: {
  qr: {
    id: string
    slug: string
    target_url: string
    base_url?: string
    created_at: string
    qr_scans?: { count: number }[]
  }
  redirectBase: string
}) {
  const qrRef = React.useRef<HTMLDivElement>(null)
  const redirectUrl = React.useMemo(() => {
    // Use the stored base_url from database, fallback to redirectBase
    const baseUrl = qr.base_url || redirectBase
    return buildRedirectUrl(qr.target_url, qr.slug, baseUrl)
  }, [qr.target_url, qr.slug, qr.base_url, redirectBase])
  const scanCount = qr.qr_scans?.[0]?.count ?? 0

  return (
    <div className="p-4 border border-border rounded-lg bg-card hover:bg-secondary/50 transition-colors">
      <div className="flex flex-col md:flex-row md:items-start gap-6">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-muted-foreground mb-1">Target URL:</p>
          <p className="text-sm font-mono text-foreground break-all mb-2">{qr.target_url}</p>
          <p className="text-sm text-muted-foreground mb-1">Base URL:</p>
          <p className="text-sm font-mono text-foreground break-all mb-2">{qr.base_url || 'Default (from environment)'}</p>
          <p className="text-sm text-muted-foreground mb-1">QR Code URL (use this in your QR code):</p>
          <a
            href={redirectUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-mono text-blue-600 break-all mb-3 block underline-offset-2 hover:underline"
          >
            {redirectUrl}
          </a>
          <p className="text-xs text-muted-foreground">
            Created: {new Date(qr.created_at).toLocaleDateString()}
          </p>
        </div>
        <div className="flex flex-col items-center md:w-64 gap-3">
          <div
            ref={qrRef}
            className="p-4 bg-white rounded-lg border border-border shadow-sm"
            aria-label="QR code preview"
          >
            <QRCodeSVG
              value={redirectUrl}
              size={512}
              level="H"
              includeMargin={true}
              bgColor="#ffffff"
              fgColor="#000000"
              style={{ 
                width: 256, 
                height: 256, 
                imageRendering: "crisp-edges" 
              }}
            />
          </div>
          <DownloadButtons qrRef={qrRef as RefObject<HTMLDivElement>} url={redirectUrl} />
          <div className="text-center">
            <p className="text-3xl font-bold text-foreground leading-none">{scanCount}</p>
            <p className="text-xs text-muted-foreground">scans</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function getRedirectBase(): string {
  const fromEnv = process.env.NEXT_PUBLIC_URL?.trim() ?? ""
  const normalized = fromEnv.replace(/\/+$/, "")
  return normalized || "https://qr.nownownaija.com"
}

function buildRedirectUrl(targetUrl: string, slug: string, base: string): string {
  const encodedTarget = encodeUrlForRedirect(targetUrl)
  const normalizedBase = base.replace(/\/+$/, "")
  return `${normalizedBase}/r/redirect?slug=${encodeURIComponent(slug)}&url=${encodedTarget}`
}
