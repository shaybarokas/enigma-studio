import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Keeps the Supabase session fresh and keeps the studio behind sign-in.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  // app.<domain> is the studio itself.
  if (pathname === "/" && request.headers.get("host")?.startsWith("app.")) {
    const url = request.nextUrl.clone();
    url.pathname = user ? "/studio" : "/login";
    return NextResponse.redirect(url);
  }
  // The return from PayPlus may be a cross-site POST without cookies: it only confirms the order.
  if (!user && pathname.startsWith("/studio") && pathname !== "/studio/billing/return") {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }
  if (user && (pathname === "/login" || pathname === "/signup")) {
    const url = request.nextUrl.clone();
    url.pathname = "/studio";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: ["/", "/studio/:path*", "/login", "/signup", "/forgot", "/reset", "/auth/:path*", "/api/:path*"],
};
