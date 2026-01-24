"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/format";

type SearchResult = {
  term: string;
  name: string;
  unit: string;
  storeName: string;
  locationLabel: string;
  priceCents: number | null;
  currency: string;
  imageUrl?: string | null;
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
    <div className="rounded-2xl border border-[color:var(--ring)] bg-[color:var(--surface)] p-6">
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
        <div className="mt-4 rounded-xl border border-[color:var(--ring)] bg-white p-4">
          <div className="flex items-start gap-3">
            {result.imageUrl && (
              <img
                src={result.imageUrl}
                alt={result.name}
                className="h-14 w-14 rounded-lg object-cover"
              />
            )}
            <div>
              <p className="text-sm font-semibold text-[color:var(--ink)]">
                {result.name}
              </p>
              <p className="text-xs text-[color:var(--muted)]">
                {result.storeName} · {result.locationLabel}
              </p>
            </div>
          </div>
          <p className="mt-2 text-lg font-semibold text-[color:var(--sea)]">
            {result.priceCents !== null
              ? formatCurrency(result.priceCents, result.currency)
              : "Price unavailable"}
          </p>
          <p className="text-xs text-[color:var(--muted)]">{result.unit}</p>
        </div>
      )}
    </div>
  );
}
