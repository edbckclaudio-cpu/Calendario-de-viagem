import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  // Permite assets e home
  if (pathname.startsWith("/_next") || pathname.startsWith("/api") || pathname === "/" || pathname.startsWith("/favicon") || pathname.startsWith("/.well-known")) {
    return NextResponse.next();
  }
  const authCookie = req.cookies.get("traeAuth");
  if (!authCookie || !authCookie.value) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: "/:path*",
};