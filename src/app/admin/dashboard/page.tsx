import { createAdminClient } from "@/lib/supabase/admin";
import { Building2, Users, UserCheck, Clock } from "lucide-react";
import Link from "next/link";

export const runtime = "nodejs";

async function getStats() {
  const admin = createAdminClient();

  const [
    { count: tenantCount },
    { count: adminCount },
    { count: pendingCount },
    { data: recentTenants },
  ] = await Promise.all([
    admin.from("tenants").select("id", { count: "exact", head: true }).eq("status", "active"),
    admin.from("memberships").select("id", { count: "exact", head: true }).in("role", ["club_admin", "club_director"]),
    admin.from("access_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
    admin.from("tenants").select("id, name, created_at, status").order("created_at", { ascending: false }).limit(5),
  ]);

  return {
    tenantCount: tenantCount ?? 0,
    adminCount: adminCount ?? 0,
    pendingCount: pendingCount ?? 0,
    recentTenants: recentTenants ?? [],
  };
}

export default async function AdminDashboardPage() {
  const { tenantCount, adminCount, pendingCount, recentTenants } = await getStats();

  const stats = [
    {
      label: "Active Tenants",
      value: tenantCount,
      icon: Building2,
      color: "text-[#0d6e7a]",
      bg: "bg-[#0d6e7a]/10",
      href: "/admin/tenants",
    },
    {
      label: "Club Administrators",
      value: adminCount,
      icon: UserCheck,
      color: "text-violet-600",
      bg: "bg-violet-50",
      href: "/admin/club-admins",
    },
    {
      label: "Pending Access Requests",
      value: pendingCount,
      icon: Clock,
      color: "text-amber-600",
      bg: "bg-amber-50",
      href: "/app/requests",
    },
  ];

  return (
    <div className="max-w-6xl">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Platform overview — tenants, administrators, and activity.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-8">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Link
              key={s.label}
              href={s.href}
              className="rounded-xl border border-gray-200 bg-white p-5 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{s.label}</p>
                  <p className="mt-1 text-3xl font-bold text-gray-900">
                    {s.value}
                  </p>
                </div>
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${s.bg}`}>
                  <Icon className={`h-6 w-6 ${s.color}`} />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {/* Recent tenants */}
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-gray-900">Recent Tenants</h2>
            <Link
              href="/admin/tenants"
              className="text-xs text-[#0d6e7a] hover:underline"
            >
              View all →
            </Link>
          </div>
          <ul className="divide-y divide-gray-50">
            {recentTenants.length === 0 ? (
              <li className="px-5 py-4 text-sm text-gray-400">No tenants yet.</li>
            ) : (
              recentTenants.map((t) => (
                <li key={t.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
                    <Building2 className="h-4 w-4 text-slate-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {t.name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(t.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-medium rounded-full px-2 py-0.5 ${
                      t.status === "active"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {t.status}
                  </span>
                </li>
              ))
            )}
          </ul>
        </div>

        {/* Quick actions */}
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="border-b border-gray-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-gray-900">Quick Actions</h2>
          </div>
          <div className="p-5 flex flex-col gap-3">
            <Link
              href="/admin/tenants"
              className="flex items-center gap-3 rounded-lg border border-dashed border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 hover:border-[#0d6e7a] hover:text-[#0d6e7a] transition-colors group"
            >
              <Building2 className="h-4 w-4 text-gray-400 group-hover:text-[#0d6e7a]" />
              Add a new tenant
            </Link>
            <Link
              href="/admin/club-admins"
              className="flex items-center gap-3 rounded-lg border border-dashed border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 hover:border-violet-500 hover:text-violet-600 transition-colors group"
            >
              <Users className="h-4 w-4 text-gray-400 group-hover:text-violet-500" />
              Invite a club administrator
            </Link>
            <Link
              href="/app/requests"
              className="flex items-center gap-3 rounded-lg border border-dashed border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 hover:border-amber-400 hover:text-amber-600 transition-colors group"
            >
              <Clock className="h-4 w-4 text-gray-400 group-hover:text-amber-500" />
              Review access requests
              {pendingCount > 0 && (
                <span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
                  {pendingCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
