export type KrogerToken = {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
};

export type KrogerLocation = {
  locationId: string;
  name: string;
  address?: string;
};

export type KrogerProduct = {
  name: string;
  unit: string;
  priceCents: number | null;
  currency: string;
  raw: unknown;
};

const DEFAULT_BASE_URL = "https://api-ce.kroger.com/v1";

function getBaseUrl() {
  return process.env.KROGER_BASE_URL || DEFAULT_BASE_URL;
}

export async function getKrogerAccessToken() {
  const clientId = process.env.KROGER_CLIENT_ID;
  const clientSecret = process.env.KROGER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Missing KROGER_CLIENT_ID or KROGER_CLIENT_SECRET.");
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const response = await fetch(`${getBaseUrl()}/connect/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      scope: "product.compact locations.compact",
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Kroger token failed: ${response.status}`);
  }

  return (await response.json()) as KrogerToken;
}

export async function findNearestLocation({
  accessToken,
  lat,
  lon,
}: {
  accessToken: string;
  lat: number;
  lon: number;
}) {
  const url = new URL(`${getBaseUrl()}/locations`);
  url.searchParams.set("filter.lat.near", lat.toString());
  url.searchParams.set("filter.lon.near", lon.toString());
  url.searchParams.set("filter.radiusInMiles", "5");
  url.searchParams.set("filter.limit", "1");

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
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
    locationId: location.locationId,
    name: location.name || location.description || "Kroger",
    address: addressParts.join(", "),
  } satisfies KrogerLocation;
}

export async function fetchProductForTerm({
  accessToken,
  locationId,
  term,
}: {
  accessToken: string;
  locationId: string;
  term: string;
}) {
  const url = new URL(`${getBaseUrl()}/products`);
  url.searchParams.set("filter.term", term);
  url.searchParams.set("filter.locationId", locationId);
  url.searchParams.set("filter.limit", "1");

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Kroger products failed: ${response.status}`);
  }

  const payload = await response.json();
  const product = payload?.data?.[0];
  if (!product) {
    return null;
  }

  const item = product.items?.[0];
  const price =
    item?.price?.regular ?? item?.price?.promo ?? item?.price?.effective ?? null;
  const priceCents =
    typeof price === "number" ? Math.round(price * 100) : null;

  return {
    name: product.description || term,
    unit: item?.size || item?.description || "each",
    priceCents,
    currency: "USD",
    raw: product,
  } satisfies KrogerProduct;
}
