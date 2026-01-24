import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseRoute } from "@/lib/supabase/route";
import { prisma } from "@/lib/prisma";

const basketSchema = z.object({
  name: z.string().min(1).optional(),
});

export async function GET() {
  const supabase = await supabaseRoute();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const baskets = await prisma.basket.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      items: {
        include: { item: true },
      },
    },
  });

  return NextResponse.json(baskets);
}

export async function POST(request: Request) {
  const supabase = await supabaseRoute();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = basketSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const basket = await prisma.basket.create({
    data: {
      userId: user.id,
      name: parsed.data.name ?? "My Basket",
    },
  });

  return NextResponse.json(basket, { status: 201 });
}
