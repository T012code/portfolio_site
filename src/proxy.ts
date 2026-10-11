import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Refreshes the Supabase session cookie on admin requests and sends signed-out
// visitors to the login page. Authorisation itself is enforced again on the server
// (requireAdmin) and in the database (row-level security).
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
        },
      },
    },
  );

  const { data } = await supabase.auth.getClaims();
  const isLogin = request.nextUrl.pathname.startsWith("/admin/login");

  if (!data?.claims && !isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = "";
    const redirect = NextResponse.redirect(url);
    for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
    return redirect;
  }

  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};
