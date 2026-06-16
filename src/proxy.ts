import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/infrastructure/auth";

export async function proxy(request: NextRequest) {
  const session = await auth();

  const { pathname } = request.nextUrl;

  // Allow auth-related paths through
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/auth")
  ) {
    return NextResponse.next();
  }

  // Redirect unauthenticated users to login
  if (!session) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
