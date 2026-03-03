"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  UserCog,
  LogOut,
  ChevronRight,
  AppWindow,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const navItems = [
  {
    href: "/admin/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    href: "/admin/tenants",
    label: "Tenants",
    icon: Building2,
    description: "Manage clubs & access codes",
  },
  {
    href: "/admin/club-admins",
    label: "Club Administrators",
    icon: UserCog,
    description: "Invite & manage club admins",
  },
];

interface AdminSidebarProps {
  firstName?: string | null;
  lastName?: string | null;
}

export function AdminSidebar({ firstName, lastName }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const initials = [firstName?.[0], lastName?.[0]]
    .filter(Boolean)
    .join("")
    .toUpperCase() || "A";

  const fullName = [firstName, lastName].filter(Boolean).join(" ") || "Admin";

  return (
    <aside
      className="flex h-full w-64 flex-col"
      style={{ background: "linear-gradient(180deg, #0f172a 0%, #0d1b2e 100%)" }}
    >
      {/* Brand */}
      <div className="flex h-16 items-center gap-3 border-b border-white/10 px-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/rosteriq-logo.png"
          alt="RosterIQ"
          className="h-7 w-auto object-contain brightness-[10] saturate-0"
        />
      </div>

      {/* Badge */}
      <div className="mx-4 mt-4 mb-2 flex items-center gap-2 rounded-lg bg-[#0d6e7a]/20 border border-[#0d6e7a]/40 px-3 py-2">
        <span className="flex h-2 w-2 rounded-full bg-[#0d6e7a] animate-pulse" />
        <span className="text-xs font-semibold tracking-wide text-[#4dd4e0] uppercase">
          Platform Admin
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <ul className="space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                    isActive
                      ? "bg-white/10 text-white"
                      : "text-white/60 hover:bg-white/5 hover:text-white"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0 transition-colors",
                      isActive
                        ? "text-[#4dd4e0]"
                        : "text-white/40 group-hover:text-white/70"
                    )}
                  />
                  <span className="flex-1">{item.label}</span>
                  {isActive && (
                    <ChevronRight className="h-3.5 w-3.5 text-white/30" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Divider */}
        <div className="mt-4 border-t border-white/10 pt-4">
          <Link
            href="/portal"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/50 hover:bg-white/5 hover:text-white/80 transition-all"
          >
            <AppWindow className="h-4 w-4 shrink-0 text-white/30" />
            Switch to Main App
          </Link>
        </div>
      </nav>

      {/* User footer */}
      <div className="border-t border-white/10 p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0d6e7a]/30 border border-[#0d6e7a]/50">
            <span className="text-xs font-bold text-[#4dd4e0]">{initials}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{fullName}</p>
            <p className="text-xs text-white/40">Platform Administrator</p>
          </div>
          <button
            onClick={handleLogout}
            className="ml-auto flex h-7 w-7 items-center justify-center rounded-md text-white/40 hover:bg-white/10 hover:text-white/80 transition-colors"
            title="Sign out"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
