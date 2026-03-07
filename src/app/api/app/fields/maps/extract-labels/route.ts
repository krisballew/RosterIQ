import { NextRequest, NextResponse } from "next/server";
import { recognize } from "tesseract.js";
import { requireFieldAdminContext } from "../../_auth";

export const runtime = "nodejs";

type OcrLine = { text: string };
type OcrResult = { data?: { lines?: OcrLine[]; text?: string } };

function normalizeLabel(raw: string): string {
  const cleaned = raw
    .replace(/[|]/g, "I")
    .replace(/[()\[\]{}]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned
    .split(" ")
    .map((w) => (w.length <= 2 ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1).toLowerCase()))
    .join(" ");
}

function extractCandidateLabels(lines: string[]): string[] {
  const candidates = new Set<string>();

  const patterns = [
    /\bfield\s*[a-z0-9-]+\b/gi,
    /\bf\s*[0-9]{1,2}\b/gi,
    /\bpitch\s*[a-z0-9-]+\b/gi,
    /\bcourt\s*[a-z0-9-]+\b/gi,
    /\b[a-z]-?[0-9]{1,2}\b/gi,
  ];

  for (const line of lines) {
    const lineTrimmed = line.trim();
    if (!lineTrimmed) continue;

    for (const pattern of patterns) {
      const matches = lineTrimmed.match(pattern) ?? [];
      for (const m of matches) {
        const label = normalizeLabel(m);
        if (label.length >= 2 && label.length <= 32) {
          candidates.add(label);
        }
      }
    }

    const normalized = normalizeLabel(lineTrimmed);
    if (
      normalized.length >= 2 &&
      normalized.length <= 24 &&
      /[0-9]/.test(normalized) &&
      /[a-z]/i.test(normalized) &&
      !/(parking|entrance|exit|restroom|bathroom|office|clubhouse|concession)/i.test(normalized)
    ) {
      candidates.add(normalized);
    }
  }

  return Array.from(candidates).sort((a, b) => a.localeCompare(b));
}

export async function POST(request: NextRequest) {
  const auth = await requireFieldAdminContext();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { supabase, tenantId, membershipId } = auth;
  const body = await request.json().catch(() => ({}));

  const mapId = String(body.mapId ?? "").trim();
  const imageUrl = String(body.imageUrl ?? "").trim();
  const overwrite = Boolean(body.overwrite ?? false);

  if (!mapId || !imageUrl) {
    return NextResponse.json({ error: "mapId and imageUrl are required" }, { status: 400 });
  }

  const mapRes = await supabase
    .from("field_maps")
    .select("id, tenant_id")
    .eq("id", mapId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (!mapRes.data) {
    return NextResponse.json({ error: "Field map not found" }, { status: 404 });
  }

  let lines: string[] = [];

  try {
    const result = (await recognize(imageUrl, "eng")) as OcrResult;
    const fromLines = (result.data?.lines ?? []).map((l) => l.text).filter(Boolean);
    const fromRaw = (result.data?.text ?? "")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    lines = fromLines.length > 0 ? fromLines : fromRaw;
  } catch (error) {
    const message = error instanceof Error ? error.message : "OCR failed";
    return NextResponse.json({ error: `Unable to process image text: ${message}` }, { status: 422 });
  }

  const labels = extractCandidateLabels(lines);

  if (labels.length === 0) {
    return NextResponse.json({ created: 0, skipped: 0, labels: [], message: "No field labels detected." });
  }

  const existingRes = await supabase
    .from("fields")
    .select("label")
    .eq("tenant_id", tenantId);

  const existingSet = new Set((existingRes.data ?? []).map((r) => r.label.toLowerCase()));

  const toInsert = labels
    .filter((label) => overwrite || !existingSet.has(label.toLowerCase()))
    .map((label) => ({
      tenant_id: tenantId,
      field_map_id: mapId,
      label,
      created_by: membershipId,
      description: "Auto-extracted from uploaded field map",
      is_active: true,
    }));

  if (toInsert.length > 0) {
    const insertRes = await supabase.from("fields").insert(toInsert);
    if (insertRes.error) {
      return NextResponse.json({ error: insertRes.error.message }, { status: 500 });
    }
  }

  return NextResponse.json({
    created: toInsert.length,
    skipped: labels.length - toInsert.length,
    labels,
  });
}
