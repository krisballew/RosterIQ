import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isPlatformAdmin } from "@/lib/roles";
import { LayoutDashboard, ShieldCheck, ArrowRight } from "lucide-react";

export default async function PortalPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: memberships } = await supabase
    .from("memberships")
    .select("*")
    .eq("user_id", user.id);

  const membershipList = memberships ?? [];

  // Non-platform admins go straight to the app
  if (!isPlatformAdmin(membershipList)) {
    redirect("/app/home");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name")
    .eq("user_id", user.id)
    .single();

  const firstName = profile?.first_name ?? "there";

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{
        background:
          "linear-gradient(135deg, #0d6e7a 0%, #0a4a5c 50%, #083a4a 100%)",
      }}
    >
      <div className="w-full max-w-xl">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/rosteriq-logo.png"
            alt="RosterIQ"
            className="h-12 w-auto object-contain brightness-[10] saturate-0"
          />
        </div>

        {/* Card */}
        <div className="rounded-2xl bg-white shadow-2xl overflow-hidden">
          <div className="px-8 pt-8 pb-6 text-center border-b border-gray-100">
            <h1 className="text-xl font-bold text-gray-900">
              Welcome back, {firstName}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Where would you like to go?
            </p>
          </div>

          <div className="p-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Platform Admin Tool */}
            <a
              href="/admin/dashboard"
              className="group relative flex flex-col rounded-xl border-2 border-[#0d6e7a]/20 bg-gradient-to-br from-[#0d6e7a]/5 to-[#0d6e7a]/10 p-5 hover:border-[#0d6e7a]/60 hover:shadow-md transition-all"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0d6e7a]/15 border border-[#0d6e7a]/20 mb-3">
                <ShieldCheck className="h-5 w-5 text-[#0d6e7a]" />
              </div>
              <h2 className="text-sm font-semibold text-gray-900 mb-1">
                Platform Console
              </h2>
              <p className="text-xs text-gray-500 leading-relaxed flex-1">
                Manage tenants, access codes, and club administrators across the
                platform.
              </p>
              <div className="mt-4 flex items-center gap-1 text-xs font-medium text-[#0d6e7a] group-hover:gap-2 transition-all">
                Open console
                <ArrowRight className="h-3.5 w-3.5" />
              </div>

              {/* Corner badge */}
              <div className="absolute top-3 right-3 rounded-full bg-[#0d6e7a]/10 px-2 py-0.5 text-[10px] font-semibold text-[#0d6e7a] uppercase tracking-wide">
                Admin
              </div>
            </a>

            {/* Main Application */}
            <a
              href="/app/home"
              className="group relative flex flex-col rounded-xl border-2 border-gray-200 bg-white p-5 hover:border-slate-400 hover:shadow-md transition-all"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 border border-slate-200 mb-3">
                <LayoutDashboard className="h-5 w-5 text-slate-600" />
              </div>
              <h2 className="text-sm font-semibold text-gray-900 mb-1">
                Main Application
              </h2>
              <p className="text-xs text-gray-500 leading-relaxed flex-1">
                Access the roster management, player reviews, recruitment, and
                field assignment tools.
              </p>
              <div className="mt-4 flex items-center gap-1 text-xs font-medium text-slate-600 group-hover:gap-2 transition-all">
                Open app
                <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </a>
          </div>

          {/* Sign out link */}
          <div className="border-t border-gray-100 px-8 py-3 text-center">
            <a
              href="/api/auth/signout"
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              Sign out
            </a>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-white/40">
          © {new Date().getFullYear()} RosterIQ · Platform Administrator Session
        </p>
      </div>
    </div>
  );
}
