import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { PriceChart } from "@/components/PriceChart";
import { ItemTrendCard } from "@/components/ItemTrendCard";
import { PriceSearch } from "@/components/PriceSearch";
import { formatCurrency } from "@/lib/format";

const fallbackBasket = [
  { label: "Jan", price: 42.3 },
  { label: "Feb", price: 43.1 },
  { label: "Mar", price: 44.8 },
  { label: "Apr", price: 46.2 },
  { label: "May", price: 47.5 },
  { label: "Jun", price: 48.1 },
];

const mockSnapshots = [
  {
    id: "mock-1",
    item: { name: "Whole milk" },
    storeName: "Harvest Market",
    priceCents: 529,
    currency: "USD",
    capturedAt: new Date().toISOString(),
  },
  {
    id: "mock-2",
    item: { name: "Brown eggs" },
    storeName: "City Co-op",
    priceCents: 689,
    currency: "USD",
    capturedAt: new Date().toISOString(),
  },
  {
    id: "mock-3",
    item: { name: "Avocados" },
    storeName: "Riverline Grocer",
    priceCents: 398,
    currency: "USD",
    capturedAt: new Date().toISOString(),
  },
];

export default async function DashboardPage() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/signin");
  }

  const baskets = await prisma.basket.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  const basketSnapshots = await prisma.cpiBasketSnapshot.findMany({
    orderBy: { capturedAt: "asc" },
    take: 30,
  });

  const basketChartData =
    basketSnapshots.length > 0
      ? basketSnapshots.map((snapshot) => ({
          label: snapshot.capturedAt.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }),
          price: snapshot.totalCents / 100,
        }))
      : fallbackBasket;

  const trackedItems = await prisma.item.findMany({
    where: { isTracked: true },
    orderBy: { name: "asc" },
  });

  const since = new Date();
  since.setDate(since.getDate() - 30);
  const trackedSnapshots = await prisma.priceSnapshot.findMany({
    where: {
      itemId: { in: trackedItems.map((item) => item.id) },
      capturedAt: { gte: since },
    },
    orderBy: { capturedAt: "asc" },
    include: { item: true },
  });

  const snapshotsByItem = trackedItems.reduce<Record<string, typeof trackedSnapshots>>(
    (acc, item) => {
      acc[item.id] = [];
      return acc;
    },
    {}
  );

  for (const snapshot of trackedSnapshots) {
    snapshotsByItem[snapshot.itemId]?.push(snapshot);
  }

  const itemStats = new Map<
    string,
    { lastPrice: number | null; delta7: number | null; delta30: number | null }
  >();
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 7);

  for (const item of trackedItems) {
    const series = snapshotsByItem[item.id] ?? [];
    if (series.length === 0) {
      itemStats.set(item.id, { lastPrice: null, delta7: null, delta30: null });
      continue;
    }
    const last = series[series.length - 1];
    const first = series[0];
    const sevenDay = series.find((snap) => snap.capturedAt >= sevenDaysAgo);

    const lastPrice = last.priceCents / 100;
    const delta30 =
      first.priceCents > 0 ? lastPrice - first.priceCents / 100 : null;
    const delta7 =
      sevenDay && sevenDay.priceCents > 0
        ? lastPrice - sevenDay.priceCents / 100
        : null;

    itemStats.set(item.id, { lastPrice, delta7, delta30 });
  }

  const snapshots = await prisma.priceSnapshot.findMany({
    orderBy: { capturedAt: "desc" },
    take: 6,
    include: { item: true },
  });

  const rows = snapshots.length > 0 ? snapshots : mockSnapshots;

  return (
    <div className="min-h-screen px-6 py-12">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-[color:var(--muted)]">
              Dashboard
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-[color:var(--ink)] sm:text-4xl">
              Welcome back, {user.email ?? "tracker"}.
            </h1>
          </div>
          <Link
            href="/"
            className="rounded-full border border-[color:var(--ring)] bg-[color:var(--surface)] px-4 py-2 text-sm font-semibold text-[color:var(--ink)]"
          >
            Back to Home
          </Link>
        </header>

        <section className="mt-10 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <h2 className="text-lg font-semibold text-[color:var(--ink)]">
              Basket trend
            </h2>
            <p className="mt-2 text-sm text-[color:var(--muted)]">
              Track how a representative basket shifts over the last six months.
            </p>
            <div className="mt-6">
              <PriceChart data={basketChartData} />
            </div>
          </div>
          <div className="rounded-2xl border border-[color:var(--ring)] bg-[color:var(--surface)] p-6">
            <h3 className="text-lg font-semibold text-[color:var(--ink)]">
              Basket selector
            </h3>
            <p className="mt-2 text-sm text-[color:var(--muted)]">
              Choose a basket to focus this view.
            </p>
            <div className="mt-4">
              <select
                className="w-full rounded-xl border border-[color:var(--ring)] bg-white px-3 py-2 text-sm"
                defaultValue={baskets[0]?.id ?? ""}
              >
                {baskets.length === 0 && (
                  <option value="">No baskets yet</option>
                )}
                {baskets.map((basket) => (
                  <option key={basket.id} value={basket.id}>
                    {basket.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section className="mt-10 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <h2 className="text-lg font-semibold text-[color:var(--ink)]">
              Tracked item trends
            </h2>
            <p className="mt-2 text-sm text-[color:var(--muted)]">
              Daily snapshots for the 20 CPI-style staples.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {trackedItems.map((item) => {
                const points =
                  snapshotsByItem[item.id]?.map((snapshot) => ({
                  label: snapshot.capturedAt.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  }),
                  value: snapshot.priceCents / 100,
                })) ?? [];

                return (
                  <ItemTrendCard
                    key={item.id}
                    title={item.name}
                    unit={item.unit}
                    data={points}
                    lastPrice={itemStats.get(item.id)?.lastPrice ?? null}
                    delta7={itemStats.get(item.id)?.delta7 ?? null}
                    delta30={itemStats.get(item.id)?.delta30 ?? null}
                  />
                );
              })}
            </div>
          </div>
          <PriceSearch />
        </section>

        <section className="mt-12">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[color:var(--ink)]">
              Latest price snapshots
            </h2>
            <span className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
              {snapshots.length > 0 ? "Live data" : "Mock data"}
            </span>
          </div>
          <div className="mt-4 overflow-hidden rounded-2xl border border-[color:var(--ring)] bg-[color:var(--surface)]">
            <table className="w-full text-left text-sm">
              <thead className="bg-[color:var(--ring)]/40 text-xs uppercase tracking-[0.15em] text-[color:var(--muted)]">
                <tr>
                  <th className="px-4 py-3">Item</th>
                  <th className="px-4 py-3">Store</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Captured</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-t border-[color:var(--ring)]/60"
                  >
                    <td className="px-4 py-3 font-medium">
                      {row.item?.name ?? "Item"}
                    </td>
                    <td className="px-4 py-3 text-[color:var(--muted)]">
                      {row.storeName}
                    </td>
                    <td className="px-4 py-3">
                      {formatCurrency(row.priceCents, row.currency)}
                    </td>
                    <td className="px-4 py-3 text-[color:var(--muted)]">
                      {new Date(row.capturedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
