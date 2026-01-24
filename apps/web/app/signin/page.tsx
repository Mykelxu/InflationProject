"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSignIn = async () => {
    setLoading(true);
    setMessage(null);
    const supabase = supabaseBrowser();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setMessage(error.message);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
    setLoading(false);
  };

  const handleSignUp = async () => {
    setLoading(true);
    setMessage(null);
    const supabase = supabaseBrowser();
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Account created. You can sign in now.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen px-6 py-16">
      <div className="mx-auto max-w-lg rounded-3xl border border-[color:var(--ring)] bg-[color:var(--surface)] p-10 shadow-sm">
        <p className="text-sm uppercase tracking-[0.2em] text-[color:var(--muted)]">
          Sign in
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-[color:var(--ink)]">
          Access your tracker.
        </h1>
        <p className="mt-4 text-sm text-[color:var(--muted)]">
          Use your email and password (Supabase Auth) to access the dashboard.
        </p>

        <div className="mt-8 space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-xl border border-[color:var(--ring)] bg-white px-4 py-3 text-sm"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-xl border border-[color:var(--ring)] bg-white px-4 py-3 text-sm"
          />
        </div>

        {message && (
          <p className="mt-4 text-sm text-[color:var(--sea)]">{message}</p>
        )}

        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={handleSignIn}
            disabled={loading}
            className="w-full rounded-full bg-[color:var(--ink)] px-6 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
          <button
            type="button"
            onClick={handleSignUp}
            disabled={loading}
            className="w-full rounded-full border border-[color:var(--ring)] bg-white px-6 py-3 text-sm font-semibold text-[color:var(--ink)] transition hover:-translate-y-0.5 disabled:opacity-60"
          >
            {loading ? "Creating..." : "Create account"}
          </button>
        </div>

        <Link
          href="/"
          className="mt-6 block text-center text-sm font-semibold text-[color:var(--sea)]"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
