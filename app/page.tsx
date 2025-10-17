"use client"

import React from "react"
import { useState } from "react"
import QRGenerator from "@/components/qr-generator"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"

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
          <div
            key={qr.id}
            className="p-4 border border-border rounded-lg bg-card hover:bg-secondary/50 transition-colors"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground mb-1">Target URL:</p>
                <p className="text-sm font-mono text-foreground break-all mb-2">{qr.target_url}</p>
                <p className="text-sm text-muted-foreground mb-1">QR Code URL (use this in your QR code):</p>
                <p className="text-sm font-mono text-blue-600 break-all mb-3">{`${process.env.NEXT_PUBLIC_URL || 'https://qr.nownownaija.com'}/r/${qr.slug}`}</p>
                <p className="text-xs text-muted-foreground">Created: {new Date(qr.created_at).toLocaleDateString()}</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-foreground">{qr.qr_scans?.[0]?.count || 0}</p>
                <p className="text-xs text-muted-foreground">scans</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
