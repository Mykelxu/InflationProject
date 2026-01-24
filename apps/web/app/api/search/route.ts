import { NextResponse } from "next/server";
import { supabaseRoute } from "@/lib/supabase/route";
import {
  fetchProductForTerm,
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
  let locationLabel = process.env.KROGER_STORE_LABEL || "unknown";

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

  const product = await fetchProductForTerm({
    accessToken: accessToken.access_token,
    locationId,
    term,
  });

  if (!product) {
    return NextResponse.json({ error: "No product found" }, { status: 404 });
  }

  const raw = product.raw as {
    images?: Array<{ sizes?: Array<{ url?: string }> }>;
  } | null;
  const imageUrl = raw?.images?.[0]?.sizes?.[0]?.url ?? null;

  return NextResponse.json({
    term,
    locationId,
    storeName,
    locationLabel,
    priceCents: product.priceCents,
    currency: product.currency,
    unit: product.unit,
    name: product.name,
    imageUrl,
  });
}
