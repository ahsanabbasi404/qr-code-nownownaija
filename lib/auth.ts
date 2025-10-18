import crypto from "node:crypto"
import { cookies } from "next/headers"
import type { NextResponse } from "next/server"

const COOKIE_NAME = "qr_admin_session"
const DEFAULT_COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

function getAuthConfig() {
  const username = process.env.ADMIN_USERNAME ?? "admin"
  const password = process.env.ADMIN_PASSWORD ?? "password"
  const secret =
    process.env.AUTH_SESSION_SECRET ??
    process.env.QR_HMAC_SECRET ??
    "please-change-this-secret"

  return { username, password, secret }
}

function computeSessionSignature(username: string, password: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(`${username}:${password}`).digest("base64url")
}

export function verifyCredentials(inputUsername: string, inputPassword: string) {
  const { username, password } = getAuthConfig()
  const expectedBuffer = Buffer.from(`${username}:${password}`)
  const actualBuffer = Buffer.from(`${inputUsername}:${inputPassword}`)

  if (expectedBuffer.length !== actualBuffer.length) {
    return false
  }

  return crypto.timingSafeEqual(expectedBuffer, actualBuffer)
}

export function getExpectedSessionValue() {
  const { username, password, secret } = getAuthConfig()
  return computeSessionSignature(username, password, secret)
}

export function validateSessionCookie(cookieValue?: string | null) {
  if (!cookieValue) return false
  const expected = getExpectedSessionValue()
  const expectedBuffer = Buffer.from(expected)
  const actualBuffer = Buffer.from(cookieValue)
  if (expectedBuffer.length !== actualBuffer.length) {
    return false
  }
  return crypto.timingSafeEqual(expectedBuffer, actualBuffer)
}

export async function ensureAuthenticatedOrThrow() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get(COOKIE_NAME)?.value
  if (!validateSessionCookie(sessionCookie)) {
    throw new Error("Unauthorized")
  }
}

export function setAuthSessionCookie(response: NextResponse) {
  const value = getExpectedSessionValue()
  response.cookies.set({
    name: COOKIE_NAME,
    value,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: DEFAULT_COOKIE_MAX_AGE,
  })
}

export function clearAuthSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: COOKIE_NAME,
    value: "",
    path: "/",
    maxAge: 0,
  })
}

export async function getSessionFromCookies() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get(COOKIE_NAME)?.value
  return validateSessionCookie(sessionCookie)
}

export function getDisplayName() {
  const username = process.env.ADMIN_DISPLAY_NAME ?? process.env.ADMIN_USERNAME ?? "Admin"
  return username
}

export const AUTH_COOKIE_NAME = COOKIE_NAME
