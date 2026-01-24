import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export const supabaseBrowser = () =>
  createClientComponentClient({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
