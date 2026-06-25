import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

const RATE_LIMIT = parseInt(process.env.RATE_LIMIT || "60", 10)
const RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || "60000", 10)

function getIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) return forwarded.split(",")[0].trim()
  return request.headers.get("x-real-ip") || "127.0.0.1"
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return true
  }

  if (entry.count >= RATE_LIMIT) {
    return false
  }

  entry.count++
  return true
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next()
  }

  if (pathname.startsWith("/api")) {
    const ip = getIp(request)
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: { code: "RATE_LIMITED", message: "Too Many Requests" } },
        { status: 429 },
      )
    }

    if (request.method === "OPTIONS") {
      return new NextResponse(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Access-Control-Max-Age": "600",
        },
      })
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: "/api/:path*",
}
