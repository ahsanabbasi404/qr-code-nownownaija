import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateSlug(): string {
  return Math.random().toString(36).substring(2, 8)
}

/***/
export function encodeUrlForRedirect(url: string): string {
  try {
    // Convert URL to base64, making it URL-safe
    const base64 = btoa(encodeURIComponent(url))
    const urlSafeBase64 = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')

    // For query parameters, we can use longer URLs since they're not path segments
    return urlSafeBase64
  } catch (error) {
    console.error('Failed to encode URL for redirect:', error)
    // Fallback to a simple hash if encoding fails
    return btoa(url).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  }
}

/**
 * Decodes a URL that was encoded for redirect use
 */
export function decodeUrlFromRedirect(encodedUrl: string): string {
  try {
    // Add padding if needed for base64url decoding
    const padded = encodedUrl + '='.repeat((4 - encodedUrl.length % 4) % 4)

    // Convert from URL-safe base64 back to regular base64
    const base64 = padded.replace(/-/g, '+').replace(/_/g, '/')
    const decoded = decodeURIComponent(atob(base64))

    return decoded
  } catch (error) {
    console.error('Failed to decode URL from redirect:', error)
    throw new Error('Invalid redirect URL')
  }
}

/**
 * Checks if a path segment is a URL-encoded redirect (starts with 'u/')
 */
export function isUrlEncodedRedirect(path: string): boolean {
  return path.startsWith('u/')
}

/**
 * Extracts the encoded URL from a URL-encoded redirect path
 */
export function extractEncodedUrl(path: string): string {
  if (!isUrlEncodedRedirect(path)) {
    return path
  }
  return path.substring(2) // Remove 'u/' prefix
}
