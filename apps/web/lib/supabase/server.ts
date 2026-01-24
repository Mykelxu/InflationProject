import { cookies } from "next/headers";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";

export const supabaseServer = () =>
  createServerComponentClient({
    cookies: async () => {
      const cookieStore = await cookies();
      return cookieStore;
    },
  });
