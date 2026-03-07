"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { LogOut, ChevronDown, Menu } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";
import type { Profile, Tenant } from "@/types/database";

interface HeaderProps {
  profile: Profile | null;
  highestRoleLabel: string;
  tenants: Tenant[];
  currentTenantId: string | null;
  onMobileMenuToggle?: () => void;
}

export function Header({
  profile,
  highestRoleLabel,
  tenants,
  currentTenantId,
  onMobileMenuToggle,
}: HeaderProps) {
  const router = useRouter();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedTenantId, setSelectedTenantId] = useState(
    currentTenantId ?? tenants[0]?.id ?? null
  );

  const selectedTenant = tenants.find((t) => t.id === selectedTenantId);

  useEffect(() => {
    const tick = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(tick);
  }, []);

  const formattedTime = selectedTenant
    ? new Intl.DateTimeFormat("en-US", {
        timeZone: selectedTenant.timezone,
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).format(currentTime)
    : format(currentTime, "EEE, MMM d yyyy HH:mm:ss");

  const initials =
    [profile?.first_name?.[0], profile?.last_name?.[0]]
      .filter(Boolean)
      .join("")
      .toUpperCase() || "?";

  const fullName = [profile?.first_name, profile?.last_name]
    .filter(Boolean)
    .join(" ");

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  function handleTenantChange(tenantId: string) {
    setSelectedTenantId(tenantId);
    // Store in localStorage for persistence
    localStorage.setItem("rosteriq_tenant_id", tenantId);
    router.refresh();
  }

  return (
    <header className="flex h-14 md:h-16 items-center justify-between border-b border-gray-200 bg-white px-3 md:px-6">
      {/* Left: Mobile menu + Tenant Selector + Date/Time */}
      <div className="flex items-center gap-2 md:gap-4">
        {/* Mobile menu button */}
        <button
          onClick={onMobileMenuToggle}
          className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5 text-gray-600" />
        </button>
        
        {tenants.length > 1 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1.5 md:gap-2 rounded-lg border border-gray-200 px-2 md:px-3 py-1.5 text-xs md:text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                <span className="truncate max-w-25 md:max-w-none">
                  {selectedTenant?.name ?? "Select Tenant"}
                </span>
                <ChevronDown className="h-3 md:h-3.5 w-3 md:w-3.5 text-gray-400 shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuLabel>Switch Tenant</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {tenants.map((t) => (
                <DropdownMenuItem
                  key={t.id}
                  onClick={() => handleTenantChange(t.id)}
                  className={
                    selectedTenantId === t.id ? "bg-blue-50 text-blue-700" : ""
                  }
                >
                  {t.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <span className="hidden md:inline-block text-xs md:text-sm text-gray-500 font-mono tabular-nums">
          {formattedTime}
        </span>
      </div>

      {/* Right: User Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 md:gap-3 rounded-lg px-1 md:px-2 py-1.5 hover:bg-gray-50 transition-colors">
            <Avatar className="h-7 w-7 md:h-8 md:w-8">
              {profile?.avatar_url && (
                <AvatarImage src={profile.avatar_url} alt={fullName} />
              )}
              <AvatarFallback className="text-xs md:text-sm">{initials}</AvatarFallback>
            </Avatar>
            <div className="text-left hidden md:block">
              <p className="text-sm font-medium text-gray-900 leading-none">
                {fullName || "Unknown User"}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">{highestRoleLabel}</p>
            </div>
            <ChevronDown className="h-3 w-3 md:h-3.5 md:w-3.5 text-gray-400" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel>
            <div>
              <p className="font-medium text-gray-900">{fullName}</p>
              <p className="text-xs text-gray-500 font-normal mt-0.5">
                {highestRoleLabel}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleLogout}
            className="text-red-600 focus:text-red-600 focus:bg-red-50"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
