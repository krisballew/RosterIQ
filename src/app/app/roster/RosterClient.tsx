"use client";

import { useState, useMemo } from "react";
import {
  Plus,
  Search,
  Pencil,
  UserX,
  UserCheck,
  Loader2,
  Users,
  ChevronUp,
  ChevronDown,
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
} from "@/components/ui/dialog";
import type { Player, PlayerStatus } from "@/types/database";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface PlayerFormData {
  first_name: string;
  last_name: string;
  team_assigned: string;
  age_division: string;
  date_of_birth: string;
  primary_parent_email: string;
  secondary_parent_email: string;
  status: PlayerStatus;
}

const EMPTY_FORM: PlayerFormData = {
  first_name: "",
  last_name: "",
  team_assigned: "",
  age_division: "",
  date_of_birth: "",
  primary_parent_email: "",
  secondary_parent_email: "",
  status: "active",
};

const STATUS_CONFIG: Record<PlayerStatus, { label: string; className: string }> = {
  active: {
    label: "Active",
    className: "bg-green-50 text-green-700 border-green-200 hover:bg-green-50",
  },
  inactive: {
    label: "Inactive",
    className: "bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-100",
  },
  practice_only: {
    label: "Practice Only",
    className: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50",
  },
};

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function formatDob(dob: string | null): string {
  if (!dob) return "—";
  const [year, month, day] = dob.split("-");
  return `${month}/${day}/${year}`;
}

// ─────────────────────────────────────────────────────────────
// Form dialog (shared for add & edit)
// ─────────────────────────────────────────────────────────────

interface PlayerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: Partial<PlayerFormData>;
  title: string;
  description?: string;
  onSubmit: (data: PlayerFormData) => Promise<void>;
  submitLabel: string;
}

function PlayerFormDialog({
  open,
  onOpenChange,
  initialData,
  title,
  description,
  onSubmit,
  submitLabel,
}: PlayerFormDialogProps) {
  const [form, setForm] = useState<PlayerFormData>({ ...EMPTY_FORM, ...initialData });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when dialog opens
  const handleOpenChange = (val: boolean) => {
    if (val) {
      setForm({ ...EMPTY_FORM, ...initialData });
      setError(null);
    }
    onOpenChange(val);
  };

  const set = (field: keyof PlayerFormData, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    setError(null);
    if (!form.first_name.trim() || !form.last_name.trim()) {
      setError("First name and last name are required.");
      return;
    }
    setSaving(true);
    try {
      await onSubmit(form);
      onOpenChange(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "An error occurred.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-2">
          {/* First Name */}
          <div className="space-y-1">
            <Label htmlFor="first_name">
              First Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="first_name"
              value={form.first_name}
              onChange={(e) => set("first_name", e.target.value)}
              placeholder="Jane"
            />
          </div>

          {/* Last Name */}
          <div className="space-y-1">
            <Label htmlFor="last_name">
              Last Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="last_name"
              value={form.last_name}
              onChange={(e) => set("last_name", e.target.value)}
              placeholder="Doe"
            />
          </div>

          {/* Team */}
          <div className="space-y-1">
            <Label htmlFor="team_assigned">Team</Label>
            <Input
              id="team_assigned"
              value={form.team_assigned}
              onChange={(e) => set("team_assigned", e.target.value)}
              placeholder="e.g. U14 Select Red"
            />
          </div>

          {/* Age Division */}
          <div className="space-y-1">
            <Label htmlFor="age_division">Age Division</Label>
            <Input
              id="age_division"
              value={form.age_division}
              onChange={(e) => set("age_division", e.target.value)}
              placeholder="e.g. U14"
            />
          </div>

          {/* Date of Birth */}
          <div className="space-y-1">
            <Label htmlFor="date_of_birth">Date of Birth</Label>
            <Input
              id="date_of_birth"
              type="date"
              value={form.date_of_birth}
              onChange={(e) => set("date_of_birth", e.target.value)}
            />
          </div>

          {/* Status */}
          <div className="space-y-1">
            <Label htmlFor="status">Status</Label>
            <Select
              value={form.status}
              onValueChange={(val) => set("status", val as PlayerStatus)}
            >
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="practice_only">Practice Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Primary Parent Email */}
          <div className="col-span-2 space-y-1">
            <Label htmlFor="primary_parent_email">Primary Parent Email</Label>
            <Input
              id="primary_parent_email"
              type="email"
              value={form.primary_parent_email}
              onChange={(e) => set("primary_parent_email", e.target.value)}
              placeholder="parent@example.com"
            />
          </div>

          {/* Secondary Parent Email */}
          <div className="col-span-2 space-y-1">
            <Label htmlFor="secondary_parent_email">Secondary Parent Email</Label>
            <Input
              id="secondary_parent_email"
              type="email"
              value={form.secondary_parent_email}
              onChange={(e) => set("secondary_parent_email", e.target.value)}
              placeholder="parent2@example.com"
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────

interface RosterClientProps {
  initialPlayers: Player[];
}

type SortKey = "name" | "team_assigned" | "age_division" | "date_of_birth" | "status";
type SortDir = "asc" | "desc";

export function RosterClient({ initialPlayers }: RosterClientProps) {
  const [players, setPlayers] = useState<Player[]>(initialPlayers);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | PlayerStatus>("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // Add dialog
  const [addOpen, setAddOpen] = useState(false);

  // Edit dialog
  const [editPlayer, setEditPlayer] = useState<Player | null>(null);

  // Deactivate confirm
  const [deactivatePlayer, setDeactivatePlayer] = useState<Player | null>(null);
  const [deactivating, setDeactivating] = useState(false);

  // ── Stats ──────────────────────────────────────────────────
  const stats = useMemo(
    () => ({
      active: players.filter((p) => p.status === "active").length,
      inactive: players.filter((p) => p.status === "inactive").length,
      practice_only: players.filter((p) => p.status === "practice_only").length,
    }),
    [players]
  );

  // ── Filtered + Sorted rows ─────────────────────────────────
  const rows = useMemo(() => {
    let list = players;
    if (statusFilter !== "all") list = list.filter((p) => p.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.first_name.toLowerCase().includes(q) ||
          p.last_name.toLowerCase().includes(q) ||
          (p.team_assigned ?? "").toLowerCase().includes(q) ||
          (p.age_division ?? "").toLowerCase().includes(q)
      );
    }

    return [...list].sort((a, b) => {
      let av = "";
      let bv = "";
      if (sortKey === "name") {
        av = `${a.last_name} ${a.first_name}`.toLowerCase();
        bv = `${b.last_name} ${b.first_name}`.toLowerCase();
      } else if (sortKey === "team_assigned") {
        av = (a.team_assigned ?? "").toLowerCase();
        bv = (b.team_assigned ?? "").toLowerCase();
      } else if (sortKey === "age_division") {
        av = (a.age_division ?? "").toLowerCase();
        bv = (b.age_division ?? "").toLowerCase();
      } else if (sortKey === "date_of_birth") {
        av = a.date_of_birth ?? "";
        bv = b.date_of_birth ?? "";
      } else if (sortKey === "status") {
        av = a.status;
        bv = b.status;
      }
      const cmp = av.localeCompare(bv);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [players, statusFilter, search, sortKey, sortDir]);

  // ── Sort toggle ───────────────────────────────────────────
  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col)
      return <ChevronUp className="ml-1 h-3 w-3 opacity-30 inline" />;
    return sortDir === "asc" ? (
      <ChevronUp className="ml-1 h-3 w-3 inline" />
    ) : (
      <ChevronDown className="ml-1 h-3 w-3 inline" />
    );
  };

  // ── Add player ────────────────────────────────────────────
  const handleAdd = async (data: PlayerFormData) => {
    const res = await fetch("/api/app/players", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Failed to add player");
    setPlayers((prev) => [...prev, json.player]);
  };

  // ── Edit player ───────────────────────────────────────────
  const handleEdit = async (data: PlayerFormData) => {
    if (!editPlayer) return;
    const res = await fetch(`/api/app/players/${editPlayer.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Failed to update player");
    setPlayers((prev) => prev.map((p) => (p.id === editPlayer.id ? json.player : p)));
    setEditPlayer(null);
  };

  // ── Toggle status (activate / deactivate) ─────────────────
  const handleToggleStatus = async () => {
    if (!deactivatePlayer) return;
    setDeactivating(true);
    const nextStatus: PlayerStatus =
      deactivatePlayer.status === "active" ? "inactive" : "active";
    try {
      const res = await fetch(`/api/app/players/${deactivatePlayer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to update status");
      setPlayers((prev) =>
        prev.map((p) => (p.id === deactivatePlayer.id ? json.player : p))
      );
    } finally {
      setDeactivating(false);
      setDeactivatePlayer(null);
    }
  };

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Roster Management</h1>
          <p className="mt-1 text-sm text-gray-500">
            Add, edit, and manage players registered with your club.
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Player
        </Button>
      </div>

      {/* Stats bar */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        {[
          { label: "Active Players", count: stats.active, status: "active" as const, color: "text-green-600", bg: "bg-green-50" },
          { label: "Practice Only", count: stats.practice_only, status: "practice_only" as const, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Inactive", count: stats.inactive, status: "inactive" as const, color: "text-gray-500", bg: "bg-gray-50" },
        ].map((s) => (
          <button
            key={s.status}
            onClick={() =>
              setStatusFilter((prev) => (prev === s.status ? "all" : s.status))
            }
            className={`rounded-xl border p-4 text-left transition-shadow hover:shadow-sm ${
              statusFilter === s.status ? "border-blue-300 bg-blue-50 ring-1 ring-blue-200" : "border-gray-200 bg-white"
            }`}
          >
            <div className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${s.bg}`}>
              <Users className={`h-4 w-4 ${s.color}`} />
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900">{s.count}</p>
            <p className="text-sm text-gray-500">{s.label}</p>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="mb-4 flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            className="pl-9"
            placeholder="Search by name, team, or division…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as "all" | PlayerStatus)}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="practice_only">Practice Only</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white py-20">
          <Users className="h-10 w-10 text-gray-300" />
          <p className="mt-4 text-sm font-medium text-gray-500">
            {players.length === 0
              ? `No players yet. Click "Add Player" to get started.`
              : "No players match your current filters."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-500">
                <tr>
                  <th
                    className="cursor-pointer px-4 py-3 text-left select-none"
                    onClick={() => handleSort("name")}
                  >
                    Name <SortIcon col="name" />
                  </th>
                  <th
                    className="cursor-pointer px-4 py-3 text-left select-none"
                    onClick={() => handleSort("team_assigned")}
                  >
                    Team <SortIcon col="team_assigned" />
                  </th>
                  <th
                    className="cursor-pointer px-4 py-3 text-left select-none"
                    onClick={() => handleSort("age_division")}
                  >
                    Age Division <SortIcon col="age_division" />
                  </th>
                  <th
                    className="cursor-pointer px-4 py-3 text-left select-none"
                    onClick={() => handleSort("date_of_birth")}
                  >
                    Date of Birth <SortIcon col="date_of_birth" />
                  </th>
                  <th className="px-4 py-3 text-left">Primary Parent</th>
                  <th className="px-4 py-3 text-left">Secondary Parent</th>
                  <th
                    className="cursor-pointer px-4 py-3 text-left select-none"
                    onClick={() => handleSort("status")}
                  >
                    Status <SortIcon col="status" />
                  </th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((player) => {
                  const sc = STATUS_CONFIG[player.status];
                  return (
                    <tr key={player.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-900">
                        {player.first_name} {player.last_name}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                        {player.team_assigned || <span className="text-gray-300">—</span>}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                        {player.age_division || <span className="text-gray-300">—</span>}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                        {formatDob(player.date_of_birth)}
                      </td>
                      <td className="px-4 py-3 text-gray-600 max-w-[180px] truncate">
                        {player.primary_parent_email || <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-600 max-w-[180px] truncate">
                        {player.secondary_parent_email || <span className="text-gray-300">—</span>}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <Badge variant="outline" className={sc.className}>
                          {sc.label}
                        </Badge>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditPlayer(player)}
                            title="Edit player"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDeactivatePlayer(player)}
                            title={player.status === "active" ? "Deactivate" : "Reactivate"}
                          >
                            {player.status === "active" ? (
                              <UserX className="h-3.5 w-3.5 text-amber-500" />
                            ) : (
                              <UserCheck className="h-3.5 w-3.5 text-green-500" />
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="border-t border-gray-100 px-4 py-2 text-xs text-gray-400">
            Showing {rows.length} of {players.length} players
          </div>
        </div>
      )}

      {/* Add dialog */}
      <PlayerFormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        title="Add Player"
        description="Add a new player to your club roster."
        onSubmit={handleAdd}
        submitLabel="Add Player"
      />

      {/* Edit dialog */}
      {editPlayer && (
        <PlayerFormDialog
          open={!!editPlayer}
          onOpenChange={(open) => !open && setEditPlayer(null)}
          initialData={{
            first_name: editPlayer.first_name,
            last_name: editPlayer.last_name,
            team_assigned: editPlayer.team_assigned ?? "",
            age_division: editPlayer.age_division ?? "",
            date_of_birth: editPlayer.date_of_birth ?? "",
            primary_parent_email: editPlayer.primary_parent_email ?? "",
            secondary_parent_email: editPlayer.secondary_parent_email ?? "",
            status: editPlayer.status,
          }}
          title={`Edit — ${editPlayer.first_name} ${editPlayer.last_name}`}
          onSubmit={handleEdit}
          submitLabel="Save Changes"
        />
      )}

      {/* Deactivate / Reactivate confirm dialog */}
      <Dialog open={!!deactivatePlayer} onOpenChange={(open) => !open && setDeactivatePlayer(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {deactivatePlayer?.status === "active" ? "Deactivate Player" : "Reactivate Player"}
            </DialogTitle>
            <DialogDescription>
              {deactivatePlayer?.status === "active"
                ? `Set ${deactivatePlayer?.first_name} ${deactivatePlayer?.last_name} to Inactive? They will no longer appear in the active roster count.`
                : `Set ${deactivatePlayer?.first_name} ${deactivatePlayer?.last_name} back to Active?`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeactivatePlayer(null)}
              disabled={deactivating}
            >
              Cancel
            </Button>
            <Button
              variant={deactivatePlayer?.status === "active" ? "destructive" : "default"}
              onClick={handleToggleStatus}
              disabled={deactivating}
            >
              {deactivating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {deactivatePlayer?.status === "active" ? "Deactivate" : "Reactivate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
