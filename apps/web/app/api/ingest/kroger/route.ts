import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseRoute } from "@/lib/supabase/route";
import { prisma } from "@/lib/prisma";
import {
  fetchProductForTerm,
  findNearestLocation,
  getKrogerAccessToken,
} from "@/lib/kroger";
import { stapleItems } from "@/lib/ingest/staplesList";

const payloadSchema = z.object({
  locationId: z.string().min(1).optional(),
  lat: z.coerce.number().optional(),
  lon: z.coerce.number().optional(),
});

export async function POST(request: Request) {
  const ingestSecret = process.env.INGEST_SECRET;
  const providedSecret = request.headers.get("x-ingest-secret");
  let authorized = false;

  if (ingestSecret && providedSecret === ingestSecret) {
    authorized = true;
  } else {
    const supabase = await supabaseRoute();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    authorized = Boolean(user);
  }

  if (!authorized) {
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

  const accessToken = await getKrogerAccessToken();

  let locationId = parsed.data.locationId || process.env.KROGER_LOCATION_ID;
  let storeName = "Kroger";
  let locationLabel = "unknown";

  if (!locationId) {
    const lat =
      parsed.data.lat ??
      (process.env.KROGER_LAT ? Number(process.env.KROGER_LAT) : 33.7756);
    const lon =
      parsed.data.lon ??
      (process.env.KROGER_LON ? Number(process.env.KROGER_LON) : -84.3963);
    const location = await findNearestLocation({
      accessToken: accessToken.access_token,
      lat,
      lon,
    });
    locationId = location.locationId;
    storeName = location.name;
    locationLabel = location.address ?? "nearby";
  }

  const capturedAt = new Date();
  let basketTotal = 0;
  let basketCount = 0;

  for (const staple of stapleItems) {
    const product = await fetchProductForTerm({
      accessToken: accessToken.access_token,
      locationId,
      term: staple.term,
    });

    if (!product) {
      continue;
    }

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

    if (product.priceCents !== null) {
      basketTotal += product.priceCents;
      basketCount += 1;
      await prisma.priceSnapshot.create({
        data: {
          itemId: item.id,
          locationId,
          storeName,
          priceCents: product.priceCents,
          currency: product.currency,
          capturedAt,
          source: "kroger",
          rawJson: {
            locationLabel,
            term: staple.term,
            kroger: product.raw,
          },
        },
      });
    }
  }

  if (basketCount > 0) {
    await prisma.cpiBasketSnapshot.create({
      data: {
        capturedAt,
        totalCents: basketTotal,
        currency: "USD",
        locationId,
        storeName,
        source: "kroger",
      },
    });
  }

  return NextResponse.json({ ok: true, locationId, storeName, basketCount });
}
