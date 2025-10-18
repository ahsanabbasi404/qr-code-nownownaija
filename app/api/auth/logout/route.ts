import { NextResponse } from "next/server"
import { clearAuthSessionCookie } from "@/lib/auth"

export async function POST() {
  const response = NextResponse.json({ ok: true })
  clearAuthSessionCookie(response)
  return response
}
