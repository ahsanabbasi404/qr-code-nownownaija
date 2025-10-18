import { NextResponse } from "next/server"
import { getDisplayName, getSessionFromCookies } from "@/lib/auth"

export async function GET() {
  const authenticated = await getSessionFromCookies()
  if (!authenticated) {
    return NextResponse.json({ authenticated: false }, { status: 401 })
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      name: getDisplayName(),
    },
  })
}
