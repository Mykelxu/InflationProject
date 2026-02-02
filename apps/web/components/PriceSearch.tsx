"use client";

import { useState } from "react";
import Image from "next/image";
import { formatCurrency } from "@/lib/format";

type SearchItem = {
  term: string;
  name: string;
  unit: string;
  storeName: string;
  locationLabel: string;
  priceCents: number | null;
  currency: string;
  imageUrl?: string | null;
};

type SearchResult = {
  term: string;
  locationId: string;
  storeName: string;
  locationLabel: string;
  results: SearchItem[];
};

export function PriceSearch() {
  const [term, setTerm] = useState("");
  const [result, setResult] = useState<SearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!term.trim()) {
      setError("Enter a product to search.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`/api/search?term=${encodeURIComponent(term)}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error ?? "Search failed");
      }
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card lift-card shine rounded-2xl p-6">
      <h3 className="text-lg font-semibold text-[color:var(--ink)]">
        Live price search
      </h3>
      <p className="mt-2 text-sm text-[color:var(--muted)]">
        Search any product for today&apos;s Kroger price (no history stored).
      </p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <input
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="Search for apples, cereal, etc."
          className="flex-1 rounded-xl border border-[color:var(--ring)] bg-white px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={handleSearch}
          disabled={loading}
          className="rounded-xl bg-[color:var(--ink)] px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </div>

      {error && (
        <p className="mt-3 text-sm text-[color:var(--accent)]">{error}</p>
      )}

      {result && (
        <div className="mt-4 space-y-3">
          {result.results.map((item) => (
            <div
              key={`${item.name}-${item.unit}`}
              className="rounded-xl border border-[color:var(--ring)] bg-white p-4 shadow-sm"
            >
              <div className="flex items-start gap-3">
                {item.imageUrl && (
                  <Image
                    src={item.imageUrl}
                    alt={item.name}
                    width={56}
                    height={56}
                    className="h-14 w-14 rounded-lg object-cover"
                    unoptimized
                  />
                )}
                <div>
                  <p className="text-sm font-semibold text-[color:var(--ink)]">
                    {item.name}
                  </p>
                  <p className="text-xs text-[color:var(--muted)]">
                    {item.storeName} · {item.locationLabel}
                  </p>
                </div>
              </div>
              <p className="mt-2 text-lg font-semibold text-[color:var(--sea)]">
                {item.priceCents !== null
                  ? formatCurrency(item.priceCents, item.currency)
                  : "Price unavailable"}
              </p>
              <p className="text-xs text-[color:var(--muted)]">{item.unit}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
