import { NextResponse } from "next/server";
import { supabaseRoute } from "@/lib/supabase/route";
import {
  fetchProductForTerm,
  getLocationById,
  findNearestLocation,
  getKrogerAccessToken,
} from "@/lib/kroger";

export async function GET(request: Request) {
  const supabase = await supabaseRoute();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const term = url.searchParams.get("term");

  if (!term) {
    return NextResponse.json({ error: "Missing term" }, { status: 400 });
  }

  const accessToken = await getKrogerAccessToken();

  let locationId =
    url.searchParams.get("locationId") || process.env.KROGER_LOCATION_ID;
  let storeName = process.env.KROGER_STORE_NAME || "Kroger";
  let locationLabel = process.env.KROGER_STORE_LABEL || storeName;

  if (!locationId) {
    const latParam = url.searchParams.get("lat");
    const lonParam = url.searchParams.get("lon");
    const lat = latParam ? Number(latParam) : Number(process.env.KROGER_LAT ?? 33.7756);
    const lon = lonParam ? Number(lonParam) : Number(process.env.KROGER_LON ?? -84.3963);
    const location = await findNearestLocation({
      accessToken: accessToken.access_token,
      lat,
      lon,
    });
    locationId = location.locationId;
    storeName = location.name;
    locationLabel = location.address ?? "nearby";
  }

  if (locationId && locationLabel === storeName) {
    try {
      const location = await getLocationById({
        accessToken: accessToken.access_token,
        locationId,
      });
      storeName = location.name;
      locationLabel = location.address || location.name;
    } catch {
      // Keep defaults if the lookup fails.
    }
  }

  if (!locationId) {
    return NextResponse.json(
      { error: "Missing locationId" },
      { status: 400 }
    );
  }

  const urlLimit = Number(url.searchParams.get("limit") ?? "5");
  const limit = Number.isFinite(urlLimit) ? Math.min(Math.max(urlLimit, 1), 10) : 5;

  const baseUrl = process.env.KROGER_BASE_URL ?? "https://api.kroger.com/v1";
  const rawUrl = new URL(`${baseUrl}/products`);
  rawUrl.searchParams.set("filter.term", term);
  rawUrl.searchParams.set("filter.locationId", locationId);
  rawUrl.searchParams.set("filter.limit", limit.toString());

  const rawResponse = await fetch(rawUrl, {
    headers: {
      Authorization: `Bearer ${accessToken.access_token}`,
    },
    cache: "no-store",
  });

  if (!rawResponse.ok) {
    return NextResponse.json({ error: "Search failed" }, { status: 502 });
  }

  const rawPayload = await rawResponse.json();
  const rawProducts = (rawPayload?.data ?? []) as Array<{
    description?: string;
    items?: Array<{
      size?: string;
      description?: string;
      price?: { regular?: number; promo?: number; effective?: number };
    }>;
    images?: Array<{ sizes?: Array<{ url?: string }> }>;
  }>;

  const results = rawProducts.map((product) => {
    const item = product.items?.[0];
    const price =
      item?.price?.regular ?? item?.price?.promo ?? item?.price?.effective ?? null;
    const priceCents = typeof price === "number" ? Math.round(price * 100) : null;
    const imageUrl = product.images?.[0]?.sizes?.[0]?.url ?? null;
    return {
      term,
      name: product.description ?? term,
      unit: item?.size ?? item?.description ?? "each",
      storeName,
      locationLabel,
      priceCents,
      currency: "USD",
      imageUrl,
    };
  });

  if (results.length === 0) {
    return NextResponse.json({ error: "No product found" }, { status: 404 });
  }

  return NextResponse.json({
    term,
    locationId,
    storeName,
    locationLabel,
    results,
  });
}
