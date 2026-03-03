"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CheckCircle, ArrowLeft } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type Mode = "login" | "signup";
type SignupStep = "code" | "details" | "success";

// ─── Login Form ───────────────────────────────────────────────────────────────
function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      setForgotError("Enter your email address above first.");
      return;
    }
    setForgotLoading(true);
    setForgotError(null);
    const supabase = createClient();
    const redirectTo =
      (process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin) +
      "/auth/callback?type=recovery";
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo,
    });
    setForgotLoading(false);
    if (error) {
      setForgotError(error.message);
    } else {
      setForgotSent(true);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/portal");
    router.refresh();
  }

  if (forgotMode) {
    return (
      <form onSubmit={handleForgotPassword} className="flex flex-col gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Email address
          </label>
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-[#0d6e7a] focus:ring-2 focus:ring-[#0d6e7a]/20 transition"
          />
        </div>

        {forgotSent ? (
          <p className="text-xs text-green-600">
            Check your email for a password reset link.
          </p>
        ) : (
          <>
            {forgotError && <p className="text-xs text-red-500">{forgotError}</p>}
            <button
              type="submit"
              disabled={forgotLoading}
              className="w-full rounded-md py-2.5 text-sm font-semibold text-white transition disabled:opacity-50"
              style={{ backgroundColor: "#0d6e7a" }}
            >
              {forgotLoading ? "Sending…" : "Send reset link"}
            </button>
          </>
        )}

        <button
          type="button"
          onClick={() => { setForgotMode(false); setForgotError(null); setForgotSent(false); }}
          className="text-sm text-gray-500 hover:underline self-start"
        >
          ← Back to sign in
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleLogin} className="flex flex-col gap-4">
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
        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      </div>

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

      <button
        type="button"
        onClick={() => setForgotMode(true)}
        className="text-sm text-[#0d6e7a] hover:underline self-start -mt-1"
      >
        Forgot Password?
      </button>

      <div className="mt-4" />

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-[#0d6e7a] py-2.5 text-sm font-semibold text-white hover:bg-[#0a5a65] disabled:opacity-50 transition"
      >
        {loading ? "Signing in…" : "Sign In"}
      </button>
    </form>
  );
}

// ─── Sign-up Form ─────────────────────────────────────────────────────────────
function SignupForm({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState<SignupStep>("code");

  // Step 1 — access code
  const [code, setCode] = useState("");
  const [codeLoading, setCodeLoading] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [tenantName, setTenantName] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);

  // Step 2 — personal details
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // ── Step 1: validate code ──────────────────────────────────────────────────
  async function handleValidateCode(e: React.FormEvent) {
    e.preventDefault();
    setCodeLoading(true);
    setCodeError(null);

    const res = await fetch("/api/auth/validate-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: code.trim() }),
    });

    const json = await res.json();
    setCodeLoading(false);

    if (!res.ok) {
      setCodeError(json.error ?? "Invalid access code.");
      return;
    }

    setTenantName(json.tenantName);
    setTenantId(json.tenantId);
    setStep("details");
  }

  // ── Step 2: submit sign-up request ────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    if (password !== confirmPassword) {
      setSubmitError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setSubmitError("Password must be at least 8 characters.");
      return;
    }

    setSubmitLoading(true);

    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: code.trim(), firstName, lastName, email, password }),
    });

    const json = await res.json();
    setSubmitLoading(false);

    if (!res.ok) {
      setSubmitError(json.error ?? "Failed to submit request. Please try again.");
      return;
    }

    setStep("success");
  }

  // ── Success screen ─────────────────────────────────────────────────────────
  if (step === "success") {
    return (
      <div className="flex flex-col items-center justify-center gap-4 text-center py-4">
        <CheckCircle className="h-12 w-12 text-[#0d6e7a]" />
        <h3 className="text-lg font-semibold text-gray-900">Request Submitted!</h3>
        <p className="text-sm text-gray-600 max-w-xs">
          Your access request for <span className="font-medium">{tenantName}</span> has
          been submitted. A Club Administrator will review your request and assign you
          to the appropriate team and role.
        </p>
        <p className="text-sm text-gray-500">
          You&apos;ll be able to sign in once your request is approved.
        </p>
        <button
          onClick={onBack}
          className="mt-2 w-full rounded-md bg-[#0d6e7a] py-2.5 text-sm font-semibold text-white hover:bg-[#0a5a65] transition"
        >
          Back to Sign In
        </button>
      </div>
    );
  }

  // ── Step 1: access code ────────────────────────────────────────────────────
  if (step === "code") {
    return (
      <form onSubmit={handleValidateCode} className="flex flex-col gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">
            Club Access Code
          </label>
          <input
            type="text"
            placeholder="e.g. cfc"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
            autoComplete="off"
            className="w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-[#0d6e7a] focus:ring-2 focus:ring-[#0d6e7a]/20 transition"
          />
          <p className="mt-1 text-xs text-gray-400">
            Enter the access code provided by your club administrator.
          </p>
          {codeError && <p className="mt-1 text-xs text-red-500">{codeError}</p>}
        </div>

        <div className="mt-4" />

        <button
          type="submit"
          disabled={codeLoading || !code.trim()}
          className="w-full rounded-md bg-[#0d6e7a] py-2.5 text-sm font-semibold text-white hover:bg-[#0a5a65] disabled:opacity-50 transition"
        >
          {codeLoading ? "Verifying…" : "Verify Code"}
        </button>
      </form>
    );
  }

  // ── Step 2: personal details ───────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Tenant confirmed banner */}
      <div className="rounded-md bg-emerald-50 border border-emerald-200 px-3 py-2 flex items-center gap-2">
        <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
        <p className="text-xs text-emerald-700 font-medium">
          Joining: <span className="font-semibold">{tenantName}</span>
        </p>
        <button
          type="button"
          onClick={() => { setStep("code"); setTenantName(null); setTenantId(null); }}
          className="ml-auto text-xs text-emerald-600 hover:underline"
        >
          Change
        </button>
      </div>

      {/* Name row */}
      <div className="grid grid-cols-2 gap-3">
        <input
          type="text"
          placeholder="First Name"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          required
          className="rounded-md border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-[#0d6e7a] focus:ring-2 focus:ring-[#0d6e7a]/20 transition"
        />
        <input
          type="text"
          placeholder="Last Name"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          required
          className="rounded-md border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-[#0d6e7a] focus:ring-2 focus:ring-[#0d6e7a]/20 transition"
        />
      </div>

      {/* Email */}
      <input
        type="email"
        placeholder="Email Address"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        autoComplete="email"
        className="w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-[#0d6e7a] focus:ring-2 focus:ring-[#0d6e7a]/20 transition"
      />

      {/* Password */}
      <input
        type="password"
        placeholder="Password (min. 8 characters)"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        autoComplete="new-password"
        className="w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-[#0d6e7a] focus:ring-2 focus:ring-[#0d6e7a]/20 transition"
      />

      {/* Confirm password */}
      <div>
        <input
          type="password"
          placeholder="Confirm Password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          autoComplete="new-password"
          className="w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-[#0d6e7a] focus:ring-2 focus:ring-[#0d6e7a]/20 transition"
        />
        {submitError && <p className="mt-1 text-xs text-red-500">{submitError}</p>}
      </div>

      <div className="mt-2" />

      <button
        type="submit"
        disabled={submitLoading}
        className="w-full rounded-md bg-[#0d6e7a] py-2.5 text-sm font-semibold text-white hover:bg-[#0a5a65] disabled:opacity-50 transition"
      >
        {submitLoading ? "Submitting Request…" : "Submit Access Request"}
      </button>

      <p className="text-xs text-gray-400 text-center -mt-1">
        Your account will be active once a Club Administrator approves your request.
      </p>

      {/* Suppress unused variable warning */}
      {tenantId && null}
    </form>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("login");

  return (
    <div
      className="flex min-h-screen items-center justify-center p-4"
      style={{
        background: "linear-gradient(135deg, #0d6e7a 0%, #0a4a5c 50%, #083a4a 100%)",
      }}
    >
      {/* Card */}
      <div className="flex w-full max-w-md flex-col rounded-2xl bg-white shadow-2xl overflow-hidden">
        {/* Card body */}
        <div className="flex flex-col flex-1 px-10 pt-10 pb-6">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/rosteriq-logo.png"
              alt="RosterIQ"
              className="w-full object-contain"
              style={{ maxHeight: "200px" }}
            />
          </div>

          {/* Mode tabs */}
          <div className="flex rounded-lg border border-gray-200 p-1 mb-6 bg-gray-50">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${
                mode === "login"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${
                mode === "signup"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Request Access
            </button>
          </div>

          {/* Heading */}
          {mode === "login" ? (
            <>
              <h2 className="text-xl font-semibold text-gray-900 mb-1">Sign in</h2>
              <p className="text-sm text-gray-500 mb-6">
                Enter your Login ID and password to access your account.
              </p>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-1">
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className="text-gray-400 hover:text-gray-600 transition"
                  aria-label="Back to sign in"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <h2 className="text-xl font-semibold text-gray-900">Request Access</h2>
              </div>
              <p className="text-sm text-gray-500 mb-6">
                Enter your club&apos;s access code to create your account.
              </p>
            </>
          )}

          {/* Form content */}
          {mode === "login" ? (
            <LoginForm />
          ) : (
            <SignupForm onBack={() => setMode("login")} />
          )}
        </div>

        {/* Footer strip */}
        <div className="border-t border-gray-100 px-10 py-3 text-center text-xs text-gray-400">
          © {new Date().getFullYear()} RosterIQ · All rights reserved
        </div>
      </div>
    </div>
  );
}
