import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(
          name: string,
          value: string,
          options?: {
            path?: string;
            domain?: string;
            maxAge?: number;
            expires?: Date;
            secure?: boolean;
            httpOnly?: boolean;
            sameSite?: "lax" | "strict" | "none";
          }
        ) {
          response.cookies.set({ name, value, ...options });
        },
        remove(
          name: string,
          options?: {
            path?: string;
            domain?: string;
            maxAge?: number;
            expires?: Date;
            secure?: boolean;
            httpOnly?: boolean;
            sameSite?: "lax" | "strict" | "none";
          }
        ) {
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  await supabase.auth.getUser();
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
