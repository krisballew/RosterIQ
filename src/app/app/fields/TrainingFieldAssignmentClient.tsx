"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Rnd } from "react-rnd";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Upload, Plus, Save, Trash2, CalendarClock, MapPinned } from "lucide-react";

type Complex = {
  id: string;
  name: string;
  facility: string | null;
};

type FieldMap = {
  id: string;
  complex_id: string;
  name: string;
  background_image_url: string;
  canvas_width: number;
  canvas_height: number;
};

type FieldSpace = {
  id: string;
  map_id: string;
  name: string;
  field_type: string | null;
  age_suitability: string | null;
  format: string | null;
  availability_status: "available" | "maintenance" | "closed";
  notes: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  fill_color: string;
  border_color: string;
  border_style: "solid" | "dashed" | "dotted";
};

type Assignment = {
  id: string;
  map_id: string;
  field_space_id: string;
  team_id: string | null;
  title: string;
  start_at: string;
  end_at: string;
  status: "scheduled" | "cancelled" | "completed";
};

type Team = { id: string; name: string };

type Mode = "setup" | "assignments";

type Toast = { id: number; kind: "success" | "error" | "info"; message: string };

function toLocalInputValue(iso: string) {
  const dt = new Date(iso);
  const local = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function fromLocalInputValue(v: string) {
  return new Date(v).toISOString();
}

export function TrainingFieldAssignmentClient() {
  const [mode, setMode] = useState<Mode>("setup");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const [complexes, setComplexes] = useState<Complex[]>([]);
  const [maps, setMaps] = useState<FieldMap[]>([]);
  const [spaces, setSpaces] = useState<FieldSpace[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);

  const [selectedMapId, setSelectedMapId] = useState<string>("");
  const [selectedSpaceId, setSelectedSpaceId] = useState<string>("");
  const [zoom, setZoom] = useState(1);
  const [rotatingSpaceId, setRotatingSpaceId] = useState<string | null>(null);

  const [complexName, setComplexName] = useState("");
  const [complexFacility, setComplexFacility] = useState("");

  const [mapName, setMapName] = useState("");
  const [mapComplexId, setMapComplexId] = useState("");
  const [mapFile, setMapFile] = useState<File | null>(null);

  const [assignmentSpaceId, setAssignmentSpaceId] = useState("");
  const [assignmentTeamId, setAssignmentTeamId] = useState("");
  const [assignmentTitle, setAssignmentTitle] = useState("");
  const [assignmentStart, setAssignmentStart] = useState("");
  const [assignmentEnd, setAssignmentEnd] = useState("");

  const spacesRef = useRef<FieldSpace[]>([]);

  useEffect(() => {
    spacesRef.current = spaces;
  }, [spaces]);

  function handleRotateStart(e: React.PointerEvent, spaceId: string) {
    e.preventDefault();
    e.stopPropagation();

    const mapContainer = document.getElementById("field-map-container");
    if (!mapContainer) return;

    setRotatingSpaceId(spaceId);

    let latestRotation = spacesRef.current.find((s) => s.id === spaceId)?.rotation ?? 0;

    const handleRotate = (ev: PointerEvent) => {
      const space = spacesRef.current.find((s) => s.id === spaceId);
      if (!space) return;

      const containerRect = mapContainer.getBoundingClientRect();
      const centerX = containerRect.left + (space.x + space.width / 2) * zoom;
      const centerY = containerRect.top + (space.y + space.height / 2) * zoom;
      const angle = Math.atan2(ev.clientY - centerY, ev.clientX - centerX) * (180 / Math.PI) + 90;
      const normalizedAngle = ((angle % 360) + 360) % 360;

      latestRotation = normalizedAngle;
      setSpaces((prev) => prev.map((s) => (s.id === spaceId ? { ...s, rotation: normalizedAngle } : s)));
    };

    const handleRotateEnd = () => {
      void patchSpace(spaceId, { rotation: latestRotation });
      setRotatingSpaceId(null);
      window.removeEventListener("pointermove", handleRotate);
      window.removeEventListener("pointerup", handleRotateEnd);
    };

    window.addEventListener("pointermove", handleRotate);
    window.addEventListener("pointerup", handleRotateEnd);
  }

  const selectedMap = maps.find((m) => m.id === selectedMapId) ?? null;
  const selectedSpace = spaces.find((s) => s.id === selectedSpaceId) ?? null;

  const filteredSpaces = useMemo(
    () => spaces.filter((s) => (selectedMapId ? s.map_id === selectedMapId : true)),
    [spaces, selectedMapId]
  );

  const mapAssignments = useMemo(
    () => assignments.filter((a) => (selectedMapId ? a.map_id === selectedMapId : true)),
    [assignments, selectedMapId]
  );

  function pushToast(kind: Toast["kind"], message: string) {
    const id = Date.now() + Math.floor(Math.random() * 999);
    setToasts((prev) => [...prev, { id, kind, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4500);
  }

  async function loadData(mapId?: string) {
    const query = mapId ? `?mapId=${encodeURIComponent(mapId)}` : "";
    const res = await fetch(`/api/app/training-fields/setup${query}`, { cache: "no-store" });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Failed to load training field data");

    setComplexes(json.complexes ?? []);
    setMaps(json.maps ?? []);
    setSpaces((json.spaces ?? []).map((s: FieldSpace) => ({ ...s, x: Number(s.x), y: Number(s.y), width: Number(s.width), height: Number(s.height), rotation: Number(s.rotation) })));
    setAssignments(json.assignments ?? []);
    setTeams(json.teams ?? []);
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await loadData();
      } catch (e) {
        if (mounted) pushToast("error", e instanceof Error ? e.message : "Load failed");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  async function handleCreateComplex() {
    if (!complexName.trim()) return;
    const res = await fetch("/api/app/training-fields/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity: "complex", name: complexName.trim(), facility: complexFacility.trim() || null }),
    });
    const json = await res.json();
    if (!res.ok) return pushToast("error", json.error ?? "Failed to create complex");
    setComplexName("");
    setComplexFacility("");
    await loadData(selectedMapId || undefined);
    setMapComplexId(json.complex?.id ?? mapComplexId);
    pushToast("success", "Complex created.");
  }

  async function handleCreateMap() {
    if (!mapName.trim() || !mapFile || !mapComplexId) return;
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("file", mapFile);
      const uploadRes = await fetch("/api/app/training-fields/upload-map", { method: "POST", body: fd });
      const uploadJson = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadJson.error ?? "Map upload failed");

      const mapRes = await fetch("/api/app/training-fields/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entity: "map",
          complexId: mapComplexId,
          name: mapName.trim(),
          backgroundImageUrl: uploadJson.imageUrl,
          canvasWidth: 1200,
          canvasHeight: 800,
        }),
      });
      const mapJson = await mapRes.json();
      if (!mapRes.ok) throw new Error(mapJson.error ?? "Failed to create map");

      setMapName("");
      setMapFile(null);
      setSelectedMapId(mapJson.map.id);
      await loadData(mapJson.map.id);
      pushToast("success", "Field map created.");
    } catch (e) {
      pushToast("error", e instanceof Error ? e.message : "Failed to create map");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddSpace() {
    if (!selectedMapId) return;
    const count = filteredSpaces.length + 1;
    const res = await fetch("/api/app/training-fields/spaces", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mapId: selectedMapId,
        name: `Field ${count}`,
        fieldType: "soccer",
        format: "7v7",
      }),
    });
    const json = await res.json();
    if (!res.ok) return pushToast("error", json.error ?? "Failed to add field space");

    await loadData(selectedMapId);
    setSelectedSpaceId(json.space.id);
    pushToast("success", "Field space added.");
  }

  async function patchSpace(spaceId: string, updates: Record<string, unknown>, reload = false) {
    const res = await fetch("/api/app/training-fields/spaces", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: spaceId, ...updates }),
    });
    const json = await res.json();
    if (!res.ok) {
      pushToast("error", json.error ?? "Failed to update space");
      return;
    }

    setSpaces((prev) => prev.map((s) => (s.id === spaceId ? { ...s, ...json.space, x: Number(json.space.x), y: Number(json.space.y), width: Number(json.space.width), height: Number(json.space.height), rotation: Number(json.space.rotation) } : s)));

    if (reload && selectedMapId) await loadData(selectedMapId);
  }

  async function handleDeleteSpace(spaceId: string) {
    const res = await fetch(`/api/app/training-fields/spaces?id=${encodeURIComponent(spaceId)}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok) return pushToast("error", json.error ?? "Failed to delete space");
    setSelectedSpaceId("");
    await loadData(selectedMapId || undefined);
    pushToast("success", "Field space deleted.");
  }

  async function handleCreateAssignment() {
    if (!selectedMapId || !assignmentSpaceId || !assignmentTitle.trim() || !assignmentStart || !assignmentEnd) return;

    const res = await fetch("/api/app/training-fields/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mapId: selectedMapId,
        fieldSpaceId: assignmentSpaceId,
        teamId: assignmentTeamId || null,
        title: assignmentTitle.trim(),
        startAt: fromLocalInputValue(assignmentStart),
        endAt: fromLocalInputValue(assignmentEnd),
      }),
    });
    const json = await res.json();
    if (!res.ok) return pushToast("error", json.error ?? "Failed to create assignment");

    setAssignmentTitle("");
    await loadData(selectedMapId);
    pushToast("success", "Assignment created.");
  }

  async function handleDeleteAssignment(id: string) {
    const res = await fetch(`/api/app/training-fields/assignments?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok) return pushToast("error", json.error ?? "Failed to delete assignment");
    await loadData(selectedMapId || undefined);
    pushToast("success", "Assignment removed.");
  }

  const occupiedSpaceIds = useMemo(() => {
    if (!assignmentStart || !assignmentEnd) return new Set<string>();
    const start = fromLocalInputValue(assignmentStart);
    const end = fromLocalInputValue(assignmentEnd);
    return new Set(
      mapAssignments
        .filter((a) => new Date(start) < new Date(a.end_at) && new Date(end) > new Date(a.start_at) && a.status !== "cancelled")
        .map((a) => a.field_space_id)
    );
  }, [assignmentStart, assignmentEnd, mapAssignments]);

  return (
    <div className="max-w-350 mx-auto space-y-4">
      <div className="fixed right-4 top-4 z-50 space-y-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={
              t.kind === "success"
                ? "rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800 shadow"
                : t.kind === "error"
                  ? "rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 shadow"
                  : "rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800 shadow"
            }
          >
            {t.message}
          </div>
        ))}
      </div>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Training Field Assignments</h1>
          <p className="text-sm text-gray-500">Visual map setup and assignment scheduling for training space.</p>
        </div>
        <div className="inline-flex rounded-lg border border-gray-200 p-1 bg-white">
          <button
            className={`px-3 py-1.5 text-sm rounded-md ${mode === "setup" ? "bg-blue-600 text-white" : "text-gray-600"}`}
            onClick={() => setMode("setup")}
          >
            <MapPinned className="h-4 w-4 inline mr-1" /> Setup Mode
          </button>
          <button
            className={`px-3 py-1.5 text-sm rounded-md ${mode === "assignments" ? "bg-blue-600 text-white" : "text-gray-600"}`}
            onClick={() => setMode("assignments")}
          >
            <CalendarClock className="h-4 w-4 inline mr-1" /> Assignment Mode
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24 text-gray-500">
          <RefreshCw className="h-5 w-5 animate-spin mr-2" /> Loading training field module...
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
              <h2 className="text-sm font-semibold text-gray-900">1. Create Complex</h2>
              <div className="space-y-1">
                <Label>Name</Label>
                <Input value={complexName} onChange={(e) => setComplexName(e.target.value)} placeholder="North Training Complex" />
              </div>
              <div className="space-y-1">
                <Label>Facility</Label>
                <Input value={complexFacility} onChange={(e) => setComplexFacility(e.target.value)} placeholder="City Park" />
              </div>
              <Button onClick={handleCreateComplex} disabled={!complexName.trim()}>
                <Plus className="h-4 w-4 mr-2" /> Add Complex
              </Button>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3 lg:col-span-2">
              <h2 className="text-sm font-semibold text-gray-900">2. Create Field Map</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                <div className="space-y-1 md:col-span-2">
                  <Label>Map Name</Label>
                  <Input value={mapName} onChange={(e) => setMapName(e.target.value)} placeholder="Main Training Layout" />
                </div>
                <div className="space-y-1">
                  <Label>Complex</Label>
                  <Select value={mapComplexId || "none"} onValueChange={(v) => setMapComplexId(v === "none" ? "" : v)}>
                    <SelectTrigger><SelectValue placeholder="Select complex" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Select complex</SelectItem>
                      {complexes.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Background Image</Label>
                  <Input type="file" accept="image/*" onChange={(e) => setMapFile(e.target.files?.[0] ?? null)} />
                </div>
              </div>
              <Button onClick={handleCreateMap} disabled={saving || !mapName.trim() || !mapComplexId || !mapFile}>
                <Upload className="h-4 w-4 mr-2" /> {saving ? "Saving..." : "Upload & Create Map"}
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex flex-col md:flex-row md:items-center gap-3 md:justify-between mb-3">
              <div className="flex items-center gap-2">
                <Label>Active Map</Label>
                <Select value={selectedMapId || "none"} onValueChange={(v) => setSelectedMapId(v === "none" ? "" : v)}>
                  <SelectTrigger className="w-72"><SelectValue placeholder="Select map" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select map</SelectItem>
                    {maps.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Label>Zoom</Label>
                <Input type="range" min={0.5} max={2} step={0.05} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="w-40" />
                <span className="text-xs text-gray-500 w-10">{Math.round(zoom * 100)}%</span>
              </div>
            </div>

            {selectedMap ? (
              <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4">
                <div className="overflow-auto rounded-lg border border-gray-200 bg-gray-100 p-2">
                  <div
                    id="field-map-container"
                    className="relative origin-top-left"
                    style={{
                      width: selectedMap.canvas_width,
                      height: selectedMap.canvas_height,
                      transform: `scale(${zoom})`,
                      transformOrigin: "top left",
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={selectedMap.background_image_url}
                      alt={selectedMap.name}
                      className="absolute inset-0 h-full w-full object-cover pointer-events-none"
                      draggable={false}
                    />

                    {filteredSpaces.map((space) => (
                      <Rnd
                        key={space.id}
                        cancel=".rotate-handle"
                        bounds="parent"
                        position={{ x: Number(space.x), y: Number(space.y) }}
                        size={{ width: Number(space.width), height: Number(space.height) }}
                        disableDragging={rotatingSpaceId === space.id}
                        onDragStop={(_, d) => {
                          void patchSpace(space.id, { x: d.x, y: d.y });
                        }}
                        onResizeStop={(_, __, ref, ___, position) => {
                          void patchSpace(space.id, {
                            width: parseFloat(ref.style.width),
                            height: parseFloat(ref.style.height),
                            x: position.x,
                            y: position.y,
                          });
                        }}
                        onClick={() => {
                          if (rotatingSpaceId !== space.id) {
                            setSelectedSpaceId(space.id);
                          }
                        }}
                        style={{
                          transform: `rotate(${space.rotation}deg)`,
                          background: occupiedSpaceIds.has(space.id)
                            ? "rgba(239, 68, 68, 0.18)"
                            : space.fill_color,
                          border: `2px ${space.border_style} ${occupiedSpaceIds.has(space.id) ? "#dc2626" : space.border_color}`,
                          borderRadius: 6,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "move",
                          boxShadow: selectedSpaceId === space.id ? "0 0 0 2px rgba(37, 99, 235, 0.6)" : undefined,
                          zIndex: selectedSpaceId === space.id ? 20 : 10,
                        }}
                      >
                        <span className="px-2 py-1 rounded bg-white/85 text-xs font-semibold text-gray-900 pointer-events-none">
                          {space.name}
                        </span>
                        {(selectedSpaceId === space.id || rotatingSpaceId === space.id) && (
                          <div
                            className="rotate-handle"
                            onPointerDown={(e) => handleRotateStart(e, space.id)}
                            style={{
                              position: "absolute",
                              top: -8,
                              right: -8,
                              width: 20,
                              height: 20,
                              borderRadius: "50%",
                              background: "#2563eb",
                              border: "2px solid white",
                              cursor: "grab",
                              boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                              zIndex: 30,
                              touchAction: "none",
                            }}
                            title="Drag to rotate"
                          >
                                                  <svg
                                                    width="16"
                                                    height="16"
                                                    viewBox="0 0 16 16"
                                                    fill="none"
                                                    style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}
                                                  >
                                                    <path
                                                      d="M8 2 L8 6 M8 2 L6 4 M8 2 L10 4"
                                                      stroke="white"
                                                      strokeWidth="1.5"
                                                      strokeLinecap="round"
                                                    />
                                                  </svg>
                          </div>
                        )}
                      </Rnd>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg border border-gray-200 p-3 space-y-3">
                  {mode === "setup" ? (
                    <>
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-sm">Setup Mode</h3>
                        <Button size="sm" onClick={handleAddSpace}>
                          <Plus className="h-4 w-4 mr-1" /> Add Space
                        </Button>
                      </div>

                      {selectedSpace ? (
                        <div className="space-y-2">
                          <div className="space-y-1">
                            <Label>Name</Label>
                            <Input value={selectedSpace.name} onChange={(e) => setSpaces((prev) => prev.map((s) => (s.id === selectedSpace.id ? { ...s, name: e.target.value } : s)))} onBlur={() => void patchSpace(selectedSpace.id, { name: selectedSpace.name })} />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label>Type</Label>
                              <Input value={selectedSpace.field_type ?? ""} onChange={(e) => setSpaces((prev) => prev.map((s) => (s.id === selectedSpace.id ? { ...s, field_type: e.target.value } : s)))} onBlur={() => void patchSpace(selectedSpace.id, { fieldType: selectedSpace.field_type })} />
                            </div>
                            <div className="space-y-1">
                              <Label>Format</Label>
                              <Input value={selectedSpace.format ?? ""} onChange={(e) => setSpaces((prev) => prev.map((s) => (s.id === selectedSpace.id ? { ...s, format: e.target.value } : s)))} onBlur={() => void patchSpace(selectedSpace.id, { format: selectedSpace.format })} />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label>Fill</Label>
                              <Input type="color" value={selectedSpace.fill_color.startsWith("#") ? selectedSpace.fill_color : "#22c55e"} onChange={(e) => { const val = e.target.value; setSpaces((prev) => prev.map((s) => (s.id === selectedSpace.id ? { ...s, fill_color: val } : s))); void patchSpace(selectedSpace.id, { fillColor: val }); }} />
                            </div>
                            <div className="space-y-1">
                              <Label>Border</Label>
                              <Input type="color" value={selectedSpace.border_color} onChange={(e) => { const val = e.target.value; setSpaces((prev) => prev.map((s) => (s.id === selectedSpace.id ? { ...s, border_color: val } : s))); void patchSpace(selectedSpace.id, { borderColor: val }); }} />
                            </div>
                          </div>

                          <Button variant="destructive" size="sm" onClick={() => void handleDeleteSpace(selectedSpace.id)}>
                            <Trash2 className="h-4 w-4 mr-1" /> Delete Space
                          </Button>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">Select a field space to edit metadata and styles.</p>
                      )}
                    </>
                  ) : (
                    <>
                      <h3 className="font-semibold text-sm">Assignment Mode</h3>
                      <div className="space-y-1">
                        <Label>Field Space</Label>
                        <Select value={assignmentSpaceId || "none"} onValueChange={(v) => setAssignmentSpaceId(v === "none" ? "" : v)}>
                          <SelectTrigger><SelectValue placeholder="Select space" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Select space</SelectItem>
                            {filteredSpaces.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label>Team</Label>
                        <Select value={assignmentTeamId || "none"} onValueChange={(v) => setAssignmentTeamId(v === "none" ? "" : v)}>
                          <SelectTrigger><SelectValue placeholder="Optional team" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No team</SelectItem>
                            {teams.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label>Title</Label>
                        <Input value={assignmentTitle} onChange={(e) => setAssignmentTitle(e.target.value)} placeholder="U12 Training" />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label>Start</Label>
                          <Input type="datetime-local" value={assignmentStart} onChange={(e) => setAssignmentStart(e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <Label>End</Label>
                          <Input type="datetime-local" value={assignmentEnd} onChange={(e) => setAssignmentEnd(e.target.value)} />
                        </div>
                      </div>
                      <Button onClick={handleCreateAssignment} disabled={!assignmentSpaceId || !assignmentTitle.trim() || !assignmentStart || !assignmentEnd}>
                        <Save className="h-4 w-4 mr-1" /> Save Assignment
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center text-gray-500">
                Create or select a map to start using the visual editor.
              </div>
            )}
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Assignments</h3>
            <div className="space-y-2 max-h-72 overflow-auto">
              {mapAssignments.map((a) => (
                <div key={a.id} className="rounded-md border border-gray-200 p-2 text-sm flex items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-gray-900">{a.title}</p>
                    <p className="text-xs text-gray-500">{toLocalInputValue(a.start_at).replace("T", " ")} - {toLocalInputValue(a.end_at).replace("T", " ")}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{a.status}</Badge>
                    <Button size="sm" variant="ghost" onClick={() => void handleDeleteAssignment(a.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {mapAssignments.length === 0 && <p className="text-sm text-gray-500">No assignments yet for this map.</p>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
