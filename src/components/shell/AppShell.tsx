"use client";

import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import type { Profile, Tenant, Role } from "@/types/database";

interface AppShellProps {
  children: React.ReactNode;
  isPlatformAdmin: boolean;
  isClubAdmin: boolean;
  pendingRequestsCount: number;
  currentTenant: Tenant | null;
  highestRole: Role | null;
  profile: Profile | null;
  highestRoleLabel: string;
  tenants: Tenant[];
  currentTenantId: string | null;
}

export function AppShell({
  children,
  isPlatformAdmin,
  isClubAdmin,
  pendingRequestsCount,
  currentTenant,
  highestRole,
  profile,
  highestRoleLabel,
  tenants,
  currentTenantId,
}: AppShellProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar 
        isPlatformAdmin={isPlatformAdmin} 
        isClubAdmin={isClubAdmin} 
        pendingRequestsCount={pendingRequestsCount} 
        currentTenant={currentTenant} 
        highestRole={highestRole}
        isMobileOpen={isMobileMenuOpen}
        onMobileClose={() => setIsMobileMenuOpen(false)}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          profile={profile}
          highestRoleLabel={highestRoleLabel}
          tenants={tenants}
          currentTenantId={currentTenantId}
          onMobileMenuToggle={() => setIsMobileMenuOpen(true)}
        />
        <main className="flex-1 overflow-y-auto p-3 md:p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
