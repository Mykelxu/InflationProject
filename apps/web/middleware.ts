import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const supabase = createMiddlewareClient({
    req: request,
    res: response,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });

  await supabase.auth.getSession();
  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api/baskets/:path*",
    "/api/ingest/:path*",
    "/api/search/:path*",
  ],
};
