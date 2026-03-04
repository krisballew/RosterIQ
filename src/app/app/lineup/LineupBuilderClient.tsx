"use client";

import { useReducer, useCallback, useState, useMemo, useEffect } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  RotateCcw,
  Save,
  Undo2,
  Redo2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Users,
  Layers,
  GripVertical,
  FolderOpen,
  Trash2,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  FORMATIONS,
  FORMAT_FORMATIONS,
  GAME_FORMATS,
  GAME_FORMAT_LABELS,
  getFormationLabel,
  computeRosterWarnings,
  computeLineupWarnings,
  type TeamWithPlayers,
  type Player,
  type FormationKey,
  type GameFormat,
  type LineupSlots,
  type SlotPlayers,
  type RosterMap,
  type SimState,
  type Warning,
} from "./lineupTypes";

// ─────────────────────────────────────────────────────────────────────────────
// Sandbox reducer (with undo / redo)
// ─────────────────────────────────────────────────────────────────────────────

interface SandboxHistory {
  past: SimState[];
  present: SimState;
  future: SimState[];
}

type SandboxAction =
  | { type: "MOVE_PLAYER"; playerId: string; fromTeamId: string | "unassigned"; toTeamId: string | "unassigned" }
  | { type: "RESET"; initial: SimState }
  | { type: "UNDO" }
  | { type: "REDO" };

function buildInitialSim(teams: TeamWithPlayers[], unassigned: Player[]): SimState {
  const rosters: RosterMap = {};
  for (const t of teams) {
    rosters[t.id] = [...t.players];
  }
  return { rosters, unassigned: [...unassigned] };
}

function sandboxReducer(state: SandboxHistory, action: SandboxAction): SandboxHistory {
  switch (action.type) {
    case "RESET":
      return { past: [], present: action.initial, future: [] };

    case "UNDO": {
      if (state.past.length === 0) return state;
      const prev = state.past[state.past.length - 1];
      return {
        past: state.past.slice(0, -1),
        present: prev,
        future: [state.present, ...state.future],
      };
    }

    case "REDO": {
      if (state.future.length === 0) return state;
      const next = state.future[0];
      return {
        past: [...state.past, state.present],
        present: next,
        future: state.future.slice(1),
      };
    }

    case "MOVE_PLAYER": {
      const { playerId, fromTeamId, toTeamId } = action;
      if (fromTeamId === toTeamId) return state;
      const cur = state.present;

      // Find and remove player from source
      let movedPlayer: Player | undefined;
      let newUnassigned = [...cur.unassigned];
      const newRosters: RosterMap = {};
      for (const [tid, players] of Object.entries(cur.rosters)) {
        newRosters[tid] = [...players];
      }

      if (fromTeamId === "unassigned") {
        movedPlayer = newUnassigned.find((p) => p.id === playerId);
        newUnassigned = newUnassigned.filter((p) => p.id !== playerId);
      } else {
        movedPlayer = (newRosters[fromTeamId] ?? []).find((p) => p.id === playerId);
        newRosters[fromTeamId] = (newRosters[fromTeamId] ?? []).filter((p) => p.id !== playerId);
      }

      if (!movedPlayer) return state;

      // Add to destination
      if (toTeamId === "unassigned") {
        newUnassigned = [...newUnassigned, movedPlayer];
      } else {
        newRosters[toTeamId] = [...(newRosters[toTeamId] ?? []), movedPlayer];
      }

      const next: SimState = { rosters: newRosters, unassigned: newUnassigned };
      return {
        past: [...state.past, cur],
        present: next,
        future: [],
      };
    }

    default:
      return state;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Lineup builder state (no undo needed — simple useState)
// ─────────────────────────────────────────────────────────────────────────────
interface LineupState {
  formation: FormationKey;
  /** Per-slot depth chart: slotKey → { starter, backup } */
  slots: LineupSlots;
  bench: Player[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Drag item data shapes
// ─────────────────────────────────────────────────────────────────────────────

interface DragData {
  type: "player";
  player: Player;
  fromTeamId?: string;             // sandbox roster column
  fromBench?: boolean;             // lineup bench pool
  fromSlotKey?: string;            // lineup: which slot
  fromSlotRole?: "starter" | "backup"; // lineup: which role in that slot
}

// ─────────────────────────────────────────────────────────────────────────────
// Player Card (draggable)
// ─────────────────────────────────────────────────────────────────────────────

function PlayerCard({
  player,
  hasWarning,
  dragData,
  compact = false,
}: {
  player: Player;
  hasWarning: boolean;
  dragData: DragData;
  compact?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `draggable:${player.id}:${dragData.fromTeamId ?? (dragData.fromBench ? "bench" : "")}`,
    data: dragData,
  });

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "flex items-center gap-2 rounded-md border bg-white px-2 py-1.5 text-sm select-none cursor-grab active:cursor-grabbing transition-shadow",
        isDragging ? "opacity-40 shadow-lg" : "shadow-sm hover:shadow-md",
        compact ? "text-xs px-1.5 py-1" : ""
      )}
    >
      <GripVertical className="h-3 w-3 shrink-0 text-gray-300" />
      <span className="flex-1 truncate font-medium">
        {player.first_name} {player.last_name}
      </span>
      {player.positions && player.positions.length > 0 && (
        <span className="text-xs text-gray-400 shrink-0">
          {player.positions.slice(0, 2).join("/")}
        </span>
      )}
      {hasWarning && (
        <AlertTriangle className="h-3 w-3 shrink-0 text-amber-500" />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Team Column (droppable) - used in Roster Sandbox
// ─────────────────────────────────────────────────────────────────────────────

function TeamColumn({
  team,
  players,
  rosterLimit,
  warningPlayerIds,
}: {
  team: TeamWithPlayers;
  players: Player[];
  rosterLimit: number;
  warningPlayerIds: Set<string>;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: `team:${team.id}` });
  const overLimit = players.length > rosterLimit;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col rounded-xl border-2 bg-white shadow-sm flex-1 min-w-0 transition-colors",
        isOver ? "border-blue-400 bg-blue-50" : "border-gray-200"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between rounded-t-xl bg-slate-50 px-3 py-2 border-b border-gray-200">
        <div className="flex items-center gap-2 min-w-0">
          <Users className="h-4 w-4 shrink-0 text-slate-500" />
          <span className="font-semibold text-sm text-slate-800 truncate">{team.name}</span>
        </div>
        <Badge
          variant="outline"
          className={cn(
            "ml-1 shrink-0 text-xs",
            overLimit
              ? "border-red-300 text-red-600"
              : "border-gray-300 text-gray-600"
          )}
        >
          {players.length}/{rosterLimit}
        </Badge>
      </div>

      {/* Player list */}
      <div className="flex flex-col gap-1.5 p-2 flex-1 overflow-y-auto min-h-[120px]">
        {players.map((p) => (
          <PlayerCard
            key={p.id}
            player={p}
            hasWarning={warningPlayerIds.has(p.id)}
            dragData={{ type: "player", player: p, fromTeamId: team.id }}
          />
        ))}
        {players.length === 0 && (
          <p className="py-4 text-center text-xs text-gray-400">Drop players here</p>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Unassigned bucket (droppable)
// ─────────────────────────────────────────────────────────────────────────────

function UnassignedColumn({ players, warningPlayerIds }: { players: Player[]; warningPlayerIds: Set<string> }) {
  const { isOver, setNodeRef } = useDroppable({ id: "unassigned" });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col rounded-xl border-2 bg-white shadow-sm min-w-[190px] w-[190px] transition-colors",
        isOver ? "border-amber-400 bg-amber-50" : "border-dashed border-gray-300"
      )}
    >
      <div className="rounded-t-xl bg-slate-50 px-3 py-2 border-b border-gray-200">
        <span className="font-semibold text-sm text-slate-600">Unassigned</span>
        <span className="ml-2 text-xs text-gray-400">({players.length})</span>
      </div>
      <div className="flex flex-col gap-1.5 p-2 flex-1 min-h-[120px]">
        {players.map((p) => (
          <PlayerCard
            key={p.id}
            player={p}
            hasWarning={warningPlayerIds.has(p.id)}
            dragData={{ type: "player", player: p, fromTeamId: "unassigned" }}
          />
        ))}
        {players.length === 0 && (
          <p className="py-4 text-center text-xs text-gray-400">No unassigned</p>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Warnings Panel
// ─────────────────────────────────────────────────────────────────────────────

function WarningsPanel({ warnings }: { warnings: Warning[] }) {
  const [open, setOpen] = useState(false);
  if (warnings.length === 0) return null;

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 text-sm">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-3 py-2 font-medium text-amber-800"
      >
        <span className="flex items-center gap-1.5">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          {warnings.length} warning{warnings.length !== 1 ? "s" : ""}
        </span>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {open && (
        <ul className="border-t border-amber-200 px-3 py-2 space-y-1">
          {warnings.map((w, i) => (
            <li key={i} className="flex items-start gap-1.5 text-amber-700">
              <AlertTriangle className={cn("h-3.5 w-3.5 mt-0.5 shrink-0", w.type === "age" ? "text-red-500" : "text-amber-500")} />
              <span>
                <strong>{w.playerName}</strong>: {w.message}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Formation Field – one droppable slot (starter circle + backup pill)
// ─────────────────────────────────────────────────────────────────────────────

function FormationSlotDot({
  slotKey,
  label,
  slotPlayers,
  warnStarter,
  warnBackup,
  x,
  y,
}: {
  slotKey: string;
  label: string;
  slotPlayers: SlotPlayers;
  warnStarter: boolean;
  warnBackup: boolean;
  x: number;
  y: number;
}) {
  // ── Starter droppable + draggable ──
  const { isOver: isOverS, setNodeRef: setDropS } = useDroppable({ id: `drop-s:${slotKey}` });
  const starterDragData: DragData | undefined = slotPlayers.starter
    ? { type: "player", player: slotPlayers.starter, fromSlotKey: slotKey, fromSlotRole: "starter" }
    : undefined;
  const { attributes: attrsS, listeners: lisS, setNodeRef: setDragS, transform: transS, isDragging: isDragS } =
    useDraggable({ id: `slot-s:${slotKey}`, data: starterDragData, disabled: !slotPlayers.starter });
  const setRefS = (el: HTMLElement | null) => { setDropS(el); setDragS(el); };

  // ── Backup droppable + draggable ──
  const { isOver: isOverB, setNodeRef: setDropB } = useDroppable({ id: `drop-b:${slotKey}` });
  const backupDragData: DragData | undefined = slotPlayers.backup
    ? { type: "player", player: slotPlayers.backup, fromSlotKey: slotKey, fromSlotRole: "backup" }
    : undefined;
  const { attributes: attrsB, listeners: lisB, setNodeRef: setDragB, transform: transB, isDragging: isDragB } =
    useDraggable({ id: `slot-b:${slotKey}`, data: backupDragData, disabled: !slotPlayers.backup });
  const setRefB = (el: HTMLElement | null) => { setDropB(el); setDragB(el); };

  return (
    <div
      style={{ left: `${x}%`, top: `${y}%` }}
      className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-[2px] select-none z-10"
    >
      {/* Starter circle */}
      <div
        ref={setRefS}
        style={transS ? { transform: CSS.Translate.toString(transS) } : undefined}
        {...(slotPlayers.starter ? { ...lisS, ...attrsS } : {})}
        title={slotPlayers.starter ? `${slotPlayers.starter.first_name} ${slotPlayers.starter.last_name}` : label}
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all",
          isOverS
            ? "border-blue-300 bg-blue-200 scale-110"
            : slotPlayers.starter
            ? "border-blue-500 bg-blue-500 text-white shadow-md cursor-grab active:cursor-grabbing"
            : "border-dashed border-white/60 bg-white/20 text-white/80",
          isDragS ? "opacity-40" : ""
        )}
      >
        {slotPlayers.starter ? (
          <span className="text-[9px] font-bold leading-tight text-center truncate max-w-[32px] px-0.5">
            {slotPlayers.starter.last_name.slice(0, 5)}
          </span>
        ) : (
          <span className="text-[9px] text-white/70">{label}</span>
        )}
      </div>

      {/* Starter warning badge */}
      {warnStarter && !isDragS && (
        <AlertTriangle className="h-2.5 w-2.5 text-amber-400 -mt-0.5" />
      )}

      {/* Backup pill */}
      <div
        ref={setRefB}
        style={transB ? { transform: CSS.Translate.toString(transB) } : undefined}
        {...(slotPlayers.backup ? { ...lisB, ...attrsB } : {})}
        title={slotPlayers.backup ? `${slotPlayers.backup.first_name} ${slotPlayers.backup.last_name} (backup)` : "backup"}
        className={cn(
          "flex min-w-[40px] items-center justify-center gap-0.5 rounded px-1 py-0.5 border text-[8px] transition-all",
          isOverB
            ? "border-amber-300 bg-amber-100 text-amber-800 scale-105"
            : slotPlayers.backup
            ? "border-amber-400 bg-amber-100 text-amber-800 cursor-grab active:cursor-grabbing shadow-sm"
            : "border-dashed border-white/30 bg-white/10 text-white/40",
          isDragB ? "opacity-40" : ""
        )}
      >
        {slotPlayers.backup ? (
          <>
            {warnBackup && <AlertTriangle className="h-2 w-2 text-amber-500 shrink-0" />}
            <span className="font-medium truncate max-w-[34px]">
              {slotPlayers.backup.last_name.slice(0, 5)}
            </span>
          </>
        ) : (
          <span className="italic">bkup</span>
        )}
      </div>

      {/* Position label */}
      <span className="text-[9px] text-white/80 font-medium drop-shadow mt-0.5">{label}</span>
    </div>
  );
}

function SoccerField({
  formation,
  slots,
  warningPlayerIds,
}: {
  formation: FormationKey;
  slots: LineupSlots;
  warningPlayerIds: Set<string>;
}) {
  const slotDefs = FORMATIONS[formation];

  return (
    <div
      className="relative w-full rounded-xl overflow-hidden border-2 border-green-700"
      style={{ paddingBottom: "116%", background: "linear-gradient(180deg, #2d7a3a 0%, #3a9e4d 50%, #2d7a3a 100%)" }}
    >
      {/* Field markings */}
      <div className="absolute inset-0">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[18%] w-[40%] rounded-full border border-white/30" />
        <div className="absolute left-0 right-0 top-1/2 h-px bg-white/30" />
        <div className="absolute left-[20%] right-[20%] top-0 h-[22%] border border-white/30 border-t-0" />
        <div className="absolute left-[20%] right-[20%] bottom-0 h-[22%] border border-white/30 border-b-0" />
        <div className="absolute left-[37%] right-[37%] top-0 h-[3%] border border-white/40 border-t-0 bg-white/10" />
        <div className="absolute left-[37%] right-[37%] bottom-0 h-[3%] border border-white/40 border-b-0 bg-white/10" />
      </div>

      {/* Formation slots */}
      <div className="absolute inset-0">
        {slotDefs.map((slotDef) => {
          const sp = slots[slotDef.key] ?? { starter: null, backup: null };
          return (
            <FormationSlotDot
              key={slotDef.key}
              slotKey={slotDef.key}
              label={slotDef.label}
              slotPlayers={sp}
              warnStarter={!!sp.starter && warningPlayerIds.has(sp.starter.id)}
              warnBackup={!!sp.backup && warningPlayerIds.has(sp.backup.id)}
              x={slotDef.x}
              y={slotDef.y}
            />
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Bench (droppable)
// ─────────────────────────────────────────────────────────────────────────────

function BenchArea({ players, warningPlayerIds }: { players: Player[]; warningPlayerIds: Set<string> }) {
  const { isOver, setNodeRef } = useDroppable({ id: "bench" });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "rounded-lg border-2 p-2 transition-colors",
        isOver ? "border-blue-400 bg-blue-50" : "border-dashed border-gray-300 bg-gray-50"
      )}
    >
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
        Bench / Pool ({players.length})
      </p>
      <div className="flex flex-wrap gap-1.5">
        {players.map((p) => (
          <PlayerCard
            key={p.id}
            player={p}
            hasWarning={warningPlayerIds.has(p.id)}
            dragData={{ type: "player", player: p, fromBench: true }}
            compact
          />
        ))}
        {players.length === 0 && (
          <p className="text-xs text-gray-400 py-1">All players placed — drag from field to remove</p>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SavedLineup type
// ─────────────────────────────────────────────────────────────────────────────

interface SavedLineup {
  id: string;
  name: string;
  formation: string;
  slots: Record<string, { starter: string | null; backup: string | null }>;
  notes: string | null;
  updated_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Save Lineup Dialog
// ─────────────────────────────────────────────────────────────────────────────

function SaveLineupDialog({
  open,
  onClose,
  initialName,
  initialNotes,
  isUpdating,
  saving,
  saveError,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  initialName: string;
  initialNotes: string;
  isUpdating: boolean;
  saving: boolean;
  saveError: string | null;
  onSave: (name: string, notes: string, saveAsNew: boolean) => void;
}) {
  const [name, setName] = useState(initialName);
  const [notes, setNotes] = useState(initialNotes);

  // Sync when dialog opens
  useEffect(() => {
    if (open) {
      setName(initialName);
      setNotes(initialNotes);
    }
  }, [open, initialName, initialNotes]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isUpdating ? "Update Lineup" : "Save Lineup"}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lineup-name">Name</Label>
            <Input
              id="lineup-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Home vs. Rivals"
              disabled={saving}
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lineup-notes-dialog">Notes</Label>
            <textarea
              id="lineup-notes-dialog"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this lineup…"
              rows={4}
              disabled={saving}
              className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none"
            />
          </div>
          {saveError && <p className="text-xs text-red-600">{saveError}</p>}
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          {isUpdating && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSave(name, notes, true)}
              disabled={saving || !name.trim()}
            >
              Save as New
            </Button>
          )}
          <Button
            size="sm"
            onClick={() => onSave(name, notes, false)}
            disabled={saving || !name.trim()}
          >
            {saving ? "Saving…" : isUpdating ? "Update" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Load Lineup Dialog
// ─────────────────────────────────────────────────────────────────────────────

function LoadLineupDialog({
  open,
  onClose,
  lineups,
  loading,
  currentId,
  onLoad,
  onDelete,
}: {
  open: boolean;
  onClose: () => void;
  lineups: SavedLineup[];
  loading: boolean;
  currentId: string | null;
  onLoad: (lineup: SavedLineup) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Load Lineup</DialogTitle>
        </DialogHeader>
        {loading ? (
          <p className="text-sm text-gray-500 py-4 text-center">Loading…</p>
        ) : lineups.length === 0 ? (
          <p className="text-sm text-gray-500 py-4 text-center">
            No saved lineups for this team yet.
          </p>
        ) : (
          <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto pr-1">
            {lineups.map((l) => (
              <div
                key={l.id}
                className={cn(
                  "flex items-start gap-3 rounded-lg border p-3",
                  currentId === l.id
                    ? "border-primary bg-primary/5"
                    : "hover:bg-gray-50 cursor-pointer"
                )}
              >
                <div className="flex-1 min-w-0" onClick={() => onLoad(l)}>
                  <p className="font-medium text-sm truncate">{l.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {l.formation} · Updated {new Date(l.updated_at).toLocaleDateString()}
                  </p>
                  {l.notes && (
                    <p className="text-xs text-gray-400 mt-1 line-clamp-2">{l.notes}</p>
                  )}
                </div>
                <button
                  onClick={() => onDelete(l.id)}
                  className="shrink-0 p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50"
                  title="Delete lineup"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Client Component
// ─────────────────────────────────────────────────────────────────────────────

export interface LineupBuilderClientProps {
  initialTeams: TeamWithPlayers[];
  initialUnassigned: Player[];
}

export function LineupBuilderClient({ initialTeams, initialUnassigned }: LineupBuilderClientProps) {
  const [tab, setTab] = useState<"sandbox" | "lineup">("sandbox");

  // ── Sandbox state ──────────────────────────────────────────────────────────
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const initialSim = useMemo(() => buildInitialSim(initialTeams, initialUnassigned), []);

  const [sandboxHistory, sandboxDispatch] = useReducer(sandboxReducer, {
    past: [],
    present: initialSim,
    future: [],
  });

  const sim = sandboxHistory.present;

  // ── Sandbox team visibility (max 5 teams) ─────────────────────────────────
  const [sandboxVisibleTeamIds, setSandboxVisibleTeamIds] = useState<Set<string>>(
    () => new Set(initialTeams.slice(0, 5).map((t) => t.id))
  );
  const [sandboxTeamFilterOpen, setSandboxTeamFilterOpen] = useState(false);
  const [pendingSandboxTeamIds, setPendingSandboxTeamIds] = useState<Set<string>>(
    () => new Set(initialTeams.slice(0, 5).map((t) => t.id))
  );

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // ── Lineup builder state ───────────────────────────────────────────────────
  const firstTeamId = initialTeams[0]?.id ?? null;
  const [gameFormat, setGameFormat] = useState<GameFormat>("11v11");
  const [selectedLineupTeamId, setSelectedLineupTeamId] = useState<string | null>(firstTeamId);
  const [lineupState, setLineupState] = useState<LineupState>(() => ({
    formation: FORMAT_FORMATIONS["11v11"][0],
    slots: {},
    bench: initialTeams[0]?.players ?? [],
  }));

  const [lineupSaving, setLineupSaving] = useState(false);
  const [lineupSaveError, setLineupSaveError] = useState<string | null>(null);
  const [lineupSaveSuccess, setLineupSaveSuccess] = useState(false);

  // Named lineups
  const [lineupName, setLineupName] = useState("Untitled Lineup");
  const [lineupNotes, setLineupNotes] = useState("");
  const [currentLineupId, setCurrentLineupId] = useState<string | null>(null);
  const [savedLineups, setSavedLineups] = useState<SavedLineup[]>([]);
  const [loadingLineups, setLoadingLineups] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showLoadDialog, setShowLoadDialog] = useState(false);

  // Change selected lineup team
  const handleLineupTeamChange = useCallback((teamId: string) => {
    setSelectedLineupTeamId(teamId);
    const team = initialTeams.find((t) => t.id === teamId);
    setLineupState({ formation: FORMAT_FORMATIONS[gameFormat][0], slots: {}, bench: team?.players ?? [] });
    setLineupSaveError(null);
    setLineupSaveSuccess(false);
    // Reset named lineup state
    setCurrentLineupId(null);
    setLineupName("Untitled Lineup");
    setLineupNotes("");
    setSavedLineups([]);
  }, [initialTeams, gameFormat]);

  // Change game format — resets formation + clears all slots
  const handleGameFormatChange = useCallback((gf: GameFormat) => {
    const newFormation = FORMAT_FORMATIONS[gf][0];
    setGameFormat(gf);
    setLineupState((prev) => {
      const placed: Player[] = [];
      for (const sp of Object.values(prev.slots)) {
        if (sp.starter) placed.push(sp.starter);
        if (sp.backup) placed.push(sp.backup);
      }
      return { formation: newFormation, slots: {}, bench: [...prev.bench, ...placed] };
    });
  }, []);

  // Change formation within same format — clears slots
  const handleFormationChange = useCallback((f: FormationKey) => {
    setLineupState((prev) => {
      const placed: Player[] = [];
      for (const sp of Object.values(prev.slots)) {
        if (sp.starter) placed.push(sp.starter);
        if (sp.backup) placed.push(sp.backup);
      }
      return { formation: f, slots: {}, bench: [...prev.bench, ...placed] };
    });
  }, []);

  // ── Active drag tracking ────────────────────────────────────────────────────
  const [activePlayer, setActivePlayer] = useState<Player | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const data = event.active.data.current as DragData | undefined;
    setActivePlayer(data?.player ?? null);
  }, []);

  // ── Sandbox drag end ─────────────────────────────────────────────────────────
  const handleSandboxDragEnd = useCallback((event: DragEndEvent) => {
    setActivePlayer(null);
    const { over, active } = event;
    if (!over) return;
    const data = active.data.current as DragData | undefined;
    if (!data?.player) return;

    const fromTeamId = data.fromTeamId ?? "unassigned";
    let toTeamId: string | "unassigned" = "unassigned";

    if (String(over.id).startsWith("team:")) {
      toTeamId = String(over.id).replace("team:", "");
    } else if (over.id === "unassigned") {
      toTeamId = "unassigned";
    } else {
      return;
    }

    sandboxDispatch({
      type: "MOVE_PLAYER",
      playerId: data.player.id,
      fromTeamId,
      toTeamId,
    });
  }, []);

  // ── Lineup drag end ──────────────────────────────────────────────────────────
  const handleLineupDragEnd = useCallback((event: DragEndEvent) => {
    setActivePlayer(null);
    const { over, active } = event;
    if (!over) return;
    const data = active.data.current as DragData | undefined;
    if (!data?.player) return;

    const player = data.player;
    const toId = String(over.id);

    setLineupState((prev) => {
      const newSlots: LineupSlots = {};
      for (const [k, v] of Object.entries(prev.slots)) newSlots[k] = { ...v };
      let newBench = [...prev.bench];

      // ── Remove from source ──
      if (data.fromBench) {
        newBench = newBench.filter((p) => p.id !== player.id);
      } else if (data.fromSlotKey && data.fromSlotRole) {
        const cur = newSlots[data.fromSlotKey] ?? { starter: null, backup: null };
        newSlots[data.fromSlotKey] = { ...cur, [data.fromSlotRole]: null };
      }

      // ── Add to destination ──
      if (toId === "bench") {
        // Already removed from slot above; push to bench
        newBench = [...newBench, player];
      } else if (toId.startsWith("drop-s:")) {
        const slotKey = toId.replace("drop-s:", "");
        const cur = newSlots[slotKey] ?? { starter: null, backup: null };
        const displaced = cur.starter;
        newSlots[slotKey] = { ...cur, starter: player };
        if (displaced && displaced.id !== player.id) newBench = [...newBench, displaced];
      } else if (toId.startsWith("drop-b:")) {
        const slotKey = toId.replace("drop-b:", "");
        const cur = newSlots[slotKey] ?? { starter: null, backup: null };
        const displaced = cur.backup;
        newSlots[slotKey] = { ...cur, backup: player };
        if (displaced && displaced.id !== player.id) newBench = [...newBench, displaced];
      } else {
        // Over an unknown target — undo the source removal by returning prev
        return prev;
      }

      return { ...prev, slots: newSlots, bench: newBench };
    });
  }, []);

  // ── Sandbox warnings ─────────────────────────────────────────────────────────
  const sandboxWarnings = useMemo(() => {
    return computeRosterWarnings(initialTeams, sim.rosters);
  }, [initialTeams, sim.rosters]);
  const sandboxWarnIds = useMemo(() => new Set(sandboxWarnings.map((w) => w.playerId)), [sandboxWarnings]);

  // ── Lineup warnings ───────────────────────────────────────────────────────────
  const lineupTeam = initialTeams.find((t) => t.id === selectedLineupTeamId) ?? null;
  const lineupWarnings = useMemo(() => {
    if (!lineupTeam) return [] as Warning[];
    return computeLineupWarnings(lineupTeam, lineupState.slots, lineupState.formation);
  }, [lineupTeam, lineupState.slots, lineupState.formation]);
  const lineupWarnIds = useMemo(() => new Set(lineupWarnings.map((w) => w.playerId)), [lineupWarnings]);
  const starterCount = Object.values(lineupState.slots).filter((sp) => sp.starter).length;
  const slotCount = FORMATIONS[lineupState.formation]?.length ?? 0;

  // ── Compute sandbox diffs (for Save) ─────────────────────────────────────────
  const sandboxMoves = useMemo(() => {
    const moves: Array<{ player_id: string; team_name: string | null }> = [];
    const allPlayers = [
      ...Object.values(sim.rosters).flat(),
      ...sim.unassigned,
    ];
    for (const player of allPlayers) {
      const origTeam = initialTeams.find((t) => t.players.some((p) => p.id === player.id));
      const origTeamName = origTeam?.name ?? null;

      // What team are they in now?
      let currentTeamName: string | null = null;
      for (const [teamId, players] of Object.entries(sim.rosters)) {
        if (players.some((p) => p.id === player.id)) {
          const team = initialTeams.find((t) => t.id === teamId);
          currentTeamName = team?.name ?? null;
          break;
        }
      }

      if (origTeamName !== currentTeamName) {
        moves.push({ player_id: player.id, team_name: currentTeamName });
      }
    }
    return moves;
  }, [sim, initialTeams]);

  const hasSandboxChanges = sandboxMoves.length > 0;

  // ── Save roster ───────────────────────────────────────────────────────────────
  const handleSaveRoster = useCallback(async () => {
    if (!hasSandboxChanges) return;
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      const res = await fetch("/api/app/lineup/save-roster", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moves: sandboxMoves }),
      });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error ?? "Save failed");
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }, [hasSandboxChanges, sandboxMoves]);

  // ── Fetch saved lineups ───────────────────────────────────────────────────────
  const fetchSavedLineups = useCallback(async (teamId: string) => {
    setLoadingLineups(true);
    try {
      const res = await fetch(`/api/app/lineup?team_id=${teamId}`);
      if (res.ok) {
        const j = await res.json();
        setSavedLineups(j.lineups ?? []);
      }
    } finally {
      setLoadingLineups(false);
    }
  }, []);

  // Auto-fetch saved lineups when switching to lineup tab or changing team
  useEffect(() => {
    if (tab === "lineup" && selectedLineupTeamId && !String(selectedLineupTeamId).startsWith("virtual:")) {
      void fetchSavedLineups(selectedLineupTeamId);
    }
  }, [tab, selectedLineupTeamId, fetchSavedLineups]);

  // ── Load a saved lineup into the builder ─────────────────────────────────────
  const handleLoadLineup = useCallback((sl: SavedLineup) => {
    const team = initialTeams.find((t) => t.id === selectedLineupTeamId);
    if (!team) return;

    const formationKey = sl.formation as FormationKey;
    const detectedFormat = (
      Object.entries(FORMAT_FORMATIONS) as [GameFormat, FormationKey[]][]
    ).find(([, formations]) => formations.includes(formationKey))?.[0] ?? gameFormat;

    const playerMap = new Map(team.players.map((p) => [p.id, p]));
    const newSlots: LineupSlots = {};
    for (const [key, val] of Object.entries(sl.slots)) {
      newSlots[key] = {
        starter: val.starter ? (playerMap.get(val.starter) ?? null) : null,
        backup: val.backup ? (playerMap.get(val.backup) ?? null) : null,
      };
    }

    const slottedIds = new Set<string>();
    for (const sp of Object.values(newSlots)) {
      if (sp.starter) slottedIds.add(sp.starter.id);
      if (sp.backup) slottedIds.add(sp.backup.id);
    }
    const newBench = team.players.filter((p) => !slottedIds.has(p.id));

    setGameFormat(detectedFormat);
    setLineupState({ formation: formationKey, slots: newSlots, bench: newBench });
    setLineupName(sl.name);
    setLineupNotes(sl.notes ?? "");
    setCurrentLineupId(sl.id);
    setShowLoadDialog(false);
  }, [selectedLineupTeamId, initialTeams, gameFormat]);

  // ── Delete a saved lineup ─────────────────────────────────────────────────────
  const handleDeleteSavedLineup = useCallback(async (id: string) => {
    await fetch(`/api/app/lineup/${id}`, { method: "DELETE" });
    setSavedLineups((prev) => prev.filter((l) => l.id !== id));
    if (currentLineupId === id) {
      setCurrentLineupId(null);
      setLineupName("Untitled Lineup");
      setLineupNotes("");
    }
  }, [currentLineupId]);

  // ── Save lineup ───────────────────────────────────────────────────────────────
  const handleSaveLineup = useCallback(async (nameArg: string, notesArg: string, saveAsNew: boolean) => {
    if (!selectedLineupTeamId) return;
    setLineupSaving(true);
    setLineupSaveError(null);
    setLineupSaveSuccess(false);
    try {
      const slotsPayload: Record<string, { starter: string | null; backup: string | null }> = {};
      for (const [k, v] of Object.entries(lineupState.slots)) {
        slotsPayload[k] = { starter: v.starter?.id ?? null, backup: v.backup?.id ?? null };
      }

      let res: Response;
      if (currentLineupId && !saveAsNew) {
        // Update existing lineup
        res = await fetch(`/api/app/lineup/${currentLineupId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: nameArg,
            notes: notesArg,
            formation: lineupState.formation,
            slots: slotsPayload,
          }),
        });
      } else {
        // Create new lineup
        res = await fetch("/api/app/lineup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            team_id: selectedLineupTeamId,
            formation: lineupState.formation,
            slots: slotsPayload,
            name: nameArg,
            notes: notesArg,
          }),
        });
      }

      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error ?? "Save failed");
      }

      const j = await res.json();
      const saved = j.lineup as SavedLineup;
      setCurrentLineupId(saved.id);
      setLineupName(saved.name);
      setLineupNotes(saved.notes ?? "");
      setSavedLineups((prev) => {
        const exists = prev.find((l) => l.id === saved.id);
        if (exists) return prev.map((l) => (l.id === saved.id ? saved : l));
        return [saved, ...prev];
      });
      setLineupSaveSuccess(true);
      setShowSaveDialog(false);
      setTimeout(() => setLineupSaveSuccess(false), 3000);
    } catch (e) {
      setLineupSaveError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setLineupSaving(false);
    }
  }, [selectedLineupTeamId, lineupState, currentLineupId]);

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full gap-4 p-6 overflow-hidden">
      {/* Page header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Virtual Roster &amp; Lineup Builder</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Simulate roster changes and build formations. Changes are virtual until you click Save.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit shrink-0">
        {(["sandbox", "lineup"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
              tab === t ? "bg-white text-blue-700 shadow-sm" : "text-gray-600 hover:text-gray-900"
            )}
          >
            {t === "sandbox" ? <Users className="h-4 w-4" /> : <Layers className="h-4 w-4" />}
            {t === "sandbox" ? "Roster Sandbox" : "Lineup Builder"}
          </button>
        ))}
      </div>

      {/* ── ROSTER SANDBOX ────────────────────────────────────────────────────── */}
      {tab === "sandbox" && (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleSandboxDragEnd}>
          <div className="flex flex-col gap-3 flex-1 overflow-hidden">
            {/* Control bar */}
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => sandboxDispatch({ type: "RESET", initial: initialSim })}
                disabled={saving}
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                Reset
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => sandboxDispatch({ type: "UNDO" })}
                disabled={sandboxHistory.past.length === 0 || saving}
              >
                <Undo2 className="h-3.5 w-3.5 mr-1" />
                Undo
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => sandboxDispatch({ type: "REDO" })}
                disabled={sandboxHistory.future.length === 0 || saving}
              >
                <Redo2 className="h-3.5 w-3.5 mr-1" />
                Redo
              </Button>
              <div className="flex-1" />
              {hasSandboxChanges && (
                <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                  {sandboxMoves.length} unsaved change{sandboxMoves.length !== 1 ? "s" : ""}
                </span>
              )}
              {saveError && <span className="text-xs text-red-600">{saveError}</span>}
              {saveSuccess && <span className="text-xs text-green-600">Saved!</span>}
              <Button
                size="sm"
                onClick={handleSaveRoster}
                disabled={!hasSandboxChanges || saving}
              >
                {saving ? (
                  <span className="flex items-center gap-1">
                    <span className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full" />
                    Saving…
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <Save className="h-3.5 w-3.5" />
                    Save Roster
                  </span>
                )}
              </Button>
            </div>

            {/* Warnings */}
            <div className="shrink-0">
              <WarningsPanel warnings={sandboxWarnings} />
            </div>

            {/* Teams grid */}
            <div className="flex gap-3 flex-1 overflow-x-auto overflow-y-auto pb-2">
              {initialTeams.map((team) => (
                <TeamColumn
                  key={team.id}
                  team={team}
                  players={sim.rosters[team.id] ?? []}
                  rosterLimit={team.roster_limit ?? 16}
                  warningPlayerIds={sandboxWarnIds}
                />
              ))}
              <UnassignedColumn players={sim.unassigned} warningPlayerIds={sandboxWarnIds} />
            </div>
          </div>

          {/* Drag overlay */}
          <DragOverlay>
            {activePlayer && (
              <div className="flex items-center gap-2 rounded-md border bg-white px-2 py-1.5 text-sm shadow-xl opacity-90 rotate-2">
                <GripVertical className="h-3 w-3 text-gray-300" />
                <span className="font-medium">
                  {activePlayer.first_name} {activePlayer.last_name}
                </span>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      {/* ── LINEUP BUILDER ────────────────────────────────────────────────────── */}
      {tab === "lineup" && (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleLineupDragEnd}>
          <div className="flex flex-col gap-3 flex-1 overflow-hidden">
            {/* Controls */}
            <div className="flex items-center gap-3 shrink-0 flex-wrap">
              {/* Team picker */}
              <Select
                value={selectedLineupTeamId ?? ""}
                onValueChange={handleLineupTeamChange}
              >
                <SelectTrigger className="w-[200px] h-8 text-sm">
                  <SelectValue placeholder="Select a team" />
                </SelectTrigger>
                <SelectContent>
                  {initialTeams.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Game format picker */}
              <Select
                value={gameFormat}
                onValueChange={(v) => handleGameFormatChange(v as GameFormat)}
              >
                <SelectTrigger className="w-[120px] h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GAME_FORMATS.map((gf) => (
                    <SelectItem key={gf} value={gf}>
                      {GAME_FORMAT_LABELS[gf]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Formation picker */}
              <Select
                value={lineupState.formation}
                onValueChange={(v) => handleFormationChange(v as FormationKey)}
              >
                <SelectTrigger className="w-[130px] h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FORMAT_FORMATIONS[gameFormat].map((f) => (
                    <SelectItem key={f} value={f}>
                      {getFormationLabel(f)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex-1" />

              <span className="text-xs text-gray-500 tabular-nums">
                {starterCount}/{slotCount} starters placed
              </span>

              {lineupSaveError && <span className="text-xs text-red-600">{lineupSaveError}</span>}
              {lineupSaveSuccess && <span className="text-xs text-green-600">Lineup saved!</span>}

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (selectedLineupTeamId && !String(selectedLineupTeamId).startsWith("virtual:")) {
                    void fetchSavedLineups(selectedLineupTeamId);
                  }
                  setShowLoadDialog(true);
                }}
                disabled={!selectedLineupTeamId || String(selectedLineupTeamId).startsWith("virtual:")}
              >
                <FolderOpen className="h-3.5 w-3.5 mr-1" />
                Load
              </Button>

              <Button
                size="sm"
                onClick={() => setShowSaveDialog(true)}
                disabled={!selectedLineupTeamId || lineupSaving || String(selectedLineupTeamId).startsWith("virtual:")}
                title={String(selectedLineupTeamId).startsWith("virtual:") ? "Create this team in the DB before saving a lineup" : undefined}
              >
                {lineupSaving ? (
                  <span className="flex items-center gap-1">
                    <span className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full" />
                    Saving…
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <Save className="h-3.5 w-3.5" />
                    Save Lineup
                  </span>
                )}
              </Button>
            </div>

            {/* Warnings */}
            <div className="shrink-0">
              <WarningsPanel warnings={lineupWarnings} />
            </div>

            {/* Field + bench + notes */}
            {selectedLineupTeamId ? (
              <div className="flex gap-4 flex-1 overflow-auto">
                {/* Field */}
                <div className="w-[560px] shrink-0">
                  <SoccerField
                    formation={lineupState.formation}
                    slots={lineupState.slots}
                    warningPlayerIds={lineupWarnIds}
                  />
                </div>

                {/* Bench */}
                <div className="w-64 shrink-0 flex flex-col gap-2">
                  <p className="text-xs text-gray-500 font-medium">
                    Team: <strong className="text-gray-800">{lineupTeam?.name}</strong>
                    &nbsp;·&nbsp;Formation: <strong className="text-gray-800">{lineupState.formation}</strong>
                    &nbsp;·&nbsp;Starters:{" "}
                    <strong className="text-gray-800">
                      {starterCount}/{slotCount}
                    </strong>
                  </p>
                  <BenchArea players={lineupState.bench} warningPlayerIds={lineupWarnIds} />
                </div>

                {/* Coach notes */}
                <div className="flex-1 min-w-[180px] flex flex-col gap-1.5">
                  <p className="text-xs font-medium text-gray-600">
                    Coach Notes
                    {currentLineupId && (
                      <span className="ml-1.5 text-gray-400 font-normal">— {lineupName}</span>
                    )}
                  </p>
                  <textarea
                    value={lineupNotes}
                    onChange={(e) => setLineupNotes(e.target.value)}
                    placeholder="Add notes about this lineup…"
                    className="flex-1 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none min-h-[120px]"
                  />
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
                Select a team above to build a lineup.
              </div>
            )}
          </div>

          {/* Drag overlay */}
          <DragOverlay>
            {activePlayer && (
              <div className="flex items-center gap-2 rounded-md border bg-white px-2 py-1.5 text-sm shadow-xl opacity-90 rotate-2">
                <GripVertical className="h-3 w-3 text-gray-300" />
                <span className="font-medium">
                  {activePlayer.first_name} {activePlayer.last_name}
                </span>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      {/* Save lineup dialog */}
      <SaveLineupDialog
        open={showSaveDialog}
        onClose={() => setShowSaveDialog(false)}
        initialName={lineupName}
        initialNotes={lineupNotes}
        isUpdating={!!currentLineupId}
        saving={lineupSaving}
        saveError={lineupSaveError}
        onSave={handleSaveLineup}
      />

      {/* Load lineup dialog */}
      <LoadLineupDialog
        open={showLoadDialog}
        onClose={() => setShowLoadDialog(false)}
        lineups={savedLineups}
        loading={loadingLineups}
        currentId={currentLineupId}
        onLoad={handleLoadLineup}
        onDelete={handleDeleteSavedLineup}
      />
    </div>
  );
}
