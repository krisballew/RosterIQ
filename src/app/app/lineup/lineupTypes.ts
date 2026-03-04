// Shared types and formation definitions for the Lineup Builder feature
import type { Player, Team, FormationKey } from "@/types/database";

// ─── Re-exports ───────────────────────────────────────────────────────────────
export type { Player, Team, FormationKey };

// ─── Game format ──────────────────────────────────────────────────────────────
export type GameFormat = "4v4" | "7v7" | "9v9" | "11v11";

export const GAME_FORMAT_LABELS: Record<GameFormat, string> = {
  "4v4":   "4v4  (Small-Sided)",
  "7v7":   "7v7  (Youth)",
  "9v9":   "9v9  (Youth)",
  "11v11": "11v11 (Full)",
};

/** Returns the GameFormat portion of a FormationKey, e.g. "4v4" from "4v4-1-2" */
export function getGameFormat(key: FormationKey): GameFormat {
  const dash = key.indexOf("-");
  return (dash >= 0 ? key.slice(0, dash) : key) as GameFormat;
}

/** Returns the shape label, e.g. "1-2" from "4v4-1-2", "4-3-3" from "11v11-4-3-3" */
export function getFormationLabel(key: FormationKey): string {
  const dash = key.indexOf("-");
  return dash >= 0 ? key.slice(dash + 1) : key;
}

// ─── Team with players attached ───────────────────────────────────────────────
export interface TeamWithPlayers extends Team {
  players: Player[];
}

// ─── Depth chart slot (starter + backup) ─────────────────────────────────────
export interface SlotPlayers {
  starter: Player | null;
  backup: Player | null;
}

export type LineupSlots = Record<string, SlotPlayers>;

// ─── Formation slot ───────────────────────────────────────────────────────────
export interface FormationSlot {
  key: string;
  label: string;
  /** Position category for position-mismatch warnings: GK | DEF | MID | FWD */
  posTag: string;
  x: number; // % of field width
  y: number; // % of field height
}

// ─── Formation definitions ────────────────────────────────────────────────────
export const FORMATIONS: Record<FormationKey, FormationSlot[]> = {
  // ── 4v4 ──────────────────────────────────────────────────────────────────
  "4v4-1-2": [
    { key: "GK",  label: "GK",  posTag: "GK",  x: 50, y: 82 },
    { key: "CB",  label: "CB",  posTag: "DEF", x: 50, y: 58 },
    { key: "RW",  label: "FWD", posTag: "FWD", x: 70, y: 22 },
    { key: "LW",  label: "FWD", posTag: "FWD", x: 30, y: 22 },
  ],
  "4v4-2-1": [
    { key: "GK",   label: "GK",  posTag: "GK",  x: 50, y: 82 },
    { key: "CB-R", label: "CB",  posTag: "DEF", x: 65, y: 60 },
    { key: "CB-L", label: "CB",  posTag: "DEF", x: 35, y: 60 },
    { key: "ST",   label: "ST",  posTag: "FWD", x: 50, y: 20 },
  ],

  // ── 7v7 ──────────────────────────────────────────────────────────────────
  "7v7-2-3-1": [
    { key: "GK",  label: "GK",  posTag: "GK",  x: 50, y: 82 },
    { key: "RD",  label: "RD",  posTag: "DEF", x: 68, y: 63 },
    { key: "LD",  label: "LD",  posTag: "DEF", x: 32, y: 63 },
    { key: "RM",  label: "RM",  posTag: "MID", x: 75, y: 45 },
    { key: "CM",  label: "CM",  posTag: "MID", x: 50, y: 45 },
    { key: "LM",  label: "LM",  posTag: "MID", x: 25, y: 45 },
    { key: "ST",  label: "ST",  posTag: "FWD", x: 50, y: 18 },
  ],
  "7v7-3-2-1": [
    { key: "GK",  label: "GK",  posTag: "GK",  x: 50, y: 82 },
    { key: "RB",  label: "RB",  posTag: "DEF", x: 76, y: 63 },
    { key: "CB",  label: "CB",  posTag: "DEF", x: 50, y: 63 },
    { key: "LB",  label: "LB",  posTag: "DEF", x: 24, y: 63 },
    { key: "RM",  label: "RM",  posTag: "MID", x: 65, y: 43 },
    { key: "LM",  label: "LM",  posTag: "MID", x: 35, y: 43 },
    { key: "ST",  label: "ST",  posTag: "FWD", x: 50, y: 18 },
  ],
  "7v7-1-3-2": [
    { key: "GK",  label: "GK",  posTag: "GK",  x: 50, y: 82 },
    { key: "CB",  label: "CB",  posTag: "DEF", x: 50, y: 63 },
    { key: "RM",  label: "RM",  posTag: "MID", x: 76, y: 43 },
    { key: "CM",  label: "CM",  posTag: "MID", x: 50, y: 43 },
    { key: "LM",  label: "LM",  posTag: "MID", x: 24, y: 43 },
    { key: "RS",  label: "ST",  posTag: "FWD", x: 65, y: 18 },
    { key: "LS",  label: "ST",  posTag: "FWD", x: 35, y: 18 },
  ],

  // ── 9v9 ──────────────────────────────────────────────────────────────────
  "9v9-3-3-2": [
    { key: "GK",   label: "GK",  posTag: "GK",  x: 50, y: 84 },
    { key: "RB",   label: "RB",  posTag: "DEF", x: 76, y: 65 },
    { key: "CB",   label: "CB",  posTag: "DEF", x: 50, y: 65 },
    { key: "LB",   label: "LB",  posTag: "DEF", x: 24, y: 65 },
    { key: "RM",   label: "RM",  posTag: "MID", x: 72, y: 46 },
    { key: "CM",   label: "CM",  posTag: "MID", x: 50, y: 46 },
    { key: "LM",   label: "LM",  posTag: "MID", x: 28, y: 46 },
    { key: "RS",   label: "ST",  posTag: "FWD", x: 65, y: 20 },
    { key: "LS",   label: "ST",  posTag: "FWD", x: 35, y: 20 },
  ],
  "9v9-2-4-2": [
    { key: "GK",   label: "GK",  posTag: "GK",  x: 50, y: 84 },
    { key: "RB",   label: "RB",  posTag: "DEF", x: 68, y: 65 },
    { key: "LB",   label: "LB",  posTag: "DEF", x: 32, y: 65 },
    { key: "RM",   label: "RM",  posTag: "MID", x: 80, y: 46 },
    { key: "CM-R", label: "CM",  posTag: "MID", x: 60, y: 46 },
    { key: "CM-L", label: "CM",  posTag: "MID", x: 40, y: 46 },
    { key: "LM",   label: "LM",  posTag: "MID", x: 20, y: 46 },
    { key: "RS",   label: "ST",  posTag: "FWD", x: 65, y: 20 },
    { key: "LS",   label: "ST",  posTag: "FWD", x: 35, y: 20 },
  ],
  "9v9-3-2-3": [
    { key: "GK",   label: "GK",  posTag: "GK",  x: 50, y: 84 },
    { key: "RB",   label: "RB",  posTag: "DEF", x: 76, y: 65 },
    { key: "CB",   label: "CB",  posTag: "DEF", x: 50, y: 65 },
    { key: "LB",   label: "LB",  posTag: "DEF", x: 24, y: 65 },
    { key: "CM-R", label: "CM",  posTag: "MID", x: 65, y: 46 },
    { key: "CM-L", label: "CM",  posTag: "MID", x: 35, y: 46 },
    { key: "RW",   label: "RW",  posTag: "FWD", x: 78, y: 20 },
    { key: "ST",   label: "ST",  posTag: "FWD", x: 50, y: 18 },
    { key: "LW",   label: "LW",  posTag: "FWD", x: 22, y: 20 },
  ],

  // ── 11v11 ─────────────────────────────────────────────────────────────────
  "11v11-4-3-3": [
    { key: "GK",   label: "GK",  posTag: "GK",  x: 50, y: 85 },
    { key: "RB",   label: "RB",  posTag: "DEF", x: 82, y: 68 },
    { key: "CB-R", label: "CB",  posTag: "DEF", x: 63, y: 68 },
    { key: "CB-L", label: "CB",  posTag: "DEF", x: 37, y: 68 },
    { key: "LB",   label: "LB",  posTag: "DEF", x: 18, y: 68 },
    { key: "CM-R", label: "CM",  posTag: "MID", x: 70, y: 48 },
    { key: "CM-C", label: "CM",  posTag: "MID", x: 50, y: 48 },
    { key: "CM-L", label: "CM",  posTag: "MID", x: 30, y: 48 },
    { key: "RW",   label: "RW",  posTag: "FWD", x: 78, y: 22 },
    { key: "ST",   label: "ST",  posTag: "FWD", x: 50, y: 16 },
    { key: "LW",   label: "LW",  posTag: "FWD", x: 22, y: 22 },
  ],
  "11v11-4-4-2": [
    { key: "GK",   label: "GK",  posTag: "GK",  x: 50, y: 85 },
    { key: "RB",   label: "RB",  posTag: "DEF", x: 82, y: 68 },
    { key: "CB-R", label: "CB",  posTag: "DEF", x: 63, y: 68 },
    { key: "CB-L", label: "CB",  posTag: "DEF", x: 37, y: 68 },
    { key: "LB",   label: "LB",  posTag: "DEF", x: 18, y: 68 },
    { key: "RM",   label: "RM",  posTag: "MID", x: 82, y: 48 },
    { key: "CM-R", label: "CM",  posTag: "MID", x: 61, y: 48 },
    { key: "CM-L", label: "CM",  posTag: "MID", x: 39, y: 48 },
    { key: "LM",   label: "LM",  posTag: "MID", x: 18, y: 48 },
    { key: "RS",   label: "ST",  posTag: "FWD", x: 65, y: 20 },
    { key: "LS",   label: "ST",  posTag: "FWD", x: 35, y: 20 },
  ],
  "11v11-3-5-2": [
    { key: "GK",   label: "GK",  posTag: "GK",  x: 50, y: 85 },
    { key: "CB-R", label: "CB",  posTag: "DEF", x: 72, y: 68 },
    { key: "CB-C", label: "CB",  posTag: "DEF", x: 50, y: 68 },
    { key: "CB-L", label: "CB",  posTag: "DEF", x: 28, y: 68 },
    { key: "RM",   label: "RM",  posTag: "MID", x: 90, y: 50 },
    { key: "CM-R", label: "CM",  posTag: "MID", x: 70, y: 50 },
    { key: "CM-C", label: "CM",  posTag: "MID", x: 50, y: 50 },
    { key: "CM-L", label: "CM",  posTag: "MID", x: 30, y: 50 },
    { key: "LM",   label: "LM",  posTag: "MID", x: 10, y: 50 },
    { key: "RS",   label: "ST",  posTag: "FWD", x: 65, y: 20 },
    { key: "LS",   label: "ST",  posTag: "FWD", x: 35, y: 20 },
  ],
};

/** All formation keys grouped by GameFormat */
export const FORMAT_FORMATIONS: Record<GameFormat, FormationKey[]> = {
  "4v4":   ["4v4-1-2", "4v4-2-1"],
  "7v7":   ["7v7-2-3-1", "7v7-3-2-1", "7v7-1-3-2"],
  "9v9":   ["9v9-3-3-2", "9v9-2-4-2", "9v9-3-2-3"],
  "11v11": ["11v11-4-3-3", "11v11-4-4-2", "11v11-3-5-2"],
};

export const GAME_FORMATS: GameFormat[] = ["4v4", "7v7", "9v9", "11v11"];

// ─── Simulation state ─────────────────────────────────────────────────────────
export type RosterMap = Record<string, Player[]>;

export interface SimState {
  rosters: RosterMap;
  unassigned: Player[];
}

// ─── Warning helpers ──────────────────────────────────────────────────────────
export interface Warning {
  playerId: string;
  playerName: string;
  message: string;
  type: "age" | "position";
}

function posMatches(position: string, posTag: string): boolean {
  const pl = position.toLowerCase();
  switch (posTag) {
    case "GK":  return pl === "gk";
    case "DEF": return ["cb", "rb", "lb", "wb", "def"].includes(pl);
    case "MID": return ["cm", "dm", "am", "rm", "lm", "mid"].includes(pl);
    case "FWD": return ["st", "rw", "lw", "cf", "ss", "fwd", "att"].includes(pl);
    default:    return false;
  }
}

export function computeRosterWarnings(
  teams: TeamWithPlayers[],
  rosters: RosterMap
): Warning[] {
  const warnings: Warning[] = [];
  for (const team of teams) {
    for (const player of rosters[team.id] ?? []) {
      if (team.birth_year && player.birth_year && player.birth_year !== team.birth_year) {
        warnings.push({
          playerId: player.id,
          playerName: `${player.first_name} ${player.last_name}`,
          message: `Age mismatch: player birth year ${player.birth_year} vs team eligibility ${team.birth_year}`,
          type: "age",
        });
      }
    }
  }
  return warnings;
}

export function computeLineupWarnings(
  team: TeamWithPlayers,
  slots: LineupSlots,
  formation: FormationKey
): Warning[] {
  const warnings: Warning[] = [];
  const slotDefs = FORMATIONS[formation];

  // Collect all placed players (starter + backup)
  const allPlaced: { player: Player; slotKey: string; role: "starter" | "backup" }[] = [];
  for (const [key, sp] of Object.entries(slots)) {
    if (sp.starter) allPlaced.push({ player: sp.starter, slotKey: key, role: "starter" });
    if (sp.backup)  allPlaced.push({ player: sp.backup,  slotKey: key, role: "backup" });
  }

  // Age warnings (deduplicated per player)
  const seenAge = new Set<string>();
  for (const { player } of allPlaced) {
    if (seenAge.has(player.id)) continue;
    if (team.birth_year && player.birth_year && player.birth_year !== team.birth_year) {
      seenAge.add(player.id);
      warnings.push({
        playerId: player.id,
        playerName: `${player.first_name} ${player.last_name}`,
        message: `Age mismatch: player born ${player.birth_year}, team eligibility ${team.birth_year}`,
        type: "age",
      });
    }
  }

  // Position mismatch for every placed player
  for (const slotDef of slotDefs) {
    const sp = slots[slotDef.key];
    for (const [player, role] of [
      [sp?.starter, "starter"],
      [sp?.backup,  "backup"],
    ] as Array<[Player | null | undefined, string]>) {
      if (!player || !player.positions?.length) continue;
      if (!player.positions.some((p) => posMatches(p, slotDef.posTag))) {
        warnings.push({
          playerId: player.id,
          playerName: `${player.first_name} ${player.last_name}`,
          message: `Position mismatch (${role}): ${player.positions.join("/")} at ${slotDef.label} (${slotDef.posTag})`,
          type: "position",
        });
      }
    }
  }

  return warnings;
}

