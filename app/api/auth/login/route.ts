import { NextResponse } from "next/server"
import { setAuthSessionCookie, verifyCredentials } from "@/lib/auth"

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json()

    if (typeof username !== "string" || typeof password !== "string") {
      return NextResponse.json({ message: "Invalid payload" }, { status: 400 })
    }

    const isValid = verifyCredentials(username, password)
    if (!isValid) {
      return NextResponse.json({ message: "Invalid credentials" }, { status: 401 })
    }

    const response = NextResponse.json({ ok: true })
    setAuthSessionCookie(response)
    return response
  } catch (error) {
    return NextResponse.json({ message: "Unable to process request" }, { status: 400 })
  }
}
