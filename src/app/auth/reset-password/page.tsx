"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setDone(true);
    setTimeout(() => router.push("/portal"), 2000);
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{
        background:
          "linear-gradient(135deg, #0d6e7a 0%, #0a4a5c 50%, #083a4a 100%)",
      }}
    >
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/rosteriq-logo.png"
            alt="RosterIQ"
            className="h-12 w-auto object-contain brightness-[10] saturate-0"
          />
        </div>

        <div className="rounded-2xl bg-white shadow-2xl overflow-hidden">
          <div className="px-8 pt-8 pb-6 border-b border-gray-100">
            <h1 className="text-xl font-bold text-gray-900">Set new password</h1>
            <p className="mt-1 text-sm text-gray-500">
              Choose a strong password for your account.
            </p>
          </div>

          <div className="p-8">
            {done ? (
              <div className="text-center py-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mx-auto mb-3">
                  <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-900">Password updated!</p>
                <p className="text-xs text-gray-500 mt-1">Redirecting you now…</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    New password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    placeholder="At least 8 characters"
                    className="w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-[#0d6e7a] focus:ring-2 focus:ring-[#0d6e7a]/20 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Confirm password
                  </label>
                  <input
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    placeholder="Repeat your new password"
                    className="w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-[#0d6e7a] focus:ring-2 focus:ring-[#0d6e7a]/20 transition"
                  />
                </div>

                {error && (
                  <p className="text-xs text-red-500">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-md py-2.5 text-sm font-semibold text-white transition disabled:opacity-60"
                  style={{ backgroundColor: "#0d6e7a" }}
                >
                  {loading ? "Updating…" : "Update password"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
