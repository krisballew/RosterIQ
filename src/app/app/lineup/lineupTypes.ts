// Shared types and formation definitions for the Lineup Builder feature
import type { Player, Team, FormationKey } from "@/types/database";

// ─── Re-exports ───────────────────────────────────────────────────────────────
export type { Player, Team, FormationKey };

// ─── Team with players attached ───────────────────────────────────────────────
export interface TeamWithPlayers extends Team {
  players: Player[];
}

// ─── Formation slot ───────────────────────────────────────────────────────────
export interface FormationSlot {
  key: string;   // unique within formation e.g. "GK", "CB-R"
  label: string; // display label
  /** Position category for position-mismatch warnings */
  posTag: string;
  /** Left position as percentage of field width */
  x: number;
  /** Top position as percentage of field height */
  y: number;
}

// ─── Formation definitions ────────────────────────────────────────────────────
export const FORMATIONS: Record<FormationKey, FormationSlot[]> = {
  "4-3-3": [
    { key: "GK",    label: "GK",  posTag: "GK",  x: 50, y: 85 },
    { key: "RB",    label: "RB",  posTag: "DEF", x: 82, y: 68 },
    { key: "CB-R",  label: "CB",  posTag: "DEF", x: 63, y: 68 },
    { key: "CB-L",  label: "CB",  posTag: "DEF", x: 37, y: 68 },
    { key: "LB",    label: "LB",  posTag: "DEF", x: 18, y: 68 },
    { key: "CM-R",  label: "CM",  posTag: "MID", x: 70, y: 48 },
    { key: "CM-C",  label: "CM",  posTag: "MID", x: 50, y: 48 },
    { key: "CM-L",  label: "CM",  posTag: "MID", x: 30, y: 48 },
    { key: "RW",    label: "RW",  posTag: "FWD", x: 78, y: 22 },
    { key: "ST",    label: "ST",  posTag: "FWD", x: 50, y: 16 },
    { key: "LW",    label: "LW",  posTag: "FWD", x: 22, y: 22 },
  ],
  "4-4-2": [
    { key: "GK",    label: "GK",  posTag: "GK",  x: 50, y: 85 },
    { key: "RB",    label: "RB",  posTag: "DEF", x: 82, y: 68 },
    { key: "CB-R",  label: "CB",  posTag: "DEF", x: 63, y: 68 },
    { key: "CB-L",  label: "CB",  posTag: "DEF", x: 37, y: 68 },
    { key: "LB",    label: "LB",  posTag: "DEF", x: 18, y: 68 },
    { key: "RM",    label: "RM",  posTag: "MID", x: 82, y: 48 },
    { key: "CM-R",  label: "CM",  posTag: "MID", x: 61, y: 48 },
    { key: "CM-L",  label: "CM",  posTag: "MID", x: 39, y: 48 },
    { key: "LM",    label: "LM",  posTag: "MID", x: 18, y: 48 },
    { key: "RS",    label: "ST",  posTag: "FWD", x: 65, y: 20 },
    { key: "LS",    label: "ST",  posTag: "FWD", x: 35, y: 20 },
  ],
  "3-5-2": [
    { key: "GK",    label: "GK",  posTag: "GK",  x: 50, y: 85 },
    { key: "CB-R",  label: "CB",  posTag: "DEF", x: 72, y: 68 },
    { key: "CB-C",  label: "CB",  posTag: "DEF", x: 50, y: 68 },
    { key: "CB-L",  label: "CB",  posTag: "DEF", x: 28, y: 68 },
    { key: "RM",    label: "RM",  posTag: "MID", x: 90, y: 50 },
    { key: "CM-R",  label: "CM",  posTag: "MID", x: 70, y: 50 },
    { key: "CM-C",  label: "CM",  posTag: "MID", x: 50, y: 50 },
    { key: "CM-L",  label: "CM",  posTag: "MID", x: 30, y: 50 },
    { key: "LM",    label: "LM",  posTag: "MID", x: 10, y: 50 },
    { key: "RS",    label: "ST",  posTag: "FWD", x: 65, y: 20 },
    { key: "LS",    label: "ST",  posTag: "FWD", x: 35, y: 20 },
  ],
};

export const FORMATION_KEYS: FormationKey[] = ["4-3-3", "4-4-2", "3-5-2"];

// ─── Simulation state ─────────────────────────────────────────────────────────
/** Virtual roster state: teamId → Player[] */
export type RosterMap = Record<string, Player[]>;

export interface SimState {
  /** Current virtual roster */
  rosters: RosterMap;
  /** Players with no team */
  unassigned: Player[];
}

export interface LineupBuilderState {
  /** Selected team ID for makeup */
  selectedTeamId: string | null;
  formation: FormationKey;
  /** slotKey → Player | null */
  slots: Record<string, Player | null>;
  /** Players in roster not placed in formation */
  bench: Player[];
}

// ─── Warning helpers ──────────────────────────────────────────────────────────
export interface Warning {
  playerId: string;
  playerName: string;
  message: string;
  type: "age" | "position";
}

export function computeRosterWarnings(
  teams: TeamWithPlayers[],
  rosters: RosterMap
): Warning[] {
  const warnings: Warning[] = [];
  for (const team of teams) {
    const players = rosters[team.id] ?? [];
    for (const player of players) {
      // Age eligibility
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
  slots: Record<string, Player | null>,
  formation: FormationKey
): Warning[] {
  const warnings: Warning[] = [];
  const slotDefs = FORMATIONS[formation];

  // Age eligibility for bench players too
  const allPlayers = [...Object.values(slots).filter(Boolean) as Player[]];

  for (const player of allPlayers) {
    if (team.birth_year && player.birth_year && player.birth_year !== team.birth_year) {
      warnings.push({
        playerId: player.id,
        playerName: `${player.first_name} ${player.last_name}`,
        message: `Age mismatch: player birth year ${player.birth_year} vs team ${team.birth_year}`,
        type: "age",
      });
    }
  }

  // Position mismatch for placed players
  for (const slotDef of slotDefs) {
    const player = slots[slotDef.key];
    if (!player || !player.positions || player.positions.length === 0) continue;
    const posTagLower = slotDef.posTag.toLowerCase();
    const hasMatch = player.positions.some((p) => {
      const pl = p.toLowerCase();
      // Check if any preferred position matches the slot's position category
      if (posTagLower === "gk") return pl === "gk";
      if (posTagLower === "def") return ["cb", "rb", "lb", "wb", "def"].includes(pl);
      if (posTagLower === "mid") return ["cm", "dm", "am", "rm", "lm", "mid"].includes(pl);
      if (posTagLower === "fwd") return ["st", "rw", "lw", "cf", "ss", "fwd", "att"].includes(pl);
      return false;
    });
    if (!hasMatch) {
      warnings.push({
        playerId: player.id,
        playerName: `${player.first_name} ${player.last_name}`,
        message: `Position mismatch: ${player.positions.join("/")} placed at ${slotDef.label} (${slotDef.posTag})`,
        type: "position",
      });
    }
  }

  return warnings;
}
