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
    const canvas = qrRef.current?.querySelector("canvas") as HTMLCanvasElement
    if (!canvas) return

    // TODO: Future feature - Log download analytics
    // trackQRDownload({ url, format, timestamp: new Date() })

    if (format === "png") {
      const link = document.createElement("a")
      link.href = canvas.toDataURL("image/png")
      link.download = `qr-code-${Date.now()}.png`
      link.click()
    } else if (format === "svg") {
      // Convert canvas to SVG
      const link = document.createElement("a")
      const svgData = `
        <svg xmlns="http://www.w3.org/2000/svg" width="256" height="256">
          <image href="${canvas.toDataURL("image/png")}" width="256" height="256"/>
        </svg>
      `
      const blob = new Blob([svgData], { type: "image/svg+xml" })
      const svgUrl = URL.createObjectURL(blob)
      link.href = svgUrl
      link.download = `qr-code-${Date.now()}.svg`
      link.click()
      URL.revokeObjectURL(svgUrl)
    }
  }

  return (
    <div className="flex gap-3">
      <Button
        onClick={() => downloadQRCode("png")}
        variant="outline"
        className="flex-1 gap-2"
        aria-label="Download QR code as PNG"
      >
        <Download className="w-4 h-4" />
        PNG
      </Button>
      <Button
        onClick={() => downloadQRCode("svg")}
        variant="outline"
        className="flex-1 gap-2"
        aria-label="Download QR code as SVG"
      >
        <Download className="w-4 h-4" />
        SVG
      </Button>
    </div>
  )
}
