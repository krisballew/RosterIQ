"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/app/home");
    router.refresh();
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center p-4"
      style={{
        background: "linear-gradient(135deg, #0d6e7a 0%, #0a4a5c 50%, #083a4a 100%)",
      }}
    >
      {/* Card */}
      <div className="flex w-full max-w-xl flex-col rounded-2xl bg-white shadow-2xl overflow-hidden">
        {/* Card body - grows to fill space */}
        <div className="flex flex-col flex-1 px-10 pt-10 pb-6">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/rosteriq-logo.png"
              alt="RosterIQ"
              className="object-contain"
              style={{ height: "300px", width: "450px" }}
            />
          </div>

          {/* Heading */}
          <h2 className="text-xl font-semibold text-gray-900 mb-1">Sign in</h2>
          <p className="text-sm text-gray-500 mb-6">
            Enter your Login ID and password to access your account.
          </p>

          {/* Form */}
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            {/* Login ID field */}
            <div>
              <input
                id="email"
                type="email"
                placeholder="Login ID"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-[#0d6e7a] focus:ring-2 focus:ring-[#0d6e7a]/20 transition"
              />
              {error && (
                <p className="mt-1 text-xs text-red-500">{error}</p>
              )}
            </div>

            {/* Password field */}
            <div>
              <input
                id="password"
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-[#0d6e7a] focus:ring-2 focus:ring-[#0d6e7a]/20 transition"
              />
            </div>

            {/* Forgot password */}
            <a
              href="#"
              className="text-sm text-[#0d6e7a] hover:underline self-start -mt-1"
            >
              Forgot Password?
            </a>

            {/* Spacer to push button toward bottom */}
            <div className="mt-4" />

            {/* Sign in button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-[#0d6e7a] py-2.5 text-sm font-semibold text-white hover:bg-[#0a5a65] disabled:opacity-50 transition"
            >
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>
        </div>

        {/* Footer strip */}
        <div className="border-t border-gray-100 px-10 py-3 text-center text-xs text-gray-400">
          © {new Date().getFullYear()} RosterIQ · All rights reserved
        </div>
      </div>
    </div>
  );
}
