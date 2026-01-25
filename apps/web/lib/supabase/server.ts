import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export const supabaseServer = async () => {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
        set() {
          // Server Components are read-only for cookies.
        },
        remove() {
          // Server Components are read-only for cookies.
        },
      },
    }
  );
};
