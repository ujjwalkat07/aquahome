import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // Allow public login screens to pass through
    if (path === "/admin/login" || path === "/delivery/login" || path === "/login") {
      return NextResponse.next();
    }

    if (!token) {
      if (path.startsWith("/admin")) {
        return NextResponse.redirect(new URL("/admin/login", req.url));
      } else if (path.startsWith("/delivery")) {
        return NextResponse.redirect(new URL("/delivery/login", req.url));
      } else {
        return NextResponse.redirect(new URL("/login", req.url));
      }
    }

    const role = token.role;

    if (path.startsWith("/admin") && role !== "ADMIN") {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }
    if (path.startsWith("/user") && role !== "CUSTOMER") {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    if (path.startsWith("/delivery") && role !== "DELIVERY") {
      return NextResponse.redirect(new URL("/delivery/login", req.url));
    }

    // Force customer to change password on first login
    if (role === "CUSTOMER" && token.firstLogin && path !== "/user/profile") {
      return NextResponse.redirect(new URL("/user/profile?firstLogin=true", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: () => true,
    },
  }
);

export const config = {
  matcher: ["/user/:path*", "/admin/:path*", "/delivery/:path*"],
};
