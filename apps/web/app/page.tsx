import Link from "next/link";

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute -top-32 right-0 h-72 w-72 rounded-full bg-[rgba(213,93,58,0.18)] blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-10 h-64 w-64 rounded-full bg-[rgba(45,111,103,0.18)] blur-3xl" />

      <main className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-20 animate-rise">
        <div className="max-w-3xl">
          <p className="text-sm uppercase tracking-[0.2em] text-[color:var(--muted)]">
            Grocery Inflation Tracker
          </p>
          <h1 className="mt-5 text-4xl font-semibold leading-tight text-[color:var(--ink)] sm:text-6xl">
            Keep a clear eye on the grocery aisle.
          </h1>
          <p className="mt-6 text-lg leading-8 text-[color:var(--muted)]">
            Track staples, compare store trends, and build baskets that show how
            everyday prices shift over time. Start with mock data, then wire up
            your own sources as they grow.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-full bg-[color:var(--accent)] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[rgba(213,93,58,0.35)] transition hover:-translate-y-0.5 hover:shadow-[rgba(213,93,58,0.45)]"
            >
              Go to Dashboard
            </Link>
            <Link
              href="/insights"
              className="inline-flex items-center justify-center rounded-full border border-[color:var(--ring)] bg-[color:var(--surface)] px-6 py-3 text-sm font-semibold text-[color:var(--ink)] transition hover:-translate-y-0.5"
            >
              View Insights
            </Link>
            <Link
              href="/api/health"
              className="inline-flex items-center justify-center rounded-full border border-[color:var(--ring)] bg-[color:var(--surface)] px-6 py-3 text-sm font-semibold text-[color:var(--ink)] transition hover:-translate-y-0.5"
            >
              API Health
            </Link>
          </div>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {[
            {
              title: "Price signals",
              body: "Capture snapshots by store, location, and unit for real-time inflation context.",
            },
            {
              title: "Basket tracking",
              body: "Build custom baskets to measure how a household's spend changes month over month.",
            },
            {
              title: "Trend views",
              body: "Layer data into clean charts and summaries for quick decisions.",
            },
          ].map((card) => (
            <div
              key={card.title}
              className="glass-card lift-card shine rounded-2xl p-6"
            >
              <h3 className="text-xl font-semibold text-[color:var(--ink)]">
                {card.title}
              </h3>
              <p className="mt-3 text-sm leading-6 text-[color:var(--muted)]">
                {card.body}
              </p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
