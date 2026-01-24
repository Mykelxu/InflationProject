import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { supabaseRoute } from "@/lib/supabase/route";
import { prisma } from "@/lib/prisma";

const basketItemSchema = z.object({
  itemId: z.string().min(1),
  quantity: z.coerce.number().int().positive().default(1),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const supabase = await supabaseRoute();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: basketId } = await context.params;
  const body = await request.json();
  const parsed = basketItemSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const basket = await prisma.basket.findFirst({
    where: { id: basketId, userId: user.id },
  });

  if (!basket) {
    return NextResponse.json({ error: "Basket not found" }, { status: 404 });
  }

  const basketItem = await prisma.basketItem.upsert({
    where: {
      basketId_itemId: {
        basketId,
        itemId: parsed.data.itemId,
      },
    },
    create: {
      basketId,
      itemId: parsed.data.itemId,
      quantity: parsed.data.quantity,
    },
    update: {
      quantity: parsed.data.quantity,
    },
  });

  return NextResponse.json(basketItem, { status: 201 });
}
