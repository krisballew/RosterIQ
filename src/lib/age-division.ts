const AGE_GROUPS = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19] as const;

/**
 * Season "end year": before Aug 1 -> current year; on/after Aug 1 -> current year + 1.
 */
export function getSeasonEndYear(now = new Date()): number {
  const aug1 = new Date(now.getFullYear(), 7, 1);
  return now >= aug1 ? now.getFullYear() + 1 : now.getFullYear();
}

export interface AgeDivisionRange {
  division: string;
  fromDate: Date;
  toDate: Date;
}

export function computeAgeDivisions(seasonEndYear: number): AgeDivisionRange[] {
  return AGE_GROUPS.map((age) => {
    const fromYear = seasonEndYear - age;
    const toYear = seasonEndYear - age + 1;
    return {
      division: `U${age}`,
      fromDate: new Date(fromYear, 7, 1),
      toDate: new Date(toYear, 6, 31, 23, 59, 59),
    };
  });
}

export function computeDivisionForDob(dob: string, seasonEndYear = getSeasonEndYear()): string | null {
  const d = new Date(`${dob}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;

  for (const range of computeAgeDivisions(seasonEndYear)) {
    if (d >= range.fromDate && d <= range.toDate) return range.division;
  }
  return null;
}

export function parseDivisionNumber(division: string | null | undefined): number | null {
  if (!division) return null;
  const match = division.match(/u(\d+)/i);
  if (!match) return null;
  const value = Number.parseInt(match[1], 10);
  return Number.isNaN(value) ? null : value;
}