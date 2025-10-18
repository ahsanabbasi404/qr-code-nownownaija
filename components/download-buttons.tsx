"use client"

import type { RefObject } from "react"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"

interface DownloadButtonsProps {
  qrRef: RefObject<HTMLDivElement>
  url: string
}

export default function DownloadButtons({ qrRef, url }: DownloadButtonsProps) {
  const downloadQRCode = (format: "png" | "svg") => {
    const svg = qrRef.current?.querySelector("svg") as SVGSVGElement | null
    if (!svg) {
      console.warn("QR download requested but no SVG element was found.", { url })
      return
    }

    const serializer = new XMLSerializer()
    const svgString = serializer.serializeToString(svg)
    const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" })

    if (format === "png") {
      const canvas = document.createElement("canvas")
      const scale = 8 // Increased scale for higher print quality
      const size = parseInt(svg.getAttribute("width") ?? "512", 10)
      const renderSize = Number.isFinite(size) ? size : 512
      canvas.width = renderSize * scale
      canvas.height = renderSize * scale
      const ctx = canvas.getContext("2d")

      if (!ctx) {
        console.warn("Unable to obtain canvas context for QR download.")
        return
      }

      // Set high quality rendering
      ctx.imageSmoothingEnabled = false
      // Disable image smoothing for crisp edges
      ;(ctx as any).webkitImageSmoothingEnabled = false
      ;(ctx as any).mozImageSmoothingEnabled = false
      ;(ctx as any).msImageSmoothingEnabled = false

      const img = new Image()
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        const link = document.createElement("a")
        link.href = canvas.toDataURL("image/png")
        link.download = `qr-code-${Date.now()}.png`
        link.click()
      }
      img.onerror = (err) => {
        console.error("Failed to render QR SVG for PNG download.", err)
      }
      const svgBase64 = window.btoa(unescape(encodeURIComponent(svgString)))
      img.src = `data:image/svg+xml;base64,${svgBase64}`
    } else if (format === "svg") {
      const link = document.createElement("a")
      const svgUrl = URL.createObjectURL(svgBlob)
      link.href = svgUrl
      link.download = `qr-code-${Date.now()}.svg`
      link.click()
      URL.revokeObjectURL(svgUrl)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Button
          onClick={() => downloadQRCode("png")}
          variant="outline"
          className="flex-1 gap-2 bg-white/90 text-slate-900 hover:bg-white"
          aria-label="Download QR code as PNG"
        >
          <Download className="w-4 h-4" />
          PNG
        </Button>
        <Button
          onClick={() => downloadQRCode("svg")}
          variant="outline"
          className="flex-1 gap-2 bg-white/90 text-slate-900 hover:bg-white"
          aria-label="Download QR code as SVG"
        >
          <Download className="w-4 h-4" />
          SVG
        </Button>
      </div>
      <p className="text-xs text-muted-foreground text-center">
        PNG: High-res for print | SVG: Editable vector for design handoffs
      </p>
    </div>
  )
}

