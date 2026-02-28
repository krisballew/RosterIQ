"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Building2, Globe, CheckCircle, XCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
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

const TIMEZONES = [
  "America/Chicago",
  "America/New_York",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Anchorage",
  "Pacific/Honolulu",
  "Europe/London",
  "Europe/Paris",
  "Asia/Tokyo",
];

interface TenantsClientProps {
  initialTenants: Tenant[];
}

export function TenantsClient({ initialTenants }: TenantsClientProps) {
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>(initialTenants);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [timezone, setTimezone] = useState("America/Chicago");
  const [addressText, setAddressText] = useState("");
  const [logoUrl, setLogoUrl] = useState("");

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { data, error: insertError } = await supabase
      .from("tenants")
      .insert({
        name,
        timezone,
        address_text: addressText || null,
        logo_url: logoUrl || null,
        status: "active",
      })
      .select()
      .single();

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    if (data) {
      setTenants((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    }

    setShowForm(false);
    setName("");
    setAddressText("");
    setLogoUrl("");
    setLoading(false);
    router.refresh();
  }

  async function handleStatusToggle(tenant: Tenant) {
    const supabase = createClient();
    const newStatus = tenant.status === "active" ? "inactive" : "active";
    const { error } = await supabase
      .from("tenants")
      .update({ status: newStatus })
      .eq("id", tenant.id);

    if (!error) {
      setTenants((prev) =>
        prev.map((t) => (t.id === tenant.id ? { ...t, status: newStatus } : t))
      );
    }
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tenants</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage clubs and organizations on the platform.
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Tenant
        </Button>
      </div>

      {/* Create Form */}
      {showForm && (
        <Card className="mb-6 border-blue-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Create New Tenant</CardTitle>
            <CardDescription>
              Add a new club or organization to the platform.
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
                  <Label htmlFor="name">Club Name *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Coppell FC"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="timezone">Timezone *</Label>
                  <Select value={timezone} onValueChange={setTimezone}>
                    <SelectTrigger id="timezone">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONES.map((tz) => (
                        <SelectItem key={tz} value={tz}>
                          {tz}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={addressText}
                    onChange={(e) => setAddressText(e.target.value)}
                    placeholder="123 Main St, City, TX"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="logo">Logo URL</Label>
                  <Input
                    id="logo"
                    type="url"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://example.com/logo.png"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Creating…" : "Create Tenant"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Tenants Table */}
      <Card>
        <CardContent className="p-0">
          {tenants.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Building2 className="h-10 w-10 text-gray-300" />
              <p className="mt-4 text-sm text-gray-500">
                No tenants yet. Create your first tenant above.
              </p>
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
                      Timezone
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">
                      Created
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-600">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {tenants.map((tenant) => (
                    <tr key={tenant.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-gray-400 shrink-0" />
                          <span className="font-medium text-gray-900">
                            {tenant.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        <div className="flex items-center gap-1">
                          <Globe className="h-3.5 w-3.5 text-gray-400" />
                          {tenant.timezone}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            tenant.status === "active" ? "success" : "secondary"
                          }
                        >
                          {tenant.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {new Date(tenant.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleStatusToggle(tenant)}
                          className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                        >
                          {tenant.status === "active" ? (
                            <>
                              <XCircle className="h-3.5 w-3.5 text-red-400" />
                              Deactivate
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                              Activate
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
