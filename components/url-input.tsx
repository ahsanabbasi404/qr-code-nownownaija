"use client"

import type React from "react"

import { Input } from "@/components/ui/input"

interface URLInputProps {
  url: string
  onUrlChange: (url: string) => void
  onKeyPress: (e: React.KeyboardEvent) => void
  error: string
}

export default function URLInput({ url, onUrlChange, onKeyPress, error }: URLInputProps) {
  return (
    <div className="mb-6">
      <label className="block text-sm font-medium text-foreground mb-2">Website URL</label>
      <Input
        type="url"
        placeholder="https://example.com"
        value={url}
        onChange={(e) => onUrlChange(e.target.value)}
        onKeyPress={onKeyPress}
        className={`w-full ${error ? "border-destructive" : ""}`}
        aria-label="Website URL input"
      />
      {error && (
        <p className="text-destructive text-sm mt-2" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
