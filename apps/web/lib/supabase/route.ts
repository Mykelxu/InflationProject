import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export const supabaseRoute = async () => {
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
          // Route handlers only need read access here.
        },
        remove() {
          // Route handlers only need read access here.
        },
      },
    }
  );
};
