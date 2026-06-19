import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // Redirect authenticated users trying to access landing page or login pages
    if (token) {
      const role = token.role;
      if (path === "/admin/login" || path === "/delivery/login" || path === "/login" || path === "/") {
        if (role === "ADMIN") {
          return NextResponse.redirect(new URL("/admin", req.url));
        } else if (role === "DELIVERY") {
          return NextResponse.redirect(new URL("/delivery/orders", req.url));
        } else if (role === "CUSTOMER") {
          if (token.firstLogin) {
            return NextResponse.redirect(new URL("/user/profile?firstLogin=true", req.url));
          }
          return NextResponse.redirect(new URL("/user/order/new", req.url));
        }
      }
    }

    // Allow public pages/login screens to pass through when not authenticated
    if (path === "/admin/login" || path === "/delivery/login" || path === "/login" || path === "/") {
      return NextResponse.next();
    }

    if (!token) {
      if (path.startsWith("/admin")) {
        return NextResponse.redirect(new URL("/admin/login", req.url));
      } else if (path.startsWith("/delivery")) {
        return NextResponse.redirect(new URL("/delivery/login", req.url));
      } else if (path.startsWith("/user")) {
        return NextResponse.redirect(new URL("/login", req.url));
      }
      return NextResponse.next();
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
  matcher: ["/", "/login", "/user/:path*", "/admin/:path*", "/delivery/:path*"],
};
