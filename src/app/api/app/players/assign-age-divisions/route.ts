import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// ─── Age division helpers ────────────────────────────────────────────────────

const AGE_GROUPS = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];

/**
 * The soccer calendar year ends July 31. The season "end year" is the calendar
 * year containing July 31 of the current season.
 *   - Before Aug 1 →  end year = current year
 *   - On/After Aug 1 → end year = current year + 1
 */
function getSeasonEndYear(): number {
  const now = new Date();
  const aug1 = new Date(now.getFullYear(), 7, 1); // month index 7 = August
  return now >= aug1 ? now.getFullYear() + 1 : now.getFullYear();
}

/**
 * Given a DOB string (YYYY-MM-DD) and the current season end year, return the
 * matching age division label (e.g. "U12") or null if outside U6–U19 range.
 */
function assignDivision(dob: string, seasonEndYear: number): string | null {
  const d = new Date(dob + "T00:00:00"); // parse as local date
  for (const age of AGE_GROUPS) {
    const fromYear = seasonEndYear - age;
    const toYear = seasonEndYear - age + 1;
    const from = new Date(fromYear, 7, 1); // Aug 1, fromYear
    const to = new Date(toYear, 6, 31, 23, 59, 59); // Jul 31, toYear
    if (d >= from && d <= to) return `U${age}`;
  }
  return null;
}

// POST /api/app/players/assign-age-divisions
// Computes each player's age division from their date_of_birth and batch-updates
// the age_division column. Only touches players that have a DOB set.
// Optionally restrict to a specific team or status via query params.
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: membership } = await supabase
    .from("memberships")
    .select("tenant_id, role")
    .eq("user_id", user.id)
    .in("role", ["platform_admin", "club_admin", "club_director", "director_of_coaching"])
    .not("tenant_id", "is", null)
    .limit(1)
    .single();

  if (!membership?.tenant_id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  // Optional overrides: caller can supply a custom seasonEndYear if needed
  const seasonEndYear: number =
    typeof body.seasonEndYear === "number" && body.seasonEndYear > 2000
      ? body.seasonEndYear
      : getSeasonEndYear();

  // Fetch all players with a DOB for this tenant
  const { data: players, error: fetchErr } = await supabase
    .from("players")
    .select("id, date_of_birth")
    .eq("tenant_id", membership.tenant_id)
    .not("date_of_birth", "is", null);

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }

  if (!players || players.length === 0) {
    return NextResponse.json({ updated: 0, unmatched: 0 });
  }

  type UpdateRow = { id: string; age_division: string | null };
  const updates: UpdateRow[] = [];
  let unmatched = 0;

  for (const p of players) {
    const division = assignDivision(p.date_of_birth as string, seasonEndYear);
    if (division) {
      updates.push({ id: p.id, age_division: division });
    } else {
      unmatched++;
    }
  }

  if (updates.length === 0) {
    return NextResponse.json({ updated: 0, unmatched });
  }

  // Batch update using individual upserts (Supabase doesn't support bulk update
  // with different values per row without a raw query, so we use a transaction
  // workaround — upsert with all columns present).
  // To keep it simple and avoid hitting RLS issues we update in a loop.
  // For large rosters we batch; typical club rosters are <500 players.
  const BATCH = 100;
  let updated = 0;
  for (let i = 0; i < updates.length; i += BATCH) {
    const slice = updates.slice(i, i + BATCH);
    for (const { id, age_division } of slice) {
      const { error } = await supabase
        .from("players")
        .update({ age_division })
        .eq("id", id)
        .eq("tenant_id", membership.tenant_id);
      if (!error) updated++;
    }
  }

  return NextResponse.json({ updated, unmatched, seasonEndYear });
}
