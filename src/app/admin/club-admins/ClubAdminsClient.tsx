"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  UserCheck,
  Mail,
  Calendar,
  Building2,
  Loader2,
  CheckCircle,
  Send,
  RefreshCw,
  Clock,
  MoreHorizontal,
  UserX,
  Trash2,
  XCircle,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Tenant } from "@/types/database";

const ADMIN_ROLES = [
  { value: "club_admin", label: "Club Administrator" },
  { value: "club_director", label: "Club Director" },
  { value: "director_of_coaching", label: "Director of Coaching" },
];

export interface ClubAdminRow {
  id: string;
  user_id: string;
  tenant_id: string | null;
  role: string;
  created_at: string;
  email: string;
  profiles: { first_name: string | null; last_name: string | null; last_login_at: string | null } | null;
  tenants: { name: string } | null;
}

interface ClubAdminsClientProps {
  initialAdmins: ClubAdminRow[];
  tenants: Pick<Tenant, "id" | "name">[];
}

const ROLE_LABELS: Record<string, string> = {
  club_admin: "Club Administrator",
  club_director: "Club Director",
  director_of_coaching: "Director of Coaching",
};

const ROLE_COLORS: Record<string, string> = {
  club_admin:
    "bg-[#0d6e7a]/10 text-[#0d6e7a] border-[#0d6e7a]/20 hover:bg-[#0d6e7a]/10",
  club_director: "bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-50",
  director_of_coaching: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50",
};

export function ClubAdminsClient({ initialAdmins, tenants }: ClubAdminsClientProps) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successEmail, setSuccessEmail] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [resentId, setResentId] = useState<string | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ row: ClubAdminRow; type: "deactivate" | "delete" } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function handleConfirmAction() {
    if (!confirmAction) return;
    setActionLoading(true);
    setActionError(null);
    const { row, type } = confirmAction;
    const res = await fetch(`/api/admin/club-admins/${row.id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deleteUser: type === "delete" }),
    });
    setActionLoading(false);
    if (res.ok) {
      setConfirmAction(null);
      router.refresh();
    } else {
      const body = await res.json().catch(() => ({}));
      setActionError(body.error ?? "Action failed");
    }
  }

  async function handleResendInvite(adminRow: ClubAdminRow) {
    setResendingId(adminRow.id);
    const res = await fetch("/api/admin/club-admins/resend-invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: adminRow.email, userId: adminRow.user_id }),
    });
    setResendingId(null);
    if (res.ok) {
      setResentId(adminRow.id);
      setResendError(null);
      setTimeout(() => setResentId(null), 3000);
    } else {
      const body = await res.json().catch(() => ({}));
      setResendError(body.error ?? "Failed to resend invite");
      setTimeout(() => setResendError(null), 5000);
    }
  }

  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState("club_admin");
  const [tenantId, setTenantId] = useState("");

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/admin/club-admins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, firstName, lastName, role, tenantId: tenantId || null }),
    });

    const json = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(json.error ?? "Failed to send invite.");
      return;
    }

    setSuccessEmail(email);
    setShowForm(false);
    setEmail("");
    setFirstName("");
    setLastName("");
    setTenantId("");
    router.refresh();
  }

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Club Administrators</h1>
          <p className="mt-1 text-sm text-gray-500">
            Invite and manage administrators for each tenant club.
          </p>
        </div>
        <Button
          onClick={() => { setShowForm(true); setSuccessEmail(null); }}
          className="gap-2 bg-[#0d6e7a] hover:bg-[#0a5a65] text-white"
        >
          <Plus className="h-4 w-4" />
          Invite Administrator
        </Button>
      </div>

      {/* Success banner */}
      {successEmail && (
        <div className="mb-5 flex items-center gap-3 rounded-xl bg-emerald-50 border border-emerald-200 px-5 py-3">
          <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
          <p className="text-sm text-emerald-700">
            Invite sent to{" "}
            <span className="font-semibold">{successEmail}</span>. They will
            receive an email with a link to set their password and access their
            dashboard.
          </p>
        </div>
      )}

      {/* Invite form */}
      {showForm && (
        <Card className="mb-6 border-[#0d6e7a]/30 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Invite Club Administrator</CardTitle>
            <CardDescription>
              An invitation email will be sent. They set their password via the
              link and are assigned to the selected tenant.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleInvite} className="space-y-4">
              {error && (
                <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Email */}
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="inv-email">Email Address *</Label>
                  <Input
                    id="inv-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@coppellfc.com"
                    required
                  />
                </div>

                {/* First name */}
                <div className="space-y-1.5">
                  <Label htmlFor="inv-fn">First Name</Label>
                  <Input
                    id="inv-fn"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Jane"
                  />
                </div>

                {/* Last name */}
                <div className="space-y-1.5">
                  <Label htmlFor="inv-ln">Last Name</Label>
                  <Input
                    id="inv-ln"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Smith"
                  />
                </div>

                {/* Role */}
                <div className="space-y-1.5">
                  <Label htmlFor="inv-role">Role *</Label>
                  <Select value={role} onValueChange={setRole}>
                    <SelectTrigger id="inv-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ADMIN_ROLES.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Tenant */}
                <div className="space-y-1.5">
                  <Label htmlFor="inv-tenant">Assign to Tenant *</Label>
                  <Select value={tenantId} onValueChange={setTenantId}>
                    <SelectTrigger id="inv-tenant">
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
              </div>

              {/* Info callout */}
              <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 flex items-start gap-2.5">
                <Send className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                <p className="text-xs text-blue-700">
                  An invitation email will be sent to the address above. The recipient
                  clicks the link to set their password and gains immediate access to
                  their tenant dashboard.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForm(false)}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading || !email.trim() || !tenantId}
                  className="gap-2 bg-[#0d6e7a] hover:bg-[#0a5a65] text-white"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending…
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4" />
                      Send Invite
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Split into invited (pending) and active */}
      {(() => {
        const pending = initialAdmins.filter((a) => !a.profiles?.last_login_at);
        const active = initialAdmins.filter((a) => !!a.profiles?.last_login_at);

        const AdminTable = ({ rows, showResend }: { rows: ClubAdminRow[]; showResend: boolean }) => (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Administrator</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Tenant</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Registration</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {showResend ? "Invited" : "Last Login"}
                  </th>
                  <th className="px-4 py-3" />
                  {showResend && <th className="px-4 py-3" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((a) => {
                  const p = a.profiles;
                  const fullName = [p?.first_name, p?.last_name].filter(Boolean).join(" ") || a.email || "—";
                  const initials = [p?.first_name?.[0], p?.last_name?.[0]].filter(Boolean).join("").toUpperCase() || "?";
                  return (
                    <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600 shrink-0">
                            {initials}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{fullName}</p>
                            {showResend && <p className="text-xs text-gray-400">{a.email}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-gray-600">
                          <Building2 className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                          {a.tenants?.name ?? <span className="text-gray-400">All tenants</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={ROLE_COLORS[a.role] ?? "bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-100"}>
                          {ROLE_LABELS[a.role] ?? a.role}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {a.profiles?.last_login_at ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                              <CheckCircle className="h-3.5 w-3.5" /> Registered
                            </span>
                            <span className="text-xs text-gray-400">{new Date(a.profiles.last_login_at).toLocaleDateString()}</span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600">
                            <Clock className="h-3.5 w-3.5" /> Awaiting
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {showResend ? (
                          <div className="flex items-center gap-1 text-xs text-gray-400">
                            <Clock className="h-3.5 w-3.5" />
                            {new Date(a.created_at).toLocaleDateString()}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5 text-gray-400" />
                            {p?.last_login_at ? new Date(p.last_login_at).toLocaleDateString() : <span className="text-gray-400 italic">Never</span>}
                          </div>
                        )}
                      </td>
                      {showResend && (
                        <td className="px-4 py-3 text-right">
                          {resentId === a.id ? (
                            <span className="flex items-center justify-end gap-1 text-xs text-emerald-600 font-medium">
                              <CheckCircle className="h-3.5 w-3.5" /> Sent
                            </span>
                          ) : (
                            <button
                              onClick={() => handleResendInvite(a)}
                              disabled={resendingId === a.id}
                              className="flex items-center gap-1.5 text-xs font-medium text-[#0d6e7a] hover:underline disabled:opacity-50"
                            >
                              {resendingId === a.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <RefreshCw className="h-3.5 w-3.5" />
                              )}
                              Resend Invite
                            </button>
                          )}
                        </td>
                      )}
                      <td className="px-4 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="rounded p-1 hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              className="gap-2 text-amber-600 focus:text-amber-600 focus:bg-amber-50"
                              onClick={() => setConfirmAction({ row: a, type: "deactivate" })}
                            >
                              <UserX className="h-3.5 w-3.5" />
                              Deactivate
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="gap-2 text-red-600 focus:text-red-600 focus:bg-red-50"
                              onClick={() => setConfirmAction({ row: a, type: "delete" })}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Delete user
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );

        if (initialAdmins.length === 0) {
          return (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
                <UserCheck className="h-10 w-10 text-gray-300" />
                <p className="text-sm text-gray-500">No club administrators yet. Invite one using the button above.</p>
              </CardContent>
            </Card>
          );
        }

        return (
          <div className="space-y-6">
            {/* Resend error toast */}
            {resendError && (
              <div className="rounded-md bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700">
                {resendError}
              </div>
            )}
            {/* Pending / Invited */}
            {pending.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h2 className="text-sm font-semibold text-gray-700">Invited — Pending Registration</h2>
                  <Badge className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50">{pending.length}</Badge>
                </div>
                <Card>
                  <CardContent className="p-0">
                    <AdminTable rows={pending} showResend={true} />
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Active */}
            {active.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-gray-700 mb-2">Active Administrators</h2>
                <Card>
                  <CardContent className="p-0">
                    <AdminTable rows={active} showResend={false} />
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        );
      })()}

      {/* Confirmation modal for deactivate / delete */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${confirmAction.type === "delete" ? "bg-red-100" : "bg-amber-100"}`}>
                {confirmAction.type === "delete"
                  ? <Trash2 className="h-5 w-5 text-red-600" />
                  : <UserX className="h-5 w-5 text-amber-600" />}
              </div>
              <div>
                <h2 className="text-sm font-semibold text-gray-900">
                  {confirmAction.type === "delete" ? "Delete user?" : "Deactivate administrator?"}
                </h2>
                <p className="mt-1 text-xs text-gray-500">
                  {confirmAction.type === "delete"
                    ? <>This will permanently remove <span className="font-medium text-gray-700">{confirmAction.row.email}</span> from RosterIQ and delete their login account. This cannot be undone.</>
                    : <>This will remove <span className="font-medium text-gray-700">{confirmAction.row.email}</span>&apos;s access to RosterIQ. Their account will remain and can be re-invited.</>}
                </p>
              </div>
            </div>
            {actionError && (
              <p className="text-xs text-red-500">{actionError}</p>
            )}
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => { setConfirmAction(null); setActionError(null); }}
                disabled={actionLoading}
                className="px-3 py-1.5 text-sm rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAction}
                disabled={actionLoading}
                className={`px-3 py-1.5 text-sm rounded-md font-medium text-white disabled:opacity-50 flex items-center gap-1.5 ${confirmAction.type === "delete" ? "bg-red-600 hover:bg-red-700" : "bg-amber-500 hover:bg-amber-600"}`}
              >
                {actionLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {confirmAction.type === "delete" ? "Delete user" : "Deactivate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
