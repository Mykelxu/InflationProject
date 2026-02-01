import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

type StapleItem = {
  label: string;
  term: string;
  category: string;
  unit: string;
};

type KrogerProductRecord = {
  productId?: string;
  brand?: string;
  description?: string;
  items?: Array<{
    size?: string;
    description?: string;
    price?: { regular?: number; promo?: number; effective?: number };
  }>;
};

const stapleItems: StapleItem[] = [
  { label: "Whole milk", term: "whole milk", category: "Dairy", unit: "1 gal" },
  { label: "Eggs", term: "eggs", category: "Dairy", unit: "12 ct" },
  { label: "Bread", term: "bread", category: "Bakery", unit: "1 loaf" },
  { label: "Butter", term: "butter", category: "Dairy", unit: "1 lb" },
  { label: "Chicken breast", term: "chicken breast", category: "Meat", unit: "1 lb" },
  { label: "Rice", term: "rice", category: "Pantry", unit: "2 lb" },
  { label: "Flour", term: "flour", category: "Pantry", unit: "5 lb" },
  { label: "Sugar", term: "sugar", category: "Pantry", unit: "4 lb" },
  { label: "Pasta", term: "pasta", category: "Pantry", unit: "1 lb" },
  { label: "Cereal", term: "cereal", category: "Pantry", unit: "18 oz" },
  { label: "Coffee", term: "coffee", category: "Pantry", unit: "12 oz" },
  { label: "Apples", term: "apples", category: "Produce", unit: "1 lb" },
  { label: "Bananas", term: "bananas", category: "Produce", unit: "1 lb" },
  { label: "Lettuce", term: "lettuce", category: "Produce", unit: "1 head" },
  { label: "Potatoes", term: "potatoes", category: "Produce", unit: "5 lb" },
  { label: "Onions", term: "onions", category: "Produce", unit: "3 lb" },
  { label: "Ground beef", term: "ground beef", category: "Meat", unit: "1 lb" },
  { label: "Cheese", term: "cheddar cheese", category: "Dairy", unit: "8 oz" },
  { label: "Yogurt", term: "yogurt", category: "Dairy", unit: "32 oz" },
  { label: "Peanut butter", term: "peanut butter", category: "Pantry", unit: "16 oz" },
];

const defaultBaseUrl = "https://api-ce.kroger.com/v1";

const createId = () => crypto.randomUUID();

async function getKrogerToken() {
  const clientId = Deno.env.get("KROGER_CLIENT_ID");
  const clientSecret = Deno.env.get("KROGER_CLIENT_SECRET");

  if (!clientId || !clientSecret) {
    throw new Error("Missing Kroger credentials.");
  }

  const auth = btoa(`${clientId}:${clientSecret}`);
  const response = await fetch(`${Deno.env.get("KROGER_BASE_URL") ?? defaultBaseUrl}/connect/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      scope: "product.compact",
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Kroger token failed: ${response.status} ${details}`);
  }

  return (await response.json()) as { access_token: string };
}

async function findNearestLocation(accessToken: string, lat: number, lon: number) {
  const baseUrl = Deno.env.get("KROGER_BASE_URL") ?? defaultBaseUrl;
  const url = new URL(`${baseUrl}/locations`);
  url.searchParams.set("filter.lat.near", lat.toString());
  url.searchParams.set("filter.lon.near", lon.toString());
  url.searchParams.set("filter.radiusInMiles", "5");
  url.searchParams.set("filter.limit", "1");

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Kroger locations failed: ${response.status}`);
  }

  const payload = await response.json();
  const location = payload?.data?.[0];
  if (!location) {
    throw new Error("No Kroger locations returned.");
  }

  const addressParts = [
    location.address?.addressLine1,
    location.address?.city,
    location.address?.state,
    location.address?.zipCode,
  ].filter(Boolean);

  return {
    locationId: location.locationId as string,
    name: (location.name || location.description || "Kroger") as string,
    address: addressParts.join(", "),
  };
}

async function fetchProduct(
  accessToken: string,
  locationId: string,
  term: string,
  targetUnit: string,
  preferred?: {
    productId?: string | null;
    brand?: string | null;
  }
) {
  const baseUrl = Deno.env.get("KROGER_BASE_URL") ?? defaultBaseUrl;
  const url = new URL(`${baseUrl}/products`);
  url.searchParams.set("filter.term", term);
  url.searchParams.set("filter.locationId", locationId);
  url.searchParams.set("filter.limit", "10");

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Kroger products failed: ${response.status}`);
  }

  const payload = await response.json();
  const products = (payload?.data ?? []) as KrogerProductRecord[];

  if (products.length === 0) {
    return null;
  }

  const pick = selectBestProduct(
    products,
    targetUnit,
    preferred?.productId ?? null,
    preferred?.brand ?? null
  );
  if (!pick) {
    return null;
  }

  const price =
    pick.item?.price?.regular ??
    pick.item?.price?.promo ??
    pick.item?.price?.effective ??
    null;
  const priceCents = typeof price === "number" ? Math.round(price * 100) : null;

  return {
    name: pick.product.description as string,
    unit: (pick.item?.size || pick.item?.description || "each") as string,
    priceCents,
    currency: "USD",
    raw: pick.product,
    productId: pick.product.productId ?? null,
    brand: pick.product.brand ?? null,
    sizeLabel: (pick.item?.size || pick.item?.description || null) as
      | string
      | null,
  };
}

function parseUnit(input?: string) {
  if (!input) return null;
  const text = input.toLowerCase().replace(/,/g, " ").trim();
  const match = text.match(
    /(\d+(?:\.\d+)?)\s*(fl\s*oz|oz|ounce|ounces|lb|lbs|pound|pounds|ct|count|gal|gallon|gallons|g|gram|grams|kg|kilogram|kilograms)/
  );
  if (!match) return null;
  const value = Number(match[1]);
  const unit = match[2].replace(/\s+/g, " ");

  if (Number.isNaN(value)) return null;

  if (unit.startsWith("fl oz")) return { value, type: "volume" as const };
  if (unit === "gal" || unit === "gallon" || unit === "gallons") {
    return { value: value * 128, type: "volume" as const };
  }
  if (unit === "oz" || unit === "ounce" || unit === "ounces") {
    return { value, type: "weight" as const };
  }
  if (unit === "lb" || unit === "lbs" || unit === "pound" || unit === "pounds") {
    return { value: value * 16, type: "weight" as const };
  }
  if (unit === "g" || unit === "gram" || unit === "grams") {
    return { value: value * 0.035274, type: "weight" as const };
  }
  if (unit === "kg" || unit === "kilogram" || unit === "kilograms") {
    return { value: value * 35.274, type: "weight" as const };
  }
  if (unit === "ct" || unit === "count") {
    return { value, type: "count" as const };
  }
  return null;
}

function selectBestProduct(
  products: KrogerProductRecord[],
  targetUnit: string,
  preferredProductId: string | null,
  preferredBrand: string | null
) {
  const targetParsed = parseUnit(targetUnit);

  let best:
    | {
        product: KrogerProductRecord;
        item: NonNullable<KrogerProductRecord["items"]>[number];
        score: number;
      }
    | null = null;

  const normalizedPreferredBrand = normalizeBrand(preferredBrand);

  if (preferredProductId) {
    for (const product of products) {
      if (product.productId !== preferredProductId) continue;
      const item = product.items?.find((candidate) => hasPrice(candidate));
      if (item) {
        return { product, item, score: 0 };
      }
    }
  }

  for (const product of products) {
    if (
      normalizedPreferredBrand &&
      normalizeBrand(product.brand) !== normalizedPreferredBrand
    ) {
      continue;
    }

    for (const item of product.items ?? []) {
      if (!hasPrice(item)) {
        continue;
      }
      const sizeText = item.size || item.description || "";
      const parsed = parseUnit(sizeText);
      let score = 1e9;

      if (targetParsed && parsed && targetParsed.type === parsed.type) {
        score = Math.abs(parsed.value - targetParsed.value);
      } else if (!targetParsed) {
        score = 0;
      }

      if (!best || score < best.score) {
        best = { product, item, score };
      }
    }
  }

  if (!best) {
    for (const product of products) {
      const item = product.items?.find((candidate) => hasPrice(candidate));
      if (item) {
        return { product, item, score: 0 };
      }
    }
    return null;
  }

  return best;
}

function normalizeBrand(brand?: string | null) {
  return brand ? brand.trim().toLowerCase() : null;
}

function hasPrice(item?: {
  price?: { regular?: number; promo?: number; effective?: number };
}) {
  if (!item?.price) return false;
  return (
    typeof item.price.regular === "number" ||
    typeof item.price.promo === "number" ||
    typeof item.price.effective === "number"
  );
}

async function fetchWithRetry(
  accessToken: string,
  locationId: string,
  term: string,
  targetUnit: string,
  preferred?: {
    productId?: string | null;
    brand?: string | null;
  },
  attempts = 3
) {
  let lastError: Error | null = null;
  for (let i = 0; i < attempts; i += 1) {
    try {
      const product = await fetchProduct(
        accessToken,
        locationId,
        term,
        targetUnit,
        preferred
      );
      return product;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Unknown error");
      const message = lastError.message;
      if (!message.includes("503") && !message.includes("429")) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 600 * (i + 1)));
    }
  }
  throw lastError ?? new Error("Product fetch failed");
}

Deno.serve(async (request) => {
  const ingestSecret = Deno.env.get("INGEST_SECRET");
  const provided = request.headers.get("x-ingest-secret");
  if (ingestSecret && provided !== ingestSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) {
      throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    const token = await getKrogerToken();
    let locationId = Deno.env.get("KROGER_LOCATION_ID") ?? "";
    let storeName = "Kroger";
    let locationLabel = "unknown";

    if (!locationId) {
      const lat = Number(Deno.env.get("KROGER_LAT") ?? 33.7756);
      const lon = Number(Deno.env.get("KROGER_LON") ?? -84.3963);
      try {
        const location = await findNearestLocation(token.access_token, lat, lon);
        locationId = location.locationId;
        storeName = location.name;
        locationLabel = location.address;
      } catch (error) {
        throw new Error(
          "Location lookup failed. Set KROGER_LOCATION_ID to skip locations API."
        );
      }
    }

    const capturedAt = new Date().toISOString();
    const url = new URL(request.url);
    const debug = url.searchParams.get("debug") === "true";
    const debugRows: Array<{
      term: string;
      found: boolean;
      priced: boolean;
      priceCents: number | null;
    }> = [];
    let basketTotal = 0;
    let basketCount = 0;

    for (const staple of stapleItems) {
      try {
        const { data: existingItems, error: selectError } = await supabase
          .from("Item")
          .select("id, krogerProductId, krogerBrand, krogerSize")
          .eq("name", staple.label)
          .eq("unit", staple.unit)
          .limit(1);

        if (selectError) {
          throw new Error(`Item select failed: ${selectError.message}`);
        }

        let itemId: string | null = existingItems?.[0]?.id ?? null;
        const preferredProductId = existingItems?.[0]?.krogerProductId ?? null;
        const preferredBrand = existingItems?.[0]?.krogerBrand ?? null;
        const preferredSize = existingItems?.[0]?.krogerSize ?? null;

        const product = await fetchWithRetry(
          token.access_token,
          locationId,
          staple.term,
          staple.unit,
          {
            productId: preferredProductId,
            brand: preferredBrand,
          }
        );
        if (!product) {
          if (debug) {
            debugRows.push({
              term: staple.term,
              found: false,
              priced: false,
              priceCents: null,
            });
          }
          await supabase.from("IngestLog").insert({
            id: createId(),
            capturedAt,
            term: staple.term,
            status: "no_product",
            message: "No product returned",
            locationId,
            storeName,
            source: "kroger",
          });
          continue;
        }

        if (itemId) {
          const updateData: Record<string, unknown> = {
            isTracked: true,
            searchTerm: staple.term,
            category: staple.category,
          };

          if (!preferredProductId && product.productId) {
            updateData.krogerProductId = product.productId;
          }
          if (!preferredBrand && product.brand) {
            updateData.krogerBrand = product.brand;
          }
          if (!preferredSize && product.sizeLabel) {
            updateData.krogerSize = product.sizeLabel;
          }

          const { error: updateError } = await supabase
            .from("Item")
            .update({
              ...updateData,
            })
            .eq("id", itemId);
          if (updateError) {
            throw new Error(`Item update failed: ${updateError.message}`);
          }
        } else {
          const { data: inserted, error: insertError } = await supabase
            .from("Item")
            .insert({
              id: createId(),
              name: staple.label,
              category: staple.category,
              unit: staple.unit,
              isTracked: true,
              searchTerm: staple.term,
              krogerProductId: product.productId,
              krogerBrand: product.brand,
              krogerSize: product.sizeLabel,
            })
            .select("id")
            .single();
          if (insertError) {
            throw new Error(`Item insert failed: ${insertError.message}`);
          }
          itemId = inserted?.id ?? null;

          if (!itemId) {
            const { data: fallbackItems, error: fallbackError } = await supabase
              .from("Item")
              .select("id")
              .eq("name", staple.label)
              .eq("unit", staple.unit)
              .limit(1);
            if (fallbackError) {
              throw new Error(
                `Item fallback select failed: ${fallbackError.message}`
              );
            }
            itemId = fallbackItems?.[0]?.id ?? null;
          }
        }

        if (debug) {
          debugRows.push({
            term: staple.term,
            found: true,
            priced: product.priceCents !== null,
            priceCents: product.priceCents,
          });
        }

        if (itemId && product.priceCents !== null) {
          basketTotal += product.priceCents;
          basketCount += 1;

          const { error: snapshotError } = await supabase
            .from("PriceSnapshot")
            .insert({
              id: createId(),
              itemId,
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
            });
          if (snapshotError) {
            throw new Error(
              `PriceSnapshot insert failed: ${snapshotError.message}`
            );
          }
        }

        await supabase.from("IngestLog").insert({
          id: createId(),
          capturedAt,
          term: staple.term,
          status: product.priceCents !== null ? "ok" : "no_price",
          message: product.priceCents !== null ? "Inserted" : "No price",
          priceCents: product.priceCents,
          locationId,
          storeName,
          source: "kroger",
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        await supabase.from("IngestLog").insert({
          id: createId(),
          capturedAt,
          term: staple.term,
          status: "error",
          message,
          locationId,
          storeName,
          source: "kroger",
        });
      }
    }

    if (basketCount > 0) {
      const { error: basketError } = await supabase.from("CpiBasketSnapshot").insert({
        id: createId(),
        capturedAt,
        totalCents: basketTotal,
        currency: "USD",
        locationId,
        storeName,
        source: "kroger",
      });
      if (basketError) {
        throw new Error(`Basket snapshot insert failed: ${basketError.message}`);
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        locationId,
        storeName,
        basketCount,
        debug: debug ? debugRows : undefined,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
