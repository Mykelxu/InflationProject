import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/format";

function percentChange(start: number, end: number) {
  if (!start) return 0;
  return ((end - start) / start) * 100;
}

export default async function InsightsPage() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/signin");
  }

  const trackedItems = await prisma.item.findMany({
    where: { isTracked: true },
    orderBy: { name: "asc" },
  });

  const since = new Date();
  since.setDate(since.getDate() - 30);

  const snapshots = await prisma.priceSnapshot.findMany({
    where: {
      itemId: { in: trackedItems.map((item) => item.id) },
      capturedAt: { gte: since },
    },
    orderBy: { capturedAt: "asc" },
  });

  const grouped = new Map<string, typeof snapshots>();
  for (const item of trackedItems) {
    grouped.set(item.id, []);
  }
  for (const snap of snapshots) {
    grouped.get(snap.itemId)?.push(snap);
  }

  const movers = trackedItems
    .map((item) => {
      const series = grouped.get(item.id) ?? [];
      const first = series[0];
      const last = series[series.length - 1];
      if (!first || !last) {
        return null;
      }
      const changePct = percentChange(first.priceCents, last.priceCents);
      return {
        id: item.id,
        name: item.name,
        unit: item.unit,
        changePct,
        lastPrice: last.priceCents,
      };
    })
    .filter(Boolean)
    .sort((a, b) => Math.abs(b!.changePct) - Math.abs(a!.changePct))
    .slice(0, 6);

  const basketSnapshots = await prisma.cpiBasketSnapshot.findMany({
    orderBy: { capturedAt: "desc" },
    take: 1,
  });
  const latestBasket = basketSnapshots[0];

  return (
    <div className="min-h-screen px-6 py-12">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-[color:var(--muted)]">
              Insights
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-[color:var(--ink)] sm:text-4xl">
              What&apos;s moving your basket.
            </h1>
          </div>
          <Link
            href="/dashboard"
            className="rounded-full border border-[color:var(--ring)] bg-[color:var(--surface)] px-4 py-2 text-sm font-semibold text-[color:var(--ink)]"
          >
            Back to Dashboard
          </Link>
        </header>

        <section className="mt-10 grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-[color:var(--ring)] bg-[color:var(--surface)] p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
              Latest basket
            </p>
            <p className="mt-3 text-2xl font-semibold text-[color:var(--ink)]">
              {latestBasket
                ? formatCurrency(latestBasket.totalCents, latestBasket.currency)
                : "n/a"}
            </p>
            <p className="mt-2 text-sm text-[color:var(--muted)]">
              {latestBasket ? latestBasket.storeName : "No snapshots yet"}
            </p>
          </div>
          <div className="rounded-2xl border border-[color:var(--ring)] bg-[color:var(--surface)] p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
              Tracked items
            </p>
            <p className="mt-3 text-2xl font-semibold text-[color:var(--ink)]">
              {trackedItems.length}
            </p>
            <p className="mt-2 text-sm text-[color:var(--muted)]">
              30-day rolling history
            </p>
          </div>
          <div className="rounded-2xl border border-[color:var(--ring)] bg-[color:var(--surface)] p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
              Biggest movers
            </p>
            <p className="mt-3 text-2xl font-semibold text-[color:var(--ink)]">
              {movers.length}
            </p>
            <p className="mt-2 text-sm text-[color:var(--muted)]">
              Items with largest 30d change
            </p>
          </div>
        </section>

        <section className="mt-12">
          <h2 className="text-lg font-semibold text-[color:var(--ink)]">
            Movers (30-day change)
          </h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {movers.map((item) => (
              <div
                key={item!.id}
                className="rounded-2xl border border-[color:var(--ring)] bg-[color:var(--surface)] p-5"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[color:var(--ink)]">
                      {item!.name}
                    </p>
                    <p className="text-xs text-[color:var(--muted)]">
                      {item!.unit}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-[color:var(--sea)]">
                      {formatCurrency(item!.lastPrice, "USD")}
                    </p>
                    <p className="text-xs text-[color:var(--muted)]">
                      {item!.changePct.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
