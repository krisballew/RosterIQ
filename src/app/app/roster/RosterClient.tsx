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
  Check,
  X,
  Shield,
  Trash2,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Player, PlayerStatus, Team } from "@/types/database";

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

interface TeamFormData {
  name: string;
  age_division: string;
  birth_year: string;
  roster_limit: string;
}

const EMPTY_TEAM_FORM: TeamFormData = {
  name: "",
  age_division: "",
  birth_year: "",
  roster_limit: "16",
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
  teams: Team[];
}

function PlayerFormDialog({
  open,
  onOpenChange,
  initialData,
  title,
  description,
  onSubmit,
  submitLabel,
  teams,
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
            {teams.length > 0 ? (
              <Select
                value={form.team_assigned || "__none__"}
                onValueChange={(v) => set("team_assigned", v === "__none__" ? "" : v)}
              >
                <SelectTrigger id="team_assigned">
                  <SelectValue placeholder="Select a team" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Unassigned —</SelectItem>
                  {teams.map((t) => (
                    <SelectItem key={t.id} value={t.name}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                id="team_assigned"
                value={form.team_assigned}
                onChange={(e) => set("team_assigned", e.target.value)}
                placeholder="e.g. U14 Select Red"
              />
            )}
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
// Team form dialog (add / edit a team)
// ─────────────────────────────────────────────────────────────

interface TeamFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: Partial<TeamFormData>;
  title: string;
  onSubmit: (data: TeamFormData) => Promise<void>;
  submitLabel: string;
}

function TeamFormDialog({ open, onOpenChange, initialData, title, onSubmit, submitLabel }: TeamFormDialogProps) {
  const [form, setForm] = useState<TeamFormData>({ ...EMPTY_TEAM_FORM, ...initialData });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpenChange = (val: boolean) => {
    if (val) { setForm({ ...EMPTY_TEAM_FORM, ...initialData }); setError(null); }
    onOpenChange(val);
  };

  const set = (field: keyof TeamFormData, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    setError(null);
    if (!form.name.trim()) { setError("Team name is required."); return; }
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-2">
          <div className="col-span-2 space-y-1">
            <Label htmlFor="t_name">Team Name <span className="text-red-500">*</span></Label>
            <Input id="t_name" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. U14 Select Red" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="t_div">Age Division</Label>
            <Input id="t_div" value={form.age_division} onChange={(e) => set("age_division", e.target.value)} placeholder="e.g. U14" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="t_year">Birth Year</Label>
            <Input id="t_year" type="number" value={form.birth_year} onChange={(e) => set("birth_year", e.target.value)} placeholder="e.g. 2011" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="t_limit">Roster Limit</Label>
            <Input id="t_limit" type="number" value={form.roster_limit} onChange={(e) => set("roster_limit", e.target.value)} placeholder="16" />
          </div>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
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
  initialTeams: Team[];
}

type SortKey = "name" | "team_assigned" | "age_division" | "date_of_birth" | "status";
type SortDir = "asc" | "desc";

export function RosterClient({ initialPlayers, initialTeams }: RosterClientProps) {
  const [players, setPlayers] = useState<Player[]>(initialPlayers);
  const [teams, setTeams] = useState<Team[]>(initialTeams);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | PlayerStatus>("all");
  // multi-select team filter — empty Set = show all
  const [selectedTeamNames, setSelectedTeamNames] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // Add player dialog
  const [addOpen, setAddOpen] = useState(false);

  // Edit player dialog
  const [editPlayer, setEditPlayer] = useState<Player | null>(null);

  // Deactivate confirm
  const [deactivatePlayer, setDeactivatePlayer] = useState<Player | null>(null);
  const [deactivating, setDeactivating] = useState(false);

  // Team management dialog
  const [teamsDialogOpen, setTeamsDialogOpen] = useState(false);
  const [addTeamOpen, setAddTeamOpen] = useState(false);
  const [editTeam, setEditTeam] = useState<Team | null>(null);
  const [deleteTeam, setDeleteTeam] = useState<Team | null>(null);
  const [deletingTeam, setDeletingTeam] = useState(false);

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
    if (selectedTeamNames.size > 0) {
      list = list.filter((p) =>
        selectedTeamNames.has(p.team_assigned ?? "") ||
        (selectedTeamNames.has("__unassigned__") && !p.team_assigned)
      );
    }
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
  }, [players, statusFilter, selectedTeamNames, search, sortKey, sortDir]);

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

  // ── Team CRUD ─────────────────────────────────────────────
  const handleAddTeam = async (data: TeamFormData) => {
    const res = await fetch("/api/app/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.name.trim(),
        age_division: data.age_division.trim() || null,
        birth_year: data.birth_year ? Number(data.birth_year) : null,
        roster_limit: data.roster_limit ? Number(data.roster_limit) : 16,
      }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Failed to create team");
    setTeams((prev) => [...prev, json.team].sort((a, b) => a.name.localeCompare(b.name)));
  };

  const handleEditTeam = async (data: TeamFormData) => {
    if (!editTeam) return;
    const res = await fetch(`/api/app/teams/${editTeam.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.name.trim(),
        age_division: data.age_division.trim() || null,
        birth_year: data.birth_year ? Number(data.birth_year) : null,
        roster_limit: data.roster_limit ? Number(data.roster_limit) : 16,
      }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Failed to update team");
    setTeams((prev) =>
      prev.map((t) => (t.id === editTeam.id ? json.team : t)).sort((a, b) => a.name.localeCompare(b.name))
    );
    setEditTeam(null);
  };

  const handleDeleteTeam = async () => {
    if (!deleteTeam) return;
    setDeletingTeam(true);
    try {
      const res = await fetch(`/api/app/teams/${deleteTeam.id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? "Failed to delete team");
      }
      setTeams((prev) => prev.filter((t) => t.id !== deleteTeam.id));
      setSelectedTeamNames((prev) => {
        const next = new Set(prev);
        next.delete(deleteTeam.name);
        return next;
      });
    } finally {
      setDeletingTeam(false);
      setDeleteTeam(null);
    }
  };

  // ── Team filter helpers ───────────────────────────────────
  const toggleTeamFilter = (name: string) => {
    setSelectedTeamNames((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  // All distinct team names present in the player list (covers virtual teams too)
  const allTeamNames = useMemo(() => {
    const fromTeams = teams.map((t) => t.name);
    const fromPlayers = players
      .map((p) => p.team_assigned)
      .filter((n): n is string => !!n);
    return Array.from(new Set([...fromTeams, ...fromPlayers])).sort();
  }, [teams, players]);

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
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setTeamsDialogOpen(true)}>
            <Shield className="mr-2 h-4 w-4" />
            Manage Teams
            {teams.length > 0 && (
              <Badge variant="outline" className="ml-2 text-xs">{teams.length}</Badge>
            )}
          </Button>
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Player
          </Button>
        </div>
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
      <div className="mb-4 flex items-center gap-3 flex-wrap">
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

        {/* Multi-select team filter */}
        {allTeamNames.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-1.5">
                <Users className="h-3.5 w-3.5" />
                {selectedTeamNames.size === 0
                  ? "All Teams"
                  : `${selectedTeamNames.size} team${selectedTeamNames.size > 1 ? "s" : ""}`}
                <ChevronDown className="h-3.5 w-3.5 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-60">
              <DropdownMenuLabel>Filter by Team</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {allTeamNames.map((name) => (
                <DropdownMenuItem
                  key={name}
                  onSelect={(e) => { e.preventDefault(); toggleTeamFilter(name); }}
                  className="flex items-center justify-between cursor-pointer"
                >
                  <span className="truncate">{name}</span>
                  {selectedTeamNames.has(name) && <Check className="h-3.5 w-3.5 text-blue-600 shrink-0" />}
                </DropdownMenuItem>
              ))}
              {selectedTeamNames.size > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={(e) => { e.preventDefault(); setSelectedTeamNames(new Set()); }}
                    className="text-gray-500 text-xs cursor-pointer"
                  >
                    <X className="mr-1.5 h-3 w-3" /> Clear filter
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Active team filter chips */}
        {selectedTeamNames.size > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {Array.from(selectedTeamNames).map((name) => (
              <Badge
                key={name}
                variant="outline"
                className="gap-1 pr-1 text-xs bg-blue-50 border-blue-200 text-blue-700 cursor-pointer"
                onClick={() => toggleTeamFilter(name)}
              >
                {name}
                <X className="h-2.5 w-2.5" />
              </Badge>
            ))}
          </div>
        )}
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
        teams={teams}
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
          teams={teams}
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

      {/* ── Team management dialog ──────────────────────────── */}
      <Dialog open={teamsDialogOpen} onOpenChange={setTeamsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" /> Team Management
            </DialogTitle>
            <DialogDescription>
              Add, rename, or remove teams for your club.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            {teams.length === 0 ? (
              <p className="text-sm text-gray-500 py-6 text-center">No teams yet. Click Add Team to get started.</p>
            ) : (
              <table className="min-w-full text-sm divide-y divide-gray-100">
                <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  <tr>
                    <th className="px-4 py-2 text-left">Name</th>
                    <th className="px-4 py-2 text-left">Division</th>
                    <th className="px-4 py-2 text-left">Birth Year</th>
                    <th className="px-4 py-2 text-left">Limit</th>
                    <th className="px-4 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {teams.map((t) => (
                    <tr key={t.id} className="hover:bg-gray-50/60">
                      <td className="px-4 py-2 font-medium text-gray-900">{t.name}</td>
                      <td className="px-4 py-2 text-gray-600">{t.age_division ?? <span className="text-gray-300">—</span>}</td>
                      <td className="px-4 py-2 text-gray-600">{t.birth_year ?? <span className="text-gray-300">—</span>}</td>
                      <td className="px-4 py-2 text-gray-600">{t.roster_limit}</td>
                      <td className="px-4 py-2 text-right">
                        <div className="inline-flex gap-1">
                          <Button size="sm" variant="ghost" title="Edit team" onClick={() => setEditTeam(t)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" title="Delete team" onClick={() => setDeleteTeam(t)}>
                            <Trash2 className="h-3.5 w-3.5 text-red-500" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <DialogFooter className="border-t pt-3">
            <Button onClick={() => setAddTeamOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Add Team
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add team */}
      <TeamFormDialog
        open={addTeamOpen}
        onOpenChange={setAddTeamOpen}
        title="Add Team"
        onSubmit={handleAddTeam}
        submitLabel="Add Team"
      />

      {/* Edit team */}
      {editTeam && (
        <TeamFormDialog
          open={!!editTeam}
          onOpenChange={(open) => !open && setEditTeam(null)}
          initialData={{
            name: editTeam.name,
            age_division: editTeam.age_division ?? "",
            birth_year: editTeam.birth_year?.toString() ?? "",
            roster_limit: editTeam.roster_limit?.toString() ?? "16",
          }}
          title={`Edit — ${editTeam.name}`}
          onSubmit={handleEditTeam}
          submitLabel="Save Changes"
        />
      )}

      {/* Delete team confirm */}
      <Dialog open={!!deleteTeam} onOpenChange={(open) => !open && setDeleteTeam(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Team</DialogTitle>
            <DialogDescription>
              Delete <strong>{deleteTeam?.name}</strong>? This only removes the team record — players will keep their team_assigned value.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTeam(null)} disabled={deletingTeam}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteTeam} disabled={deletingTeam}>
              {deletingTeam && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
