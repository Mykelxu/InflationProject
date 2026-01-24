import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseRoute } from "@/lib/supabase/route";
import { seedStaplesHistory } from "@/lib/ingest/staples";

const payloadSchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
  locationId: z.string().min(1).default("atlanta-ga"),
  storeName: z.string().min(1).default("Kroger (Mock)")
});

export async function POST(request: Request) {
  const supabase = await supabaseRoute();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = payloadSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  await seedStaplesHistory(parsed.data);

  return NextResponse.json({ ok: true });
}
