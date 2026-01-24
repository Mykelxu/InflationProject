import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export const supabaseRoute = () =>
  createRouteHandlerClient({
    cookies: async () => {
      const cookieStore = await cookies();
      return cookieStore;
    },
  });
