"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
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
  Upload,
  FileText,
  AlertCircle,
  Calendar,
  RefreshCw,
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
// TeamSnap CSV parser + import dialog
// ─────────────────────────────────────────────────────────────

/** Parse a CSV string into an array of row-objects keyed by header. */
function parseCsv(text: string): Record<string, string>[] {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  if (lines.length < 2) return [];

  function splitRow(line: string): string[] {
    const fields: string[] = [];
    let cur = "";
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuote) {
        if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (ch === '"') inQuote = false;
        else cur += ch;
      } else {
        if (ch === '"') inQuote = true;
        else if (ch === ',') { fields.push(cur); cur = ""; }
        else cur += ch;
      }
    }
    fields.push(cur);
    return fields;
  }

  const headers = splitRow(lines[0]).map((h) => h.trim());
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const vals = splitRow(line);
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => { obj[h] = (vals[idx] ?? "").trim(); });
    rows.push(obj);
  }
  return rows;
}

/** Normalise a date string to YYYY-MM-DD. Handles MM/DD/YYYY and YYYY-MM-DD. */
function normalizeDob(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  // MM/DD/YYYY
  const mdy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdy) return `${mdy[3]}-${mdy[1].padStart(2, "0")}-${mdy[2].padStart(2, "0")}`;
  // YYYY-MM-DD already
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // Try native parse as last resort
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}

/** Pick the first matching key (case-insensitive) from a row. */
function pickField(row: Record<string, string>, ...candidates: string[]): string {
  for (const c of candidates) {
    const key = Object.keys(row).find((k) => k.toLowerCase() === c.toLowerCase());
    if (key !== undefined && row[key]) return row[key];
  }
  return "";
}

interface ImportedPlayer {
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  team_assigned: string | null;
  primary_parent_email: string | null;
  secondary_parent_email: string | null;
  positions: string[];
}

function mapTeamsnapRow(row: Record<string, string>): ImportedPlayer | null {
  const first = pickField(row, "First", "First Name", "FirstName");
  const last = pickField(row, "Last", "Last Name", "LastName");
  if (!first || !last) return null;

  // TeamSnap "Member Type" can include coaches/managers — skip non-players
  const memberType = pickField(row, "Member Type", "Type", "Role").toLowerCase();
  if (memberType && !memberType.includes("player") && memberType !== "") {
    // Only skip when the field is explicitly non-player (allow blank)
    if (["coach", "manager", "owner", "non-player"].some((t) => memberType.includes(t))) return null;
  }

  const dobRaw = pickField(row, "Birthdate", "Birthday", "Date of Birth", "DOB", "Birth Date");
  const dob = normalizeDob(dobRaw);

  const team = pickField(row, "Team", "Team Name", "Team Assigned");
  const div = pickField(row, "Age Division", "Age Group", "Division", "Age Level");

  // Primary parent email: TeamSnap typically uses "Contact 1 Email Address"
  const email1 = pickField(row,
    "Contact 1 Email Address", "Contact #1 Email Address",
    "Contact #1 Email", "Contact 1 Email",
    "Contact Email Address", "Contact Email",
    "Parent Email", "Guardian Email", "Email Address", "Email"
  );
  const email2 = pickField(row,
    "Contact 2 Email Address", "Contact #2 Email Address",
    "Contact #2 Email", "Contact 2 Email",
    "Secondary Email", "Secondary Contact Email", "Secondary Parent Email"
  );

  const posRaw = pickField(row, "Position", "Positions", "Preferred Position");
  const positions = posRaw
    ? posRaw.split(/[,/;]/).map((p) => p.trim().toUpperCase()).filter(Boolean)
    : [];

  return {
    first_name: first,
    last_name: last,
    date_of_birth: dob,
    team_assigned: team || null,
    primary_parent_email: email1 || null,
    secondary_parent_email: email2 || null,
    positions,
  };
}

function ImportPlayersDialog({
  open,
  onOpenChange,
  teams,
  existingPlayers,
  onImported,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  teams: Team[];
  existingPlayers: Player[];
  onImported: (players: Player[]) => void;
}) {
  const [step, setStep] = useState<"upload" | "preview" | "done">("upload");
  const [parsed, setParsed] = useState<ImportedPlayer[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ inserted: number; skipped: number; skippedNames: string[]; errors: string[] } | null>(null);
  // "__keep__" = use CSV value, "__unassigned__" = clear, anything else = team name
  const [defaultTeam, setDefaultTeam] = useState<string>("__keep__");
  const [dragOver, setDragOver] = useState(false);

  const reset = () => {
    setStep("upload");
    setParsed([]);
    setParseError(null);
    setResult(null);
    setDefaultTeam("__keep__");
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const handleFile = (file: File) => {
    setParseError(null);
    if (!file.name.endsWith(".csv")) { setParseError("Please upload a .csv file."); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const rows = parseCsv(text);
      if (rows.length === 0) { setParseError("No data rows found in the CSV."); return; }
      const players = rows.map(mapTeamsnapRow).filter((p): p is ImportedPlayer => p !== null);
      if (players.length === 0) { setParseError("Could not find player rows. Make sure the file is a TeamSnap roster export."); return; }
      setParsed(players);
      setStep("preview");
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  // Pre-compute a Set of keys for existing players to detect duplicates in preview
  const existingKeys = useMemo(
    () =>
      new Set(
        existingPlayers.map(
          (p) =>
            `${p.first_name.trim().toLowerCase()}|${p.last_name.trim().toLowerCase()}|${p.date_of_birth ?? ""}`
        )
      ),
    [existingPlayers]
  );

  // Mark each parsed row as a duplicate or not
  const parsedWithDup = useMemo(() => {
    const seen = new Set<string>();
    return parsed.map((p) => {
      const key = `${p.first_name.toLowerCase()}|${p.last_name.toLowerCase()}|${p.date_of_birth ?? ""}`;
      const isDuplicate = existingKeys.has(key) || seen.has(key);
      seen.add(key);
      return { ...p, isDuplicate };
    });
  }, [parsed, existingKeys]);

  const newCount = parsedWithDup.filter((p) => !p.isDuplicate).length;
  const dupCount = parsedWithDup.filter((p) => p.isDuplicate).length;

  // Resolve effective team for a player given the current override
  const resolveTeam = (p: ImportedPlayer): string | null => {
    if (defaultTeam === "__keep__") return p.team_assigned;
    if (defaultTeam === "__unassigned__") return null;
    return defaultTeam;
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      const payload = parsedWithDup
        .filter((p) => !p.isDuplicate)  // skip known duplicates before sending
        .map((p) => ({
          ...p,
          team_assigned: resolveTeam(p),
          status: "active" as const,
        }));
      const res = await fetch("/api/app/players/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ players: payload }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Import failed");
      setResult(json);
      setStep("done");
      const reloadRes = await fetch("/api/app/players");
      if (reloadRes.ok) {
        const data = await reloadRes.json();
        onImported(data.players ?? []);
      }
    } catch (e) {
      setParseError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" /> Import Players from TeamSnap
          </DialogTitle>
          <DialogDescription>
            Export your roster from TeamSnap (Roster → Export Roster as CSV), then upload it here.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0">
          {/* ── Step 1: Upload ── */}
          {step === "upload" && (
            <div className="py-4 space-y-4">
              {/* Team assignment — shown up front so it's set before preview */}
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-800">Assign imported players to a team</p>
                  <p className="text-xs text-gray-500 mt-0.5">You can keep the team name from the CSV or assign everyone to one of your teams.</p>
                </div>
                <Select value={defaultTeam} onValueChange={setDefaultTeam}>
                  <SelectTrigger className="w-72 h-9 text-sm bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__keep__">Keep team name from CSV</SelectItem>
                    <SelectItem value="__unassigned__">— Leave unassigned —</SelectItem>
                    {teams.map((t) => (
                      <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div
                className={`relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 transition-colors cursor-pointer ${dragOver ? "border-blue-400 bg-blue-50" : "border-gray-300 bg-gray-50 hover:border-gray-400"}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => document.getElementById("ts-file-input")?.click()}
              >
                <FileText className="h-10 w-10 text-gray-400" />
                <p className="text-sm text-gray-700 font-medium">Drop your TeamSnap CSV here, or click to browse</p>
                <p className="text-xs text-gray-500">Supports TeamSnap roster exports (.csv)</p>
                <input
                  id="ts-file-input"
                  type="file"
                  accept=".csv"
                  className="sr-only"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
                />
              </div>

              {parseError && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  {parseError}
                </div>
              )}

              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 space-y-1">
                <p className="font-semibold">How to export from TeamSnap:</p>
                <ol className="list-decimal ml-4 space-y-0.5">
                  <li>In TeamSnap, open your team and go to <strong>Roster</strong>.</li>
                  <li>Click the <strong>Export</strong> button (top-right) → <strong>Export as CSV</strong>.</li>
                  <li>Save the file and upload it above.</li>
                </ol>
              </div>
            </div>
          )}

          {/* ── Step 2: Preview ── */}
          {step === "preview" && (
            <div className="py-4 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-700">
                  Found <strong>{parsed.length}</strong> player{parsed.length !== 1 ? "s" : ""} in CSV.
                {dupCount > 0 ? (
                  <span>
                    {" "}<strong className="text-green-700">{newCount} new</strong>,{" "}
                    <span className="text-amber-600">{dupCount} already exist</span> (will be skipped).
                  </span>
                ) : (
                  <span> All are new.</span>
                )}
                </p>
                <Button variant="ghost" size="sm" onClick={reset}>Start over</Button>
              </div>

              {/* Team override — also editable on preview step */}
              <div className="flex items-center gap-3">
                <Label className="text-sm shrink-0 text-gray-700">Team assignment:</Label>
                <Select value={defaultTeam} onValueChange={setDefaultTeam}>
                  <SelectTrigger className="w-56 h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__keep__">Keep CSV value</SelectItem>
                    <SelectItem value="__unassigned__">— Leave unassigned —</SelectItem>
                    {teams.map((t) => (
                      <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-xl border border-gray-200 overflow-auto max-h-72">
                <table className="min-w-full text-xs divide-y divide-gray-100">
                  <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider font-semibold sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left">#</th>
                      <th className="px-3 py-2 text-left">First</th>
                      <th className="px-3 py-2 text-left">Last</th>
                      <th className="px-3 py-2 text-left">DOB</th>
                      <th className="px-3 py-2 text-left">Team</th>
                      <th className="px-3 py-2 text-left">Primary Email</th>
                      <th className="px-3 py-2 text-left">Positions</th>
                      <th className="px-3 py-2 text-left"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {parsedWithDup.map((p, i) => (
                      <tr key={i} className={p.isDuplicate ? "bg-amber-50" : "hover:bg-gray-50/60"}>
                        <td className="px-3 py-1.5 text-gray-400">{i + 1}</td>
                        <td className="px-3 py-1.5">
                          <span className={p.isDuplicate ? "text-gray-400 line-through" : "text-gray-900"}>{p.first_name}</span>
                        </td>
                        <td className="px-3 py-1.5">
                          <span className={p.isDuplicate ? "text-gray-400 line-through" : "text-gray-900"}>{p.last_name}</span>
                        </td>
                        <td className="px-3 py-1.5 text-gray-600">{p.date_of_birth || "—"}</td>
                        <td className="px-3 py-1.5 text-gray-600">{resolveTeam(p) || "—"}</td>
                        <td className="px-3 py-1.5 text-gray-600 max-w-[160px] truncate">{p.primary_parent_email || "—"}</td>
                        <td className="px-3 py-1.5 text-gray-600">{p.positions.join(", ") || "—"}</td>
                        <td className="px-3 py-1.5">
                          {p.isDuplicate && (
                            <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-700 border border-amber-200 whitespace-nowrap">
                              already exists
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {parseError && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  {parseError}
                </div>
              )}
            </div>
          )}

          {/* ── Step 3: Done ── */}
          {step === "done" && result && (
            <div className="py-6 space-y-4">
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                  <Check className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-gray-900">Import complete!</p>
                  <p className="text-sm text-gray-500">
                    <strong>{result.inserted}</strong> player{result.inserted !== 1 ? "s" : ""} added
                    {result.skipped > 0 && `, ${result.skipped} duplicate${result.skipped !== 1 ? "s" : ""} skipped`}.
                  </p>
                </div>
              </div>
              {result.skippedNames.length > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                  <p className="text-xs font-semibold text-amber-800 mb-1">Skipped (already exist):</p>
                  <p className="text-xs text-amber-700">{result.skippedNames.join(", ")}</p>
                </div>
              )}
              {result.errors.length > 0 && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                  <p className="text-xs font-semibold text-red-700 mb-1">Errors:</p>
                  {result.errors.map((e, i) => <p key={i} className="text-xs text-red-600">{e}</p>)}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="border-t pt-3 shrink-0">
          {step === "upload" && (
            <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
          )}
          {step === "preview" && (
            <>
              <Button variant="outline" onClick={reset} disabled={importing}>Back</Button>
              <Button onClick={handleImport} disabled={importing || newCount === 0}>
                {importing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Import {newCount} New Player{newCount !== 1 ? "s" : ""}
              </Button>
            </>
          )}
          {step === "done" && (
            <>
              <Button variant="outline" onClick={reset}>Import Another File</Button>
              <Button onClick={() => handleOpenChange(false)}>Done</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────
// Age Division utilities  (auto-rolls forward on Aug 1 each year)
// ─────────────────────────────────────────────────────────────

const AGE_GROUPS = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];

/** Season "end year": before Aug 1 → current year; on/after Aug 1 → current year + 1 */
function getSeasonEndYear(): number {
  const now = new Date();
  const aug1 = new Date(now.getFullYear(), 7, 1);
  return now >= aug1 ? now.getFullYear() + 1 : now.getFullYear();
}

interface AgeDivisionRange {
  division: string;
  fromDate: Date;
  toDate: Date;
  fromStr: string;
  toStr: string;
}

function computeAgeDivisions(seasonEndYear: number): AgeDivisionRange[] {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return AGE_GROUPS.map((age) => {
    const fromYear = seasonEndYear - age;
    const toYear = seasonEndYear - age + 1;
    return {
      division: `U${age}`,
      fromDate: new Date(fromYear, 7, 1),
      toDate: new Date(toYear, 6, 31, 23, 59, 59),
      fromStr: `${months[7]} 1, ${fromYear}`,
      toStr: `${months[6]} 31, ${toYear}`,
    };
  });
}

function computeDivisionForDob(dob: string, ranges: AgeDivisionRange[]): string | null {
  const d = new Date(dob + "T00:00:00");
  for (const r of ranges) {
    if (d >= r.fromDate && d <= r.toDate) return r.division;
  }
  return null;
}

// ─────────────────────────────────────────────────────────────
// Age Divisions Dialog
// ─────────────────────────────────────────────────────────────

interface AgeDivisionsDialogProps {
  open: boolean;
  onClose: () => void;
  players: Player[];
  onPlayersUpdated: (updated: Player[]) => void;
}

function AgeDivisionsDialog({ open, onClose, players, onPlayersUpdated }: AgeDivisionsDialogProps) {
  const seasonEndYear = getSeasonEndYear();
  const ranges = useMemo(() => computeAgeDivisions(seasonEndYear), [seasonEndYear]);

  // Count players matching each division (preview)
  const divisionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    let noDate = 0;
    let outOfRange = 0;
    for (const p of players) {
      if (!p.date_of_birth) { noDate++; continue; }
      const div = computeDivisionForDob(p.date_of_birth, ranges);
      if (div) counts[div] = (counts[div] ?? 0) + 1;
      else outOfRange++;
    }
    return { counts, noDate, outOfRange };
  }, [players, ranges]);

  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ updated: number; unmatched: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAssign = useCallback(async () => {
    setSaving(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/app/players/assign-age-divisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seasonEndYear }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Failed to assign age divisions");
      setResult({ updated: j.updated, unmatched: j.unmatched });

      // Update local player state from the known ranges (avoid full page reload)
      onPlayersUpdated(
        players.map((p) => {
          if (!p.date_of_birth) return p;
          const div = computeDivisionForDob(p.date_of_birth, ranges);
          return div ? { ...p, age_division: div } : p;
        })
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  }, [seasonEndYear, players, ranges, onPlayersUpdated]);

  // Reset result when dialog closes/opens
  useEffect(() => {
    if (!open) { setResult(null); setError(null); }
  }, [open]);

  const seasonLabel = `${seasonEndYear - 1}–${seasonEndYear}`;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Age Division Rules</DialogTitle>
          <DialogDescription>
            Season {seasonLabel} · Ranges auto-roll forward on August 1st each year.
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-hidden rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500 font-semibold">
              <tr>
                <th className="px-4 py-2.5 text-left">Division</th>
                <th className="px-4 py-2.5 text-left">Birth Date Range</th>
                <th className="px-4 py-2.5 text-right">Players (preview)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {ranges.map((r) => (
                <tr key={r.division} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-semibold text-gray-800">{r.division}</td>
                  <td className="px-4 py-2.5 text-gray-600">
                    {r.fromStr} – {r.toStr}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-gray-700">
                    {divisionCounts.counts[r.division] ?? 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Calendar className="h-3.5 w-3.5 shrink-0" />
          <span>
            {divisionCounts.noDate} player{divisionCounts.noDate !== 1 ? "s" : ""} without DOB (will be skipped)
            {divisionCounts.outOfRange > 0 && ` · ${divisionCounts.outOfRange} outside U6–U19 range`}
          </span>
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}

        {result && (
          <div className="rounded-md bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
            ✓ Updated {result.updated} player{result.updated !== 1 ? "s" : ""}.
            {result.unmatched > 0 && ` ${result.unmatched} skipped (DOB outside range).`}
          </div>
        )}

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" size="sm">Close</Button>
          </DialogClose>
          <Button
            size="sm"
            onClick={handleAssign}
            disabled={saving}
          >
            {saving ? (
              <span className="flex items-center gap-1.5">
                <span className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full" />
                Assigning…
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <RefreshCw className="h-3.5 w-3.5" />
                Auto-assign All Players
              </span>
            )}
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
  // hide inactive by default; user can toggle
  const [hideInactive, setHideInactive] = useState(true);
  // multi-select team filter — empty Set = show all
  const [selectedTeamNames, setSelectedTeamNames] = useState<Set<string>>(new Set());
  // controlled team filter dropdown state (pending = not yet applied)
  const [teamFilterOpen, setTeamFilterOpen] = useState(false);
  const [pendingTeamNames, setPendingTeamNames] = useState<Set<string>>(new Set());
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

  // Import dialog
  const [importOpen, setImportOpen] = useState(false);

  // Age divisions dialog
  const [ageDivisionsOpen, setAgeDivisionsOpen] = useState(false);

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
    if (hideInactive) list = list.filter((p) => p.status !== "inactive");
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
  }, [players, hideInactive, statusFilter, selectedTeamNames, search, sortKey, sortDir]);

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
  const handleTeamFilterOpenChange = useCallback((open: boolean) => {
    if (open) setPendingTeamNames(new Set(selectedTeamNames));
    setTeamFilterOpen(open);
  }, [selectedTeamNames]);

  const togglePending = useCallback((name: string) => {
    setPendingTeamNames((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  const applyTeamFilter = useCallback(() => {
    setSelectedTeamNames(new Set(pendingTeamNames));
    setTeamFilterOpen(false);
  }, [pendingTeamNames]);

  const clearTeamFilter = useCallback(() => {
    setSelectedTeamNames(new Set());
    setPendingTeamNames(new Set());
    setTeamFilterOpen(false);
  }, []);

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
          <Button variant="outline" onClick={() => setAgeDivisionsOpen(true)}>
            <Calendar className="mr-2 h-4 w-4" />
            Age Divisions
          </Button>
          <Button variant="outline" onClick={() => setTeamsDialogOpen(true)}>
            <Shield className="mr-2 h-4 w-4" />
            Manage Teams
            {teams.length > 0 && (
              <Badge variant="outline" className="ml-2 text-xs">{teams.length}</Badge>
            )}
          </Button>
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Import from TeamSnap
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

        {/* Show / hide inactive toggle */}
        <Button
          variant={hideInactive ? "outline" : "secondary"}
          size="sm"
          className="h-9 text-xs"
          onClick={() => setHideInactive((v) => !v)}
          title={hideInactive ? "Inactive players are hidden — click to show" : "Click to hide inactive players"}
        >
          {hideInactive ? (
            <><UserX className="h-3.5 w-3.5 mr-1.5 text-gray-400" />Show Inactive ({stats.inactive})</>
          ) : (
            <><UserCheck className="h-3.5 w-3.5 mr-1.5 text-green-600" />Hide Inactive</>
          )}
        </Button>

        {/* Multi-select team filter — checkbox style with OK button */}
        {allTeamNames.length > 0 && (
          <DropdownMenu open={teamFilterOpen} onOpenChange={handleTeamFilterOpenChange}>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-1.5">
                <Users className="h-3.5 w-3.5" />
                {selectedTeamNames.size === 0
                  ? "All Teams"
                  : `${selectedTeamNames.size} team${selectedTeamNames.size > 1 ? "s" : ""} selected`}
                <ChevronDown className="h-3.5 w-3.5 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64 p-0">
              <DropdownMenuLabel className="px-3 py-2 text-xs">Filter by Team</DropdownMenuLabel>
              <DropdownMenuSeparator className="my-0" />
              <div className="max-h-52 overflow-y-auto py-1">
                {allTeamNames.map((name) => (
                  <DropdownMenuItem
                    key={name}
                    onSelect={(e) => { e.preventDefault(); togglePending(name); }}
                    className="flex items-center gap-2.5 px-3 py-2 cursor-pointer"
                  >
                    <div className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                      pendingTeamNames.has(name)
                        ? "border-blue-600 bg-blue-600"
                        : "border-gray-300 bg-white"
                    }`}>
                      {pendingTeamNames.has(name) && <Check className="h-2.5 w-2.5 text-white" />}
                    </div>
                    <span className="truncate text-sm">{name}</span>
                  </DropdownMenuItem>
                ))}
              </div>
              <DropdownMenuSeparator className="my-0" />
              <div className="flex items-center justify-between gap-2 px-3 py-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-gray-500"
                  onClick={() => setPendingTeamNames(new Set())}
                >
                  Clear all
                </Button>
                <Button
                  size="sm"
                  className="h-7 px-3 text-xs"
                  onClick={applyTeamFilter}
                >
                  OK
                </Button>
              </div>
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
                onClick={() => {
                  setSelectedTeamNames((prev) => {
                    const next = new Set(prev);
                    next.delete(name);
                    return next;
                  });
                }}
              >
                {name}
                <X className="h-2.5 w-2.5" />
              </Badge>
            ))}
            <button
              className="text-xs text-gray-400 hover:text-gray-600 underline"
              onClick={clearTeamFilter}
            >
              Clear all
            </button>
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
                        {player.team_assigned || "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                        {player.age_division || "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                        {formatDob(player.date_of_birth)}
                      </td>
                      <td className="px-4 py-3 text-gray-600 max-w-[180px] truncate">
                        {player.primary_parent_email || "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-600 max-w-[180px] truncate">
                        {player.secondary_parent_email || "—"}
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
                      <td className="px-4 py-2 text-gray-600">{t.age_division ?? "—"}</td>
                      <td className="px-4 py-2 text-gray-600">{t.birth_year ?? "—"}</td>
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
      {/* Import from TeamSnap */}
      <ImportPlayersDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        teams={teams}
        existingPlayers={players}
        onImported={(freshPlayers) => setPlayers(freshPlayers)}
      />

      {/* Age Divisions */}
      <AgeDivisionsDialog
        open={ageDivisionsOpen}
        onClose={() => setAgeDivisionsOpen(false)}
        players={players}
        onPlayersUpdated={setPlayers}
      />
    </div>
  );
}
