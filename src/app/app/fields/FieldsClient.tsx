"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { MapPin, Upload, Clock3, Send, Trash2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

type FieldMap = { id: string; name: string; image_url: string; created_at: string };
type FieldLabel = { id: string; label: string; description: string | null; field_map_id: string | null; is_active: boolean };
type FieldAvailability = { id: string; field_id: string; day_of_week: number; open_time: string; close_time: string };
type Team = { id: string; name: string; coach_membership_id: string | null };
type Assignment = {
  id: string;
  team_id: string;
  field_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  notes: string | null;
  status: "draft" | "published";
};

type OpenField = { field_id: string; label: string; open_time: string; close_time: string };

export function FieldsClient() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fieldMapMessage, setFieldMapMessage] = useState<string | null>(null);
  const [fieldMapMessageType, setFieldMapMessageType] = useState<"success" | "info" | "error">("info");

  const [fieldMaps, setFieldMaps] = useState<FieldMap[]>([]);
  const [fields, setFields] = useState<FieldLabel[]>([]);
  const [availability, setAvailability] = useState<FieldAvailability[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [openFields, setOpenFields] = useState<OpenField[]>([]);

  const [mapName, setMapName] = useState("");
  const [mapFile, setMapFile] = useState<File | null>(null);
  const [mapFileInputKey, setMapFileInputKey] = useState(0);
  const [creatingMap, setCreatingMap] = useState(false);
  const [autoExtractLabels, setAutoExtractLabels] = useState(true);
  const [extractingMapId, setExtractingMapId] = useState<string | null>(null);

  const [fieldLabel, setFieldLabel] = useState("");
  const [fieldDescription, setFieldDescription] = useState("");
  const [fieldMapId, setFieldMapId] = useState<string>("none");

  const [availabilityFieldId, setAvailabilityFieldId] = useState<string>("none");
  const [availabilityDay, setAvailabilityDay] = useState("1");
  const [openTime, setOpenTime] = useState("16:00");
  const [closeTime, setCloseTime] = useState("19:00");

  const [assignmentTeamId, setAssignmentTeamId] = useState<string>("none");
  const [assignmentFieldId, setAssignmentFieldId] = useState<string>("none");
  const [assignmentDay, setAssignmentDay] = useState("1");
  const [assignmentStart, setAssignmentStart] = useState("16:00");
  const [assignmentEnd, setAssignmentEnd] = useState("17:30");
  const [assignmentNotes, setAssignmentNotes] = useState("");

  const [openAtLocal, setOpenAtLocal] = useState("");

  const fieldNameById = useMemo(() => new Map(fields.map((f) => [f.id, f.label])), [fields]);
  const teamNameById = useMemo(() => new Map(teams.map((t) => [t.id, t.name])), [teams]);

  const loadDashboard = useCallback(async (atIso?: string) => {
    setError(null);
    const url = atIso ? `/api/app/fields/dashboard?at=${encodeURIComponent(atIso)}` : "/api/app/fields/dashboard";
    const res = await fetch(url, { cache: "no-store" });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Failed to load field dashboard");

    setFieldMaps(json.fieldMaps ?? []);
    setFields(json.fields ?? []);
    setAvailability(json.availability ?? []);
    setAssignments(json.assignments ?? []);
    setTeams(json.teams ?? []);
    setOpenFields(json.openFields ?? []);
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await loadDashboard();
      } catch (e) {
        if (mounted) setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [loadDashboard]);

  async function handleCreateMap() {
    if (!mapName.trim() || !mapFile) return;
    setCreatingMap(true);
    setError(null);
    setFieldMapMessage(null);
    try {
      const fd = new FormData();
      fd.append("file", mapFile);
      const uploadRes = await fetch("/api/app/fields/maps/upload", { method: "POST", body: fd });
      const uploadJson = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadJson.error ?? "Failed to upload field map");

      const createRes = await fetch("/api/app/fields/maps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: mapName.trim(), imageUrl: uploadJson.imageUrl }),
      });
      const createJson = await createRes.json();
      if (!createRes.ok) throw new Error(createJson.error ?? "Failed to create field map");

      let extractSummary = "";
      if (autoExtractLabels) {
        const extractRes = await fetch("/api/app/fields/maps/extract-labels", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mapId: createJson.fieldMap.id,
            imageUrl: createJson.fieldMap.image_url,
          }),
        });
        const extractJson = await extractRes.json();
        if (!extractRes.ok) {
          throw new Error(extractJson.error ?? "Failed to extract field labels from map");
        }
        extractSummary = ` Auto-extracted ${extractJson.created ?? 0} labels (${extractJson.skipped ?? 0} skipped).`;
      }

      setMapName("");
      setMapFile(null);
      setMapFileInputKey((prev) => prev + 1);
      await loadDashboard();
      setFieldMapMessageType("success");
      setFieldMapMessage(`Map upload completed successfully.${extractSummary}`);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to create map";
      setError(message);
      setFieldMapMessageType("error");
      setFieldMapMessage(`Upload failed: ${message}`);
    } finally {
      setCreatingMap(false);
    }
  }

  async function handleExtractLabelsForMap(mapId: string, imageUrl: string) {
    setError(null);
    setFieldMapMessage(null);
    setExtractingMapId(mapId);
    try {
      const res = await fetch("/api/app/fields/maps/extract-labels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mapId, imageUrl }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to extract labels");
      await loadDashboard();
      setFieldMapMessageType("success");
      setFieldMapMessage(`Extraction finished: ${json.created ?? 0} labels created, ${json.skipped ?? 0} skipped.`);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to extract labels";
      setError(message);
      setFieldMapMessageType("error");
      setFieldMapMessage(`Extraction failed: ${message}`);
    } finally {
      setExtractingMapId(null);
    }
  }

  async function handleCreateField() {
    if (!fieldLabel.trim()) return;
    setError(null);
    const res = await fetch("/api/app/fields/labels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: fieldLabel.trim(),
        description: fieldDescription.trim() || null,
        fieldMapId: fieldMapId === "none" ? null : fieldMapId,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Failed to create field label");
      return;
    }
    setFieldLabel("");
    setFieldDescription("");
    await loadDashboard();
  }

  async function handleCreateAvailability() {
    if (availabilityFieldId === "none") return;
    setError(null);
    const res = await fetch("/api/app/fields/availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fieldId: availabilityFieldId,
        dayOfWeek: Number(availabilityDay),
        openTime,
        closeTime,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Failed to create availability");
      return;
    }
    await loadDashboard();
  }

  async function handleDeleteAvailability(id: string) {
    setError(null);
    const res = await fetch(`/api/app/fields/availability?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Failed to delete availability");
      return;
    }
    await loadDashboard();
  }

  async function handleCreateAssignment() {
    if (assignmentTeamId === "none" || assignmentFieldId === "none") return;
    setError(null);
    const res = await fetch("/api/app/fields/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        teamId: assignmentTeamId,
        fieldId: assignmentFieldId,
        dayOfWeek: Number(assignmentDay),
        startTime: assignmentStart,
        endTime: assignmentEnd,
        notes: assignmentNotes,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Failed to create assignment");
      return;
    }
    setAssignmentNotes("");
    await loadDashboard();
  }

  async function handleDeleteAssignment(id: string) {
    setError(null);
    const res = await fetch(`/api/app/fields/assignments?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Failed to delete assignment");
      return;
    }
    await loadDashboard();
  }

  async function handlePublishAssignments() {
    setError(null);
    const res = await fetch("/api/app/fields/assignments/publish", { method: "POST" });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Failed to publish assignments");
      return;
    }
    await loadDashboard();
    alert(`Published ${json.published} assignments to ${json.coachesNotified} coaches.`);
  }

  async function handleOpenFieldLookup() {
    if (!openAtLocal) return;
    const iso = new Date(openAtLocal).toISOString();
    await loadDashboard(iso);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-500">
        <RefreshCw className="h-5 w-5 animate-spin mr-2" /> Loading field assignments...
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Field Assignments</h1>
          <p className="text-sm text-gray-500 mt-1">
            Upload maps, define field labels and open windows, assign teams by day/time, and publish to coaches.
          </p>
        </div>
        <Button onClick={handlePublishAssignments} className="w-full md:w-auto">
          <Send className="h-4 w-4 mr-2" /> Publish Draft Assignments
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="rounded-xl border border-gray-200 bg-white p-4 md:p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Upload className="h-4 w-4" /> Field Maps
        </h2>
        {fieldMapMessage && (
          <div
            className={
              fieldMapMessageType === "success"
                ? "rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
                : fieldMapMessageType === "error"
                  ? "rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                  : "rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700"
            }
          >
            {fieldMapMessage}
          </div>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 items-end">
          <div className="space-y-1">
            <Label>Map Name</Label>
            <Input value={mapName} onChange={(e) => setMapName(e.target.value)} placeholder="North Complex Map" />
          </div>
          <div className="space-y-1">
            <Label>Map Image</Label>
            <Input key={mapFileInputKey} type="file" accept="image/*" onChange={(e) => setMapFile(e.target.files?.[0] ?? null)} />
          </div>
          <Button onClick={handleCreateMap} disabled={creatingMap || !mapFile || !mapName.trim()}>
            {creatingMap ? "Uploading..." : "Upload Field Map"}
          </Button>
        </div>
        <label className="inline-flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={autoExtractLabels}
            onChange={(e) => setAutoExtractLabels(e.target.checked)}
          />
          Auto-extract field labels from this image after upload
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {fieldMaps.map((m) => (
            <div key={m.id} className="rounded-lg border border-gray-200 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={m.image_url} alt={m.name} className="h-32 w-full object-cover" />
              <div className="p-3">
                <p className="font-medium text-gray-900 text-sm">{m.name}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => handleExtractLabelsForMap(m.id, m.image_url)}
                  disabled={extractingMapId === m.id}
                >
                  {extractingMapId === m.id ? "Extracting..." : "Extract Labels"}
                </Button>
              </div>
            </div>
          ))}
          {fieldMaps.length === 0 && <p className="text-sm text-gray-500">No field maps uploaded yet.</p>}
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-4 md:p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <MapPin className="h-4 w-4" /> Field Labels
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
          <div className="space-y-1">
            <Label>Field Label</Label>
            <Input value={fieldLabel} onChange={(e) => setFieldLabel(e.target.value)} placeholder="Field A" />
          </div>
          <div className="space-y-1">
            <Label>Description</Label>
            <Input value={fieldDescription} onChange={(e) => setFieldDescription(e.target.value)} placeholder="Turf, lights" />
          </div>
          <div className="space-y-1">
            <Label>Map</Label>
            <Select value={fieldMapId} onValueChange={setFieldMapId}>
              <SelectTrigger><SelectValue placeholder="Optional map" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No map</SelectItem>
                {fieldMaps.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleCreateField} disabled={!fieldLabel.trim()}>Create Field Label</Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {fields.map((f) => (
            <Badge key={f.id} variant="outline" className="text-sm">
              {f.label}
            </Badge>
          ))}
          {fields.length === 0 && <p className="text-sm text-gray-500">No field labels yet.</p>}
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-4 md:p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Clock3 className="h-4 w-4" /> Field Open / Close Times
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
          <div className="space-y-1 md:col-span-2">
            <Label>Field</Label>
            <Select value={availabilityFieldId} onValueChange={setAvailabilityFieldId}>
              <SelectTrigger><SelectValue placeholder="Select field" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Select field</SelectItem>
                {fields.map((f) => <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Day</Label>
            <Select value={availabilityDay} onValueChange={setAvailabilityDay}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DAYS.map((d, i) => <SelectItem key={d} value={String(i)}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Open</Label>
            <Input type="time" value={openTime} onChange={(e) => setOpenTime(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Close</Label>
            <Input type="time" value={closeTime} onChange={(e) => setCloseTime(e.target.value)} />
          </div>
        </div>
        <Button onClick={handleCreateAvailability} disabled={availabilityFieldId === "none"}>Add Open Window</Button>

        <div className="space-y-2">
          {availability.map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-sm">
              <span>
                <strong>{fieldNameById.get(a.field_id) ?? "Unknown Field"}</strong> · {DAYS[a.day_of_week]} · {a.open_time.slice(0, 5)} - {a.close_time.slice(0, 5)}
              </span>
              <Button variant="ghost" size="sm" onClick={() => handleDeleteAvailability(a.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {availability.length === 0 && <p className="text-sm text-gray-500">No open windows defined yet.</p>}
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-4 md:p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Team Field Assignments</h2>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
          <div className="space-y-1 md:col-span-2">
            <Label>Team</Label>
            <Select value={assignmentTeamId} onValueChange={setAssignmentTeamId}>
              <SelectTrigger><SelectValue placeholder="Select team" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Select team</SelectItem>
                {teams.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label>Field</Label>
            <Select value={assignmentFieldId} onValueChange={setAssignmentFieldId}>
              <SelectTrigger><SelectValue placeholder="Select field" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Select field</SelectItem>
                {fields.map((f) => <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Day</Label>
            <Select value={assignmentDay} onValueChange={setAssignmentDay}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DAYS.map((d, i) => <SelectItem key={d} value={String(i)}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Start</Label>
            <Input type="time" value={assignmentStart} onChange={(e) => setAssignmentStart(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>End</Label>
            <Input type="time" value={assignmentEnd} onChange={(e) => setAssignmentEnd(e.target.value)} />
          </div>
          <div className="space-y-1 md:col-span-3">
            <Label>Notes</Label>
            <Input value={assignmentNotes} onChange={(e) => setAssignmentNotes(e.target.value)} placeholder="Optional details" />
          </div>
          <div className="md:col-span-3">
            <Button onClick={handleCreateAssignment} disabled={assignmentTeamId === "none" || assignmentFieldId === "none"}>
              Create Assignment (Draft)
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          {assignments.map((a) => (
            <div key={a.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm">
              <span>
                <strong>{teamNameById.get(a.team_id) ?? "Unknown Team"}</strong> → <strong>{fieldNameById.get(a.field_id) ?? "Unknown Field"}</strong>
                {` · ${DAYS[a.day_of_week]} ${a.start_time.slice(0, 5)}-${a.end_time.slice(0, 5)}`}
                {a.notes ? ` · ${a.notes}` : ""}
              </span>
              <div className="flex items-center gap-2">
                <Badge variant={a.status === "published" ? "default" : "outline"}>{a.status}</Badge>
                <Button variant="ghost" size="sm" onClick={() => handleDeleteAssignment(a.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          {assignments.length === 0 && <p className="text-sm text-gray-500">No assignments yet.</p>}
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-4 md:p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Open Fields By Date / Time</h2>
        <div className="flex flex-col md:flex-row gap-3 md:items-end">
          <div className="space-y-1">
            <Label>Date / Time</Label>
            <Input type="datetime-local" value={openAtLocal} onChange={(e) => setOpenAtLocal(e.target.value)} />
          </div>
          <Button onClick={handleOpenFieldLookup} disabled={!openAtLocal}>Check Open Fields</Button>
        </div>
        <div className="space-y-2">
          {openFields.map((f) => (
            <div key={`${f.field_id}-${f.open_time}-${f.close_time}`} className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-900">
              <strong>{f.label}</strong> is open from {f.open_time.slice(0, 5)} to {f.close_time.slice(0, 5)}
            </div>
          ))}
          {openAtLocal && openFields.length === 0 && (
            <p className="text-sm text-gray-500">No open fields at the selected date/time.</p>
          )}
        </div>
      </section>
    </div>
  );
}
