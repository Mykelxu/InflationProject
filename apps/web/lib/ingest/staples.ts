import { prisma } from "@/lib/prisma";
import { stapleItems } from "@/lib/ingest/staplesList";

const basePrices: Record<string, number> = {
  "whole milk": 489,
  eggs: 329,
  bread: 279,
  butter: 449,
  "chicken breast": 499,
  rice: 399,
  flour: 349,
  sugar: 319,
  pasta: 229,
  cereal: 459,
  coffee: 899,
  apples: 199,
  bananas: 159,
  lettuce: 189,
  potatoes: 499,
  onions: 349,
  "ground beef": 549,
  "cheddar cheese": 399,
  yogurt: 429,
  "peanut butter": 379,
};

export async function seedStaplesHistory({
  locationId,
  storeName,
  days,
}: {
  locationId: string;
  storeName: string;
  days: number;
}) {
  const now = new Date();
  const dailyTotals: Record<string, number> = {};

  for (const staple of stapleItems) {
    const existing = await prisma.item.findFirst({
      where: { name: staple.label, unit: staple.unit },
    });
    const item = existing
      ? await prisma.item.update({
          where: { id: existing.id },
          data: {
            isTracked: true,
            searchTerm: staple.term,
            category: staple.category,
          },
        })
      : await prisma.item.create({
          data: {
            name: staple.label,
            category: staple.category,
            unit: staple.unit,
            isTracked: true,
            searchTerm: staple.term,
          },
        });

    for (let i = days; i >= 0; i -= 1) {
      const capturedAt = new Date(now);
      capturedAt.setDate(now.getDate() - i);
      const dayKey = capturedAt.toISOString().slice(0, 10);
      const basePrice = basePrices[staple.term] ?? 399;
      const drift = Math.round((Math.random() - 0.45) * 40);
      const priceCents = Math.max(99, basePrice + drift);

      dailyTotals[dayKey] = (dailyTotals[dayKey] ?? 0) + priceCents;

      await prisma.priceSnapshot.create({
        data: {
          itemId: item.id,
          locationId,
          storeName,
          priceCents,
          currency: "USD",
          capturedAt,
          source: "mock",
          rawJson: { generator: "seedStaplesHistory" },
        },
      });
    }
  }

  const entries = Object.entries(dailyTotals);
  for (const [dayKey, totalCents] of entries) {
    await prisma.cpiBasketSnapshot.create({
      data: {
        capturedAt: new Date(`${dayKey}T12:00:00.000Z`),
        totalCents,
        currency: "USD",
        locationId,
        storeName,
        source: "mock",
      },
    });
  }
}
