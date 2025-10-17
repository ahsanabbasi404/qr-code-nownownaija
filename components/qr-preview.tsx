"use client"

import type { RefObject } from "react"
import { QRCodeSVG } from "qrcode.react"
interface QRPreviewProps {
  qrRef: RefObject<HTMLDivElement | null>
  qrValue: string
}

export default function QRPreview({ qrRef, qrValue }: QRPreviewProps) {
  return (
    <div className="mb-6 flex justify-center animate-in fade-in duration-300">
      <div ref={qrRef} className="p-6 bg-white rounded-lg shadow-md border border-border">
        <QRCodeSVG
          value={qrValue}
          size={512}
          level="H"
          includeMargin={true}
          bgColor="#ffffff"
          fgColor="#000000"
          style={{ 
            imageRendering: "crisp-edges",
            width: "512px",
            height: "512px"
          }}
        />
      </div>
    </div>
  )
}
