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
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/app/home", label: "Home", icon: LayoutDashboard },
  { href: "/app/roster", label: "Roster Management", icon: Users },
  { href: "/app/reviews", label: "Player Reviews", icon: ClipboardList },
  { href: "/app/education", label: "Education", icon: BookOpen },
  { href: "/app/recruitment", label: "Recruitment", icon: Search },
  { href: "/app/fields", label: "Field Assignments", icon: MapPin },
];

interface SidebarProps {
  isPlatformAdmin: boolean;
}

export function Sidebar({ isPlatformAdmin }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-64 flex-col border-r border-gray-200 bg-white">
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-gray-200 px-6">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
            <span className="text-sm font-bold text-white">R</span>
          </div>
          <span className="text-lg font-bold text-gray-900">RosterIQ</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
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
