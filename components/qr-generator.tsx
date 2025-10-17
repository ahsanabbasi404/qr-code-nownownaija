"use client"

import type React from "react"

import { useState, useRef, RefObject } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import URLInput from "./url-input"
import QRPreview from "./qr-preview"
import DownloadButtons from "./download-buttons"
import { getSupabaseClient } from "@/lib/supabase-client"
import { generateSlug, encodeUrlForRedirect } from "@/lib/utils"

export default function QRGenerator() {
  const [url, setUrl] = useState("")
  const [qrValue, setQrValue] = useState("")
  const [outputUrl, setOutputUrl] = useState("")
  const [redirectBase, setRedirectBase] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [baseError, setBaseError] = useState("")
  const qrRef = useRef<HTMLDivElement>(null)

  const isValidUrl = (urlString: string): boolean => {
    try {
      new URL(urlString)
      return true
    } catch {
      return false
    }
  }

  const handleGenerate = async () => {
    setError("")
    setBaseError("")
    setOutputUrl("")
    setQrValue("")

    if (!url.trim()) {
      setError("Please enter a URL")
      return
    }

    if (!isValidUrl(url)) {
      setError("Please enter a valid URL (e.g., https://example.com)")
      return
    }

    const providedBase = redirectBase.trim()
    if (providedBase && !isValidUrl(providedBase)) {
      setBaseError("Please enter a valid redirect base URL (e.g., https://qr.yourdomain.com)")
      return
    }

    setIsLoading(true)
    try {
      const supabase = getSupabaseClient()
      const slug = generateSlug()
      const encodedUrl = encodeUrlForRedirect(url)

      const fallbackBase = process.env.NEXT_PUBLIC_URL?.trim() ?? ""
      const resolvedBase = providedBase || fallbackBase

      if (!resolvedBase) {
        setBaseError("No redirect base URL configured. Provide one above or set NEXT_PUBLIC_URL.")
        return
      }

      const normalizedBase = resolvedBase.replace(/\/+$/, "")
      const redirectUrl = `${normalizedBase}/r/redirect?slug=${encodeURIComponent(slug)}&url=${encodedUrl}`

      // Store QR code in Supabase (for analytics)
      // Note: We still store the slug for potential future use and analytics
      const { error: dbError } = await supabase.from("qr_codes").insert({
        slug,
        target_url: url,
      })

      if (dbError) {
        // If database fails, we can still generate the QR code
        // The redirect will work even without database storage
        console.warn("Database storage failed, but QR code generation continues:", dbError)
        setError("QR code generated but couldn't be saved to database for analytics. The QR code will still work.")
      }

      // Generate QR code for redirect URL (works even if DB is down)
      setQrValue(redirectUrl)
      setOutputUrl(redirectUrl)
    } catch (err) {
      setError("An error occurred. Please try again.")
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleGenerate()
    }
  }

  return (
    <div className="w-full max-w-md">
      <Card className="p-8 shadow-lg">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-foreground mb-2">QR Code Generator</h1>
          <p className="text-muted-foreground text-sm">Convert any URL into a trackable QR code with analytics</p>
        </div>

        {/* Input Section */}
        <URLInput url={url} onUrlChange={setUrl} onKeyPress={handleKeyPress} error={error} />

        {/* Redirect Base Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-foreground mb-2">
            Redirect Base URL (optional)
          </label>
          <Input
            type="url"
            placeholder={process.env.NEXT_PUBLIC_URL ?? "https://qr.nownownaija.com"}
            value={redirectBase}
            onChange={(e) => setRedirectBase(e.target.value)}
            aria-label="Redirect base URL input"
          />
          <p className="text-xs text-muted-foreground mt-2">
            Leave blank to use the default environment URL.
          </p>
          {baseError && (
            <p className="text-destructive text-sm mt-2" role="alert">
              {baseError}
            </p>
          )}
        </div>

        {/* Generate Button */}
        <Button onClick={handleGenerate} disabled={isLoading} className="w-full mb-6 h-10 font-medium">
          {isLoading ? "Generating..." : "Generate QR Code"}
        </Button>

        {/* Output URL Display */}
        {outputUrl && (
          <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <p className="text-xs text-green-700 font-medium">QR Code Generated Successfully</p>
            </div>
            <p className="text-xs text-green-600 mb-2">Your QR code has been created and saved to the database.</p>
            <p className="text-xs text-muted-foreground mb-2">QR Code URL:</p>
            <p className="text-sm font-mono text-foreground break-all">{outputUrl}</p>
          </div>
        )}

        {/* QR Preview Section */}
        {qrValue && <QRPreview qrRef={qrRef} qrValue={qrValue} />}

        {/* Download Buttons */}
        {qrValue && <DownloadButtons qrRef={qrRef as RefObject<HTMLDivElement>} url={url} />}

        {/* Info Text */}
        {!qrValue && (
          <div className="text-center text-xs text-muted-foreground mt-6">
            Enter a URL and click generate to create your trackable QR code
          </div>
        )}
      </Card>
    </div>
  )
}
