"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  BookOpen,
  Search,
  MapPin,
  Shield,
  UserCheck,
  UserCog,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Tenant } from "@/types/database";
import type { Role } from "@/types/database";

const navItems = [
  { href: "/app/home", label: "Home", icon: LayoutDashboard },
  { href: "/app/roster", label: "Roster Management", icon: Users },
  { href: "/app/lineup", label: "Lineup Builder", icon: Layers },
  { href: "/app/reviews", label: "Player Reviews", icon: ClipboardList },
  { href: "/app/education", label: "Education", icon: BookOpen },
  { href: "/app/my-training", label: "My Training", icon: BookOpen },
  { href: "/app/recruitment", label: "Recruitment", icon: Search },
  { href: "/app/fields", label: "Field Assignments", icon: MapPin },
];

interface SidebarProps {
  isPlatformAdmin: boolean;
  isClubAdmin?: boolean;
  pendingRequestsCount?: number;
  currentTenant?: Tenant | null;
  highestRole?: Role | null;
}

export function Sidebar({ isPlatformAdmin, isClubAdmin = false, pendingRequestsCount = 0, currentTenant, highestRole }: SidebarProps) {
  const pathname = usePathname();

  // Determine which nav items to show based on role
  const isPlayer = highestRole && ["select_player", "academy_player"].includes(highestRole);
  
  const visibleNavItems = isPlayer
    ? navItems.filter((item) => 
        ["/app/home", "/app/reviews", "/app/education", "/app/my-training"].includes(item.href)
      )
    : navItems;

  return (
    <aside className="flex h-full w-64 flex-col bg-white">
      {/* Logo */}
      <div className="flex h-16 items-center px-6">
        <div className="flex items-center gap-2 min-w-0">
          {currentTenant?.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={currentTenant.logo_url}
              alt={currentTenant.name}
              className="h-8 w-8 rounded-lg object-contain flex-shrink-0"
            />
          ) : (
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-blue-600">
              <span className="text-sm font-bold text-white">
                {currentTenant ? currentTenant.name[0].toUpperCase() : "R"}
              </span>
            </div>
          )}
          <span className="text-base font-bold text-gray-900 truncate">
            {currentTenant ? currentTenant.name : "RosterIQ"}
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0",
                      isActive ? "text-blue-600" : "text-gray-400"
                    )}
                  />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>

        {!isPlayer && (isClubAdmin || isPlatformAdmin) && (
          <div className="mt-6">
            <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
              Club Admin
            </p>
            <ul className="space-y-1">
              <li>
                <Link
                  href="/app/requests"
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    pathname === "/app/requests" || pathname.startsWith("/app/requests/")
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  )}
                >
                  <UserCheck
                    className={cn(
                      "h-4 w-4 shrink-0",
                      pathname === "/app/requests" || pathname.startsWith("/app/requests/")
                        ? "text-blue-600"
                        : "text-gray-400"
                    )}
                  />
                  <span className="flex-1">Access Requests</span>
                  {pendingRequestsCount > 0 && (
                    <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-xs font-bold text-white">
                      {pendingRequestsCount}
                    </span>
                  )}
                </Link>
              </li>
              <li>
                <Link
                  href="/app/admin/users"
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    pathname === "/app/admin/users" || pathname.startsWith("/app/admin/users/")
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  )}
                >
                  <UserCog
                    className={cn(
                      "h-4 w-4 shrink-0",
                      pathname === "/app/admin/users" || pathname.startsWith("/app/admin/users/")
                        ? "text-blue-600"
                        : "text-gray-400"
                    )}
                  />
                  User Administration
                </Link>
              </li>
            </ul>
          </div>
        )}

        {isPlatformAdmin && (
          <div className="mt-6">
            <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
              Administration
            </p>
            <ul className="space-y-1">
              <li>
                <Link
                  href="/platform/tenants"
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    pathname.startsWith("/platform")
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  )}
                >
                  <Shield
                    className={cn(
                      "h-4 w-4 shrink-0",
                      pathname.startsWith("/platform")
                        ? "text-blue-600"
                        : "text-gray-400"
                    )}
                  />
                  Platform Admin
                </Link>
              </li>
            </ul>
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-200 p-4">
        <p className="text-xs text-gray-400 text-center">© 2026 RosterIQ</p>
      </div>
    </aside>
  );
}
