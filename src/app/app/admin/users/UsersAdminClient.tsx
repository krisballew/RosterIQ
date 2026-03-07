"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  UserPlus,
  Users,
  Pencil,
  Power,
  PowerOff,
  Upload,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface TenantUser {
  id: string;
  user_id: string;
  role: string;
  is_active: boolean;
  created_at: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
}

interface BulkResult {
  email: string;
  success: boolean;
  error?: string;
}

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const ASSIGNABLE_ROLES = [
  "club_admin",
  "club_director",
  "director_of_coaching",
  "select_coach",
  "academy_coach",
  "select_player",
  "academy_player",
] as const;

const ROLE_LABELS: Record<string, string> = {
  club_admin: "Club Admin",
  club_director: "Club Director",
  director_of_coaching: "Director of Coaching",
  select_coach: "Select Coach",
  academy_coach: "Academy Coach",
  select_player: "Select Player",
  academy_player: "Academy Player",
};

function roleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function displayName(u: TenantUser): string {
  const full = [u.first_name, u.last_name].filter(Boolean).join(" ");
  return full || u.email;
}

// ─────────────────────────────────────────────────────────────
// Add User Dialog
// ─────────────────────────────────────────────────────────────

interface AddUserDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function AddUserDialog({ open, onClose, onSuccess }: AddUserDialogProps) {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function reset() {
    setEmail("");
    setFirstName("");
    setLastName("");
    setRole("");
    setError(null);
    setSuccess(false);
    setLoading(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/app/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, firstName, lastName, role }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "An unexpected error occurred.");
      } else {
        setSuccess(true);
        setTimeout(() => {
          handleClose();
          onSuccess();
        }, 1200);
      }
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={open ? handleClose : undefined}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add User</DialogTitle>
          <DialogDescription>
            Invite a new user to your organisation. They will receive an email to set their password.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="flex flex-col items-center gap-3 py-6">
            <CheckCircle2 className="h-10 w-10 text-green-500" />
            <p className="text-sm font-medium text-gray-700">Invitation sent successfully!</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="add-email">
                Email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="add-email"
                type="email"
                placeholder="user@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="off"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="add-first">First Name</Label>
                <Input
                  id="add-first"
                  type="text"
                  placeholder="Jane"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="add-last">Last Name</Label>
                <Input
                  id="add-last"
                  type="text"
                  placeholder="Smith"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="add-role">
                Role <span className="text-red-500">*</span>
              </Label>
              <Select value={role} onValueChange={setRole} required>
                <SelectTrigger id="add-role">
                  <SelectValue placeholder="Select a role…" />
                </SelectTrigger>
                <SelectContent>
                  {ASSIGNABLE_ROLES.map(r => (
                    <SelectItem key={r} value={r}>
                      {roleLabel(r)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <DialogFooter className="pt-2">
              <DialogClose asChild>
                <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={loading || !email.trim() || !role}>
                {loading ? "Sending…" : "Send Invite"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────
// Bulk Add Dialog
// ─────────────────────────────────────────────────────────────

interface BulkAddDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ParsedBulkRow {
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

function parseBulkText(text: string, defaultRole: string): ParsedBulkRow[] {
  return text
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const parts = line.split(",").map(p => p.trim());
      const email = parts[0] ?? "";
      const firstName = parts[1] ?? "";
      const lastName = parts[2] ?? "";
      const role = parts[3] && ASSIGNABLE_ROLES.includes(parts[3] as typeof ASSIGNABLE_ROLES[number])
        ? parts[3]
        : defaultRole;
      return { email, firstName, lastName, role };
    })
    .filter(row => row.email.length > 0);
}

function BulkAddDialog({ open, onClose, onSuccess }: BulkAddDialogProps) {
  const [text, setText] = useState("");
  const [defaultRole, setDefaultRole] = useState<string>("select_player");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<BulkResult[] | null>(null);

  const parsedRows = useMemo(() => parseBulkText(text, defaultRole), [text, defaultRole]);

  function reset() {
    setText("");
    setDefaultRole("select_player");
    setError(null);
    setResults(null);
    setLoading(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResults(null);
    setLoading(true);

    if (parsedRows.length === 0) {
      setError("No valid rows to import. Please enter at least one email address.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/app/admin/users/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ users: parsedRows }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "An unexpected error occurred.");
      } else {
        setResults(data.results as BulkResult[]);
        onSuccess();
      }
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  const successCount = results ? results.filter(r => r.success).length : 0;
  const failCount = results ? results.filter(r => !r.success).length : 0;

  return (
    <Dialog open={open} onOpenChange={open ? handleClose : undefined}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Bulk Add Users</DialogTitle>
          <DialogDescription>
            Enter one user per line using the format:{" "}
            <code className="rounded bg-gray-100 px-1 text-xs">
              email, First Name, Last Name, Role
            </code>
            . First Name, Last Name, and Role are optional — the default role will be used when Role
            is omitted.
          </DialogDescription>
        </DialogHeader>

        {results ? (
          <div className="space-y-3">
            <div className="flex items-center gap-4 text-sm font-medium">
              <span className="flex items-center gap-1.5 text-green-700">
                <CheckCircle2 className="h-4 w-4" />
                {successCount} succeeded
              </span>
              {failCount > 0 && (
                <span className="flex items-center gap-1.5 text-red-600">
                  <XCircle className="h-4 w-4" />
                  {failCount} failed
                </span>
              )}
            </div>
            <div className="max-h-64 overflow-y-auto rounded-md border border-gray-200 divide-y divide-gray-100">
              {results.map((r, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-2 text-sm">
                  {r.success ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 shrink-0 text-red-500" />
                  )}
                  <span className="flex-1 truncate text-gray-700">{r.email}</span>
                  {!r.success && r.error && (
                    <span className="text-xs text-red-500 truncate max-w-[180px]">{r.error}</span>
                  )}
                </div>
              ))}
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" onClick={handleClose}>
                Done
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="bulk-default-role">Default Role</Label>
              <Select value={defaultRole} onValueChange={setDefaultRole}>
                <SelectTrigger id="bulk-default-role">
                  <SelectValue placeholder="Select default role…" />
                </SelectTrigger>
                <SelectContent>
                  {ASSIGNABLE_ROLES.map(r => (
                    <SelectItem key={r} value={r}>
                      {roleLabel(r)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bulk-text">
                Users <span className="text-red-500">*</span>
              </Label>
              <textarea
                id="bulk-text"
                rows={8}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y font-mono"
                placeholder={
                  "jane@example.com, Jane, Smith, select_coach\nbob@example.com, Bob, Jones\nalice@example.com"
                }
                value={text}
                onChange={e => setText(e.target.value)}
              />
              {parsedRows.length > 0 && (
                <p className="text-xs text-gray-500">
                  {parsedRows.length} valid {parsedRows.length === 1 ? "row" : "rows"} detected
                </p>
              )}
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <DialogFooter className="pt-2">
              <DialogClose asChild>
                <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={loading || parsedRows.length === 0}>
                {loading ? "Importing…" : `Import ${parsedRows.length > 0 ? parsedRows.length : ""} Users`}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────
// Edit Role Dialog
// ─────────────────────────────────────────────────────────────

interface EditRoleDialogProps {
  open: boolean;
  user: TenantUser | null;
  onClose: () => void;
  onSuccess: () => void;
}

function EditRoleDialog({ open, user, onClose, onSuccess }: EditRoleDialogProps) {
  const [role, setRole] = useState<string>(user?.role ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Sync role when user changes
  function handleOpenChange() {
    if (user) setRole(user.role);
    setError(null);
    setSuccess(false);
  }

  function handleClose() {
    setError(null);
    setSuccess(false);
    setLoading(false);
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`/api/app/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "An unexpected error occurred.");
      } else {
        setSuccess(true);
        setTimeout(() => {
          handleClose();
          onSuccess();
        }, 1000);
      }
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!user) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={isOpen => {
        if (isOpen) {
          handleOpenChange();
        } else {
          handleClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit Role</DialogTitle>
          <DialogDescription>
            Update the role for{" "}
            <span className="font-medium text-gray-800">{displayName(user)}</span>.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="flex flex-col items-center gap-3 py-6">
            <CheckCircle2 className="h-10 w-10 text-green-500" />
            <p className="text-sm font-medium text-gray-700">Role updated successfully!</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-role">Role</Label>
              <Select
                value={role || user.role}
                onValueChange={setRole}
              >
                <SelectTrigger id="edit-role">
                  <SelectValue placeholder="Select a role…" />
                </SelectTrigger>
                <SelectContent>
                  {ASSIGNABLE_ROLES.map(r => (
                    <SelectItem key={r} value={r}>
                      {roleLabel(r)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <DialogFooter className="pt-2">
              <DialogClose asChild>
                <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={loading || !role}>
                {loading ? "Saving…" : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────
// Deactivate Confirm Dialog
// ─────────────────────────────────────────────────────────────

interface ToggleActiveDialogProps {
  open: boolean;
  user: TenantUser | null;
  onClose: () => void;
  onSuccess: () => void;
}

function ToggleActiveDialog({ open, user, onClose, onSuccess }: ToggleActiveDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleClose() {
    setError(null);
    setLoading(false);
    onClose();
  }

  async function handleConfirm() {
    if (!user) return;
    setError(null);
    setLoading(true);

    const newActive = !user.is_active;

    try {
      const res = await fetch(`/api/app/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: newActive }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "An unexpected error occurred.");
      } else {
        handleClose();
        onSuccess();
      }
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!user) return null;

  const isDeactivating = user.is_active;

  return (
    <Dialog open={open} onOpenChange={isOpen => { if (!isOpen) handleClose(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {isDeactivating ? "Deactivate User" : "Reactivate User"}
          </DialogTitle>
          <DialogDescription>
            {isDeactivating ? (
              <>
                Are you sure you want to deactivate{" "}
                <span className="font-medium text-gray-800">{displayName(user)}</span>? They will no
                longer be able to access the application.
              </>
            ) : (
              <>
                Reactivate{" "}
                <span className="font-medium text-gray-800">{displayName(user)}</span>? They will
                regain access to the application.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="flex items-start gap-2 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <DialogFooter className="pt-2">
          <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="button"
            variant={isDeactivating ? "destructive" : "default"}
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading
              ? isDeactivating
                ? "Deactivating…"
                : "Reactivating…"
              : isDeactivating
              ? "Deactivate"
              : "Reactivate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────

interface UsersAdminClientProps {
  initialUsers: TenantUser[];
  currentUserId: string;
}

export function UsersAdminClient({ initialUsers, currentUserId }: UsersAdminClientProps) {
  const router = useRouter();

  const [users] = useState<TenantUser[]>(initialUsers);

  // Dialog states
  const [addOpen, setAddOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [editUser, setEditUser] = useState<TenantUser | null>(null);
  const [toggleUser, setToggleUser] = useState<TenantUser | null>(null);

  function handleMutationSuccess() {
    router.refresh();
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 text-gray-500" />
          <div>
            <h1 className="text-xl font-semibold text-gray-900">User Administration</h1>
            <p className="text-sm text-gray-500">
              Manage users and their roles within your organisation.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setBulkOpen(true)}
            className="flex items-center gap-1.5"
          >
            <Upload className="h-4 w-4" />
            Bulk Add
          </Button>
          <Button
            size="sm"
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-1.5"
          >
            <UserPlus className="h-4 w-4" />
            Add User
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="flex items-center gap-4 text-sm text-gray-500">
        <span>
          <span className="font-medium text-gray-700">{users.length}</span>{" "}
          {users.length === 1 ? "member" : "members"} total
        </span>
        <span>
          <span className="font-medium text-gray-700">
            {users.filter(u => u.is_active).length}
          </span>{" "}
          active
        </span>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
        {users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
            <Users className="h-10 w-10" />
            <p className="text-sm">No users found. Invite someone to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Role</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Joined</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map(u => {
                  const isSelf = u.user_id === currentUserId;
                  return (
                    <tr
                      key={u.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      {/* Name */}
                      <td className="px-4 py-3 font-medium text-gray-800">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-semibold shrink-0 select-none">
                            {(u.first_name?.[0] ?? u.email[0] ?? "?").toUpperCase()}
                          </div>
                          <span>
                            {u.first_name || u.last_name
                              ? [u.first_name, u.last_name].filter(Boolean).join(" ")
                              : <span className="text-gray-400 font-normal italic">No name</span>}
                          </span>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="px-4 py-3 text-gray-600">{u.email}</td>

                      {/* Role */}
                      <td className="px-4 py-3">
                        <Badge variant="secondary" className="text-xs">
                          {roleLabel(u.role)}
                        </Badge>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        {u.is_active ? (
                          <Badge variant="success" className="text-xs">Active</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs text-gray-500">Inactive</Badge>
                        )}
                      </td>

                      {/* Joined */}
                      <td className="px-4 py-3 text-gray-500">
                        {formatDate(u.created_at)}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {/* Edit role */}
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 w-7 p-0"
                            title="Edit role"
                            onClick={() => setEditUser(u)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            <span className="sr-only">Edit role</span>
                          </Button>

                          {/* Activate / Deactivate */}
                          {u.is_active ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:border-red-300"
                              title="Deactivate user"
                              disabled={isSelf}
                              onClick={() => setToggleUser(u)}
                            >
                              <PowerOff className="h-3.5 w-3.5" />
                              <span className="sr-only">Deactivate</span>
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 w-7 p-0 text-green-600 hover:text-green-700 hover:border-green-300"
                              title="Reactivate user"
                              onClick={() => setToggleUser(u)}
                            >
                              <Power className="h-3.5 w-3.5" />
                              <span className="sr-only">Reactivate</span>
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Dialogs */}
      <AddUserDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSuccess={handleMutationSuccess}
      />

      <BulkAddDialog
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        onSuccess={handleMutationSuccess}
      />

      <EditRoleDialog
        open={editUser !== null}
        user={editUser}
        onClose={() => setEditUser(null)}
        onSuccess={handleMutationSuccess}
      />

      <ToggleActiveDialog
        open={toggleUser !== null}
        user={toggleUser}
        onClose={() => setToggleUser(null)}
        onSuccess={handleMutationSuccess}
      />
    </div>
  );
}
