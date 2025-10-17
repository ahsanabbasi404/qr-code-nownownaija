"use client"

import type { RefObject } from "react"
import { QRCodeCanvas } from "qrcode.react"
interface QRPreviewProps {
  qrRef: RefObject<HTMLDivElement | null>
  qrValue: string
}

export default function QRPreview({ qrRef, qrValue }: QRPreviewProps) {
  return (
    <div className="mb-6 flex justify-center animate-in fade-in duration-300">
      <div ref={qrRef} className="p-6 bg-white rounded-lg shadow-md border border-border">
        <QRCodeCanvas
          value={qrValue}
          size={512}
          level="H"
          includeMargin={true}
          style={{ width: 256, height: 256 }}
        />
      </div>
    </div>
  )
}
