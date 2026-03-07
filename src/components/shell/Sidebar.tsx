"use client";

import { useState, useEffect } from "react";
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
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Tenant } from "@/types/database";
import type { Role } from "@/types/database";

const navItems = [
  { href: "/app/home", label: "Home", icon: LayoutDashboard },
  { href: "/app/roster", label: "Roster Management", icon: Users },
  { href: "/app/lineup", label: "Lineup Builder", icon: Layers },
  { href: "/app/recruitment", label: "Recruitment", icon: Search },
  { href: "/app/fields", label: "Field Assignments", icon: MapPin },
  { href: "/app/education", label: "Education", icon: BookOpen },
];

const coachNavItems = [
  { href: "/app/home", label: "Home", icon: LayoutDashboard },
  { href: "/app/roster", label: "Roster Management", icon: Users },
  { href: "/app/lineup", label: "Lineup Builder", icon: Layers },
  { href: "/app/my-recruitment", label: "My Recruitment", icon: Search },
  { href: "/app/fields", label: "Field Assignments", icon: MapPin },
  { href: "/app/education", label: "Education", icon: BookOpen },
];

const playerNavItems = [
  { href: "/app/home", label: "Home", icon: LayoutDashboard },
  { href: "/app/my-reviews", label: "My Reviews", icon: ClipboardList },
  { href: "/app/education", label: "Education", icon: BookOpen },
  { href: "/app/my-training", label: "My Training", icon: BookOpen },
];

const coachAdminReviewItem = { href: "/app/reviews", label: "Player Reviews", icon: ClipboardList };

interface SidebarProps {
  isPlatformAdmin: boolean;
  isClubAdmin?: boolean;
  pendingRequestsCount?: number;
  currentTenant?: Tenant | null;
  highestRole?: Role | null;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ 
  isPlatformAdmin, 
  isClubAdmin = false, 
  pendingRequestsCount = 0, 
  currentTenant, 
  highestRole,
  isMobileOpen = false,
  onMobileClose 
}: SidebarProps) {
  const pathname = usePathname();

  // Close mobile menu when route changes
  useEffect(() => {
    if (isMobileOpen && onMobileClose) {
      onMobileClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Determine which nav items to show based on role
  const isPlayer = highestRole && ["select_player", "academy_player"].includes(highestRole);
  const isCoach = highestRole && ["select_coach", "academy_coach"].includes(highestRole);

  const visibleNavItems = isPlayer ? playerNavItems : [
    ...(isCoach ? coachNavItems : navItems),
    coachAdminReviewItem,
  ];

  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onMobileClose}
        />
      )}
      
      {/* Sidebar */}
      <aside className={cn(
        "fixed lg:static inset-y-0 left-0 z-50 flex h-full w-64 flex-col bg-white transition-transform duration-300 ease-in-out lg:translate-x-0 border-r border-gray-200",
        isMobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Logo */}
        <div className="flex h-16 items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-2 min-w-0">
            {currentTenant?.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={currentTenant.logo_url}
                alt={currentTenant.name}
                className="h-8 w-8 rounded-lg object-contain shrink-0"
              />
            ) : (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600">
                <span className="text-sm font-bold text-white">
                  {currentTenant ? currentTenant.name[0].toUpperCase() : "R"}
                </span>
              </div>
            )}
            <span className="text-base font-bold text-gray-900 truncate">
              {currentTenant ? currentTenant.name : "RosterIQ"}
            </span>
          </div>
          
          {/* Close button for mobile */}
          <button
            onClick={onMobileClose}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Close menu"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
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
    </>
  );
}
