"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, UserCheck, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Tenant } from "@/types/database";

export interface MembershipRow {
  id: string;
  user_id: string;
  tenant_id: string | null;
  role: string;
  created_at: string;
  profiles: {
    first_name: string | null;
    last_name: string | null;
    last_login_at: string | null;
  } | null;
}

interface AdminsClientProps {
  initialMemberships: MembershipRow[];
  tenants: Pick<Tenant, "id" | "name">[];
}

export function AdminsClient({ initialMemberships, tenants }: AdminsClientProps) {
  const router = useRouter();
  const [memberships] = useState<MembershipRow[]>(initialMemberships);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState<"platform_admin" | "club_admin">("club_admin");
  const [tenantId, setTenantId] = useState<string>("");

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const res = await fetch("/api/platform/admin-users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        firstName,
        lastName,
        role,
        tenantId: role === "platform_admin" ? null : tenantId || null,
      }),
    });

    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Failed to create user");
      setLoading(false);
      return;
    }

    setSuccess(`Admin user created. They can now sign in at ${email}.`);
    setShowForm(false);
    setEmail("");
    setFirstName("");
    setLastName("");
    setTenantId("");
    setLoading(false);
    router.refresh();
  }

  const roleLabel: Record<string, string> = {
    platform_admin: "Platform Administrator",
    club_admin: "Club Administrator",
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Users</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage platform and club administrators.
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Admin
        </Button>
      </div>

      {/* Create Form */}
      {showForm && (
        <Card className="mb-6 border-blue-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Create Admin User</CardTitle>
            <CardDescription>
              Create an account and assign an admin role.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              {error && (
                <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@club.com"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="role">Role *</Label>
                  <Select
                    value={role}
                    onValueChange={(v) =>
                      setRole(v as "platform_admin" | "club_admin")
                    }
                  >
                    <SelectTrigger id="role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="club_admin">Club Administrator</SelectItem>
                      <SelectItem value="platform_admin">
                        Platform Administrator
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Jane"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Smith"
                  />
                </div>
                {role === "club_admin" && (
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="tenant">Assign to Tenant *</Label>
                    <Select value={tenantId} onValueChange={setTenantId}>
                      <SelectTrigger id="tenant">
                        <SelectValue placeholder="Select a tenant…" />
                      </SelectTrigger>
                      <SelectContent>
                        {tenants.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    loading || (role === "club_admin" && !tenantId)
                  }
                >
                  {loading ? "Creating…" : "Create Admin"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {success && (
        <div className="mb-4 rounded-md bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
          {success}
        </div>
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {memberships.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <UserCheck className="h-10 w-10 text-gray-300" />
              <p className="mt-4 text-sm text-gray-500">No admin users yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">
                      Role
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">
                      Tenant
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">
                      Last Login
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {memberships.map((m) => {
                    const p = m.profiles;
                    const name =
                      [p?.first_name, p?.last_name].filter(Boolean).join(" ") ||
                      "—";
                    return (
                      <tr key={m.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {name}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={
                              m.role === "platform_admin"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {roleLabel[m.role] ?? m.role}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {m.tenant_id
                            ? String(m.tenant_id).substring(0, 8) + "…"
                            : "All tenants"}
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5 text-gray-400" />
                            {p?.last_login_at
                              ? new Date(p.last_login_at).toLocaleString()
                              : "Never"}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
