import { type NextRequest, NextResponse } from "next/server"

export function middleware(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "")
  const pathname = request.nextUrl.pathname

  // Protect /app routes
  if (pathname.startsWith("/app")) {
    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/app/:path*"],
}
