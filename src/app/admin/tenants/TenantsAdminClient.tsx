"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Building2,
  Globe,
  Key,
  CheckCircle,
  XCircle,
  Pencil,
  ChevronDown,
  ChevronUp,
  Loader2,
} from "lucide-react";
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

const TIMEZONES: { value: string; label: string }[] = [
  // United States
  { value: "America/New_York",    label: "Eastern Time — New York, NY / Miami, FL / Atlanta, GA" },
  { value: "America/Chicago",     label: "Central Time — Chicago, IL / Dallas, TX / Houston, TX" },
  { value: "America/Denver",      label: "Mountain Time — Denver, CO / Salt Lake City, UT" },
  { value: "America/Phoenix",     label: "Mountain Time (no DST) — Phoenix, AZ" },
  { value: "America/Los_Angeles", label: "Pacific Time — Los Angeles, CA / Seattle, WA / Portland, OR" },
  { value: "America/Anchorage",   label: "Alaska Time — Anchorage, AK" },
  { value: "Pacific/Honolulu",    label: "Hawaii Time — Honolulu, HI" },
  // Canada
  { value: "America/Toronto",     label: "Eastern Time — Toronto, ON" },
  { value: "America/Vancouver",   label: "Pacific Time — Vancouver, BC" },
  // Europe
  { value: "Europe/London",       label: "GMT/BST — London, UK" },
  { value: "Europe/Paris",        label: "Central European Time — Paris, FR / Berlin, DE" },
  // Asia / Pacific
  { value: "Asia/Tokyo",          label: "Japan Time — Tokyo, JP" },
  { value: "Australia/Sydney",    label: "Australian Eastern Time — Sydney, AU" },
];

export interface TenantWithCodes {
  id: string;
  name: string;
  timezone: string;
  address_text: string | null;
  logo_url: string | null;
  status: string;
  created_at: string;
  access_codes: Array<{ id: string; code: string; is_active: boolean }>;
}

interface TenantsAdminClientProps {
  initialTenants: TenantWithCodes[];
}

// ─── Suggest an access code from club name ───────────────────────────────────
function suggestCode(name: string): string {
  const words = name.trim().toLowerCase().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 4).replace(/[^a-z0-9]/g, "");
  // Use initials for multi-word names
  return words.map((w) => w[0]).join("").replace(/[^a-z0-9]/g, "");
}

// ─── Create Form ─────────────────────────────────────────────────────────────
interface CreateFormProps {
  onCreated: (t: TenantWithCodes) => void;
  onCancel: () => void;
}

function CreateForm({ onCreated, onCancel }: CreateFormProps) {
  const [name, setName] = useState("");
  const [timezone, setTimezone] = useState("America/Chicago");
  const [address, setAddress] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [codeManuallyEdited, setCodeManuallyEdited] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleNameChange(val: string) {
    setName(val);
    if (!codeManuallyEdited) {
      setAccessCode(suggestCode(val));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/admin/tenants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        timezone,
        addressText: address,
        logoUrl,
        accessCode,
      }),
    });

    const json = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(json.error ?? "Failed to create tenant.");
      return;
    }

    onCreated({
      ...json.tenant,
      access_codes: [{ id: "new", code: json.accessCode, is_active: true }],
    });
  }

  return (
    <Card className="mb-6 border-[#0d6e7a]/30 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Create New Tenant</CardTitle>
        <CardDescription>
          Add a new club to the platform with its access code.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Club name */}
            <div className="space-y-1.5">
              <Label htmlFor="cn-name">Club Name *</Label>
              <Input
                id="cn-name"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Coppell FC"
                required
              />
            </div>

            {/* Access code */}
            <div className="space-y-1.5">
              <Label htmlFor="cn-code">
                Access Code *{" "}
                <span className="font-normal text-gray-400">(auto-suggested)</span>
              </Label>
              <div className="relative">
                <Key className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
                <Input
                  id="cn-code"
                  value={accessCode}
                  onChange={(e) => {
                    setCodeManuallyEdited(true);
                    setAccessCode(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ""));
                  }}
                  className="pl-8 font-mono"
                  placeholder="cfc"
                  required
                />
              </div>
              <p className="text-xs text-gray-400">
                Users enter this code when requesting access.
              </p>
            </div>

            {/* Timezone */}
            <div className="space-y-1.5">
              <Label htmlFor="cn-tz">Timezone *</Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger id="cn-tz">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Address */}
            <div className="space-y-1.5">
              <Label htmlFor="cn-addr">Address</Label>
              <Input
                id="cn-addr"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="123 Main St, Coppell, TX"
              />
            </div>

            {/* Logo URL */}
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="cn-logo">Club Logo URL</Label>
              <Input
                id="cn-logo"
                type="url"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://example.com/logo.png"
              />
              {logoUrl && (
                <div className="mt-1 flex items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={logoUrl}
                    alt="Logo preview"
                    className="h-8 w-8 rounded object-contain border border-gray-200"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                  <span className="text-xs text-gray-400">Preview</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !name.trim() || !accessCode.trim()}
              className="bg-[#0d6e7a] hover:bg-[#0a5a65] text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating…
                </>
              ) : (
                "Create Tenant"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ─── Edit Row ─────────────────────────────────────────────────────────────────
interface EditRowProps {
  tenant: TenantWithCodes;
  onUpdated: (t: TenantWithCodes) => void;
  onClose: () => void;
}

function EditRow({ tenant, onUpdated, onClose }: EditRowProps) {
  const activeCode = tenant.access_codes.find((c) => c.is_active)?.code ?? "";
  const [name, setName] = useState(tenant.name);
  const [timezone, setTimezone] = useState(tenant.timezone);
  const [address, setAddress] = useState(tenant.address_text ?? "");
  const [logoUrl, setLogoUrl] = useState(tenant.logo_url ?? "");
  const [accessCode, setAccessCode] = useState(activeCode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch(`/api/admin/tenants/${tenant.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        timezone,
        addressText: address,
        logoUrl,
        accessCode: accessCode !== activeCode ? accessCode : undefined,
      }),
    });

    const json = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(json.error ?? "Failed to update.");
      return;
    }

    onUpdated({
      ...tenant,
      name,
      timezone,
      address_text: address || null,
      logo_url: logoUrl || null,
      access_codes:
        accessCode !== activeCode
          ? [{ id: "updated", code: accessCode, is_active: true }]
          : tenant.access_codes,
    });
  }

  return (
    <form onSubmit={handleSave} className="p-4 border-t border-gray-100 bg-slate-50">
      {error && (
        <div className="mb-3 rounded-md bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 mb-4">
        <div>
          <Label className="text-xs">Club Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label className="text-xs">Access Code</Label>
          <Input
            value={accessCode}
            onChange={(e) =>
              setAccessCode(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ""))
            }
            className="mt-1 font-mono"
          />
        </div>
        <div>
          <Label className="text-xs">Timezone</Label>
          <Select value={timezone} onValueChange={setTimezone}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIMEZONES.map((tz) => (
                <SelectItem key={tz.value} value={tz.value}>
                  {tz.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Address</Label>
          <Input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="mt-1"
            placeholder="Optional"
          />
        </div>
        <div className="sm:col-span-2">
          <Label className="text-xs">Logo URL</Label>
          <Input
            type="url"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            className="mt-1"
            placeholder="https://…"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          type="submit"
          size="sm"
          disabled={loading}
          className="bg-[#0d6e7a] hover:bg-[#0a5a65] text-white"
        >
          {loading ? "Saving…" : "Save Changes"}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

// ─── Main Client ──────────────────────────────────────────────────────────────
export function TenantsAdminClient({ initialTenants }: TenantsAdminClientProps) {
  const router = useRouter();
  const [tenants, setTenants] = useState<TenantWithCodes[]>(initialTenants);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  async function handleStatusToggle(tenant: TenantWithCodes) {
    setTogglingId(tenant.id);
    const newStatus = tenant.status === "active" ? "inactive" : "active";
    await fetch(`/api/admin/tenants/${tenant.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    setTenants((prev) =>
      prev.map((t) => (t.id === tenant.id ? { ...t, status: newStatus } : t))
    );
    setTogglingId(null);
    router.refresh();
  }

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tenants</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage clubs, organizations, and their access codes.
          </p>
        </div>
        <Button
          onClick={() => { setShowCreate(true); setEditingId(null); }}
          className="gap-2 bg-[#0d6e7a] hover:bg-[#0a5a65] text-white"
        >
          <Plus className="h-4 w-4" />
          New Tenant
        </Button>
      </div>

      {/* Create form */}
      {showCreate && (
        <CreateForm
          onCreated={(t) => {
            setTenants((prev) =>
              [...prev, t].sort((a, b) => a.name.localeCompare(b.name))
            );
            setShowCreate(false);
            router.refresh();
          }}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {tenants.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Building2 className="h-10 w-10 text-gray-300" />
              <p className="mt-4 text-sm text-gray-500">
                No tenants yet. Create your first one above.
              </p>
            </div>
          ) : (
            <div>
              {tenants.map((tenant, idx) => {
                const activeCode = tenant.access_codes.find((c) => c.is_active);
                const isEditing = editingId === tenant.id;

                return (
                  <div
                    key={tenant.id}
                    className={idx < tenants.length - 1 ? "border-b border-gray-100" : ""}
                  >
                    {/* Row */}
                    <div className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50/60 transition-colors">
                      {/* Logo / icon */}
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white overflow-hidden">
                        {tenant.logo_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={tenant.logo_url}
                            alt={tenant.name}
                            className="h-8 w-8 object-contain"
                          />
                        ) : (
                          <Building2 className="h-5 w-5 text-gray-400" />
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">
                          {tenant.name}
                        </p>
                        <div className="mt-0.5 flex items-center flex-wrap gap-3 text-xs text-gray-400">
                          <span className="flex items-center gap-1">
                            <Globe className="h-3 w-3" />
                            {tenant.timezone}
                          </span>
                          {activeCode && (
                            <span className="flex items-center gap-1 font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-600">
                              <Key className="h-2.5 w-2.5" />
                              {activeCode.code}
                            </span>
                          )}
                          {tenant.address_text && (
                            <span className="truncate max-w-xs">{tenant.address_text}</span>
                          )}
                        </div>
                      </div>

                      {/* Status badge */}
                      <Badge
                        className={
                          tenant.status === "active"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                            : "bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-100"
                        }
                      >
                        {tenant.status === "active" ? (
                          <CheckCircle className="mr-1 h-3 w-3" />
                        ) : (
                          <XCircle className="mr-1 h-3 w-3" />
                        )}
                        {tenant.status}
                      </Badge>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => setEditingId(isEditing ? null : tenant.id)}
                          className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                        >
                          <Pencil className="h-3 w-3" />
                          Edit
                          {isEditing ? (
                            <ChevronUp className="h-3 w-3" />
                          ) : (
                            <ChevronDown className="h-3 w-3" />
                          )}
                        </button>
                        <button
                          onClick={() => handleStatusToggle(tenant)}
                          disabled={togglingId === tenant.id}
                          className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                            tenant.status === "active"
                              ? "text-red-500 hover:bg-red-50 hover:text-red-600"
                              : "text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                          }`}
                        >
                          {togglingId === tenant.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : tenant.status === "active" ? (
                            <XCircle className="h-3 w-3" />
                          ) : (
                            <CheckCircle className="h-3 w-3" />
                          )}
                          {tenant.status === "active" ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    </div>

                    {/* Inline edit panel */}
                    {isEditing && (
                      <EditRow
                        tenant={tenant}
                        onUpdated={(updated) => {
                          setTenants((prev) =>
                            prev.map((t) => (t.id === updated.id ? updated : t))
                          );
                          setEditingId(null);
                          router.refresh();
                        }}
                        onClose={() => setEditingId(null)}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
