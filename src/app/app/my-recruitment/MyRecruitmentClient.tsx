"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, ClipboardCheck, Filter, ChevronDown } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Team = { id: string; name: string; age_division: string | null };

type Prospect = {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  age_division: string | null;
  gender: string | null;
  parent_name: string | null;
  parent_email: string | null;
  parent_phone: string | null;
  current_club: string | null;
  current_team: string | null;
  primary_position: string | null;
  secondary_position: string | null;
  grad_year: number | null;
  recruiting_source: string | null;
  notes: string | null;
  status: string;
  team_id: string | null;
  event_id: string | null;
  archived: boolean;
  updated_at: string;
};

type Event = {
  id: string;
  name: string;
  event_type: string;
  season: string | null;
  age_division: string | null;
  gender: string | null;
  starts_at: string | null;
  ends_at: string | null;
  location: string | null;
  team_id: string | null;
};

type Evaluation = {
  id: string;
  prospect_id: string;
  event_id: string | null;
  rating: number | null;
  readiness: string | null;
  strengths: string | null;
  development_areas: string | null;
  notes: string | null;
  tags: string[];
  created_at: string;
};

type StatusHistory = {
  id: string;
  prospect_id: string;
  previous_status: string | null;
  new_status: string;
  change_reason: string | null;
  created_at: string;
};

type CoachData = {
  role: string;
  prospects: Prospect[];
  events: Event[];
  evaluations: Evaluation[];
  statusHistory: StatusHistory[];
  teams: Team[];
  statuses: string[];
};

type Filters = { q: string; status: string; archived: boolean };

const defaultFilters: Filters = { q: "", status: "", archived: false };

type Toast = { id: number; kind: "success" | "error"; message: string };

function CollapsibleSection({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="text-sm font-semibold text-gray-900">{title}</span>
        <ChevronDown
          className={`h-4 w-4 text-gray-400 transition-transform duration-150 ${open ? "" : "-rotate-90"}`}
        />
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1 border-t border-gray-100">{children}</div>
      )}
    </div>
  );
}

export function MyRecruitmentClient() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<CoachData>({
    role: "",
    prospects: [],
    events: [],
    evaluations: [],
    statusHistory: [],
    teams: [],
    statuses: [],
  });

  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [activeView, setActiveView] = useState<"pipeline" | "history">("pipeline");
  const [selectedProspectId, setSelectedProspectId] = useState("");
  const [filterModalOpen, setFilterModalOpen] = useState(false);

  const [statusChange, setStatusChange] = useState({ newStatus: "", reason: "" });
  const [newEval, setNewEval] = useState({
    eventId: "",
    rating: "",
    readiness: "",
    strengths: "",
    developmentAreas: "",
    notes: "",
    tags: "",
  });

  const [toasts, setToasts] = useState<Toast[]>([]);

  const selectedProspect = useMemo(
    () => data.prospects.find((p) => p.id === selectedProspectId) ?? null,
    [data.prospects, selectedProspectId]
  );

  const selectedProspectEvals = useMemo(
    () =>
      selectedProspect
        ? data.evaluations.filter((e) => e.prospect_id === selectedProspect.id)
        : [],
    [data.evaluations, selectedProspect]
  );

  const selectedProspectHistory = useMemo(
    () =>
      selectedProspect
        ? data.statusHistory.filter((h) => h.prospect_id === selectedProspect.id)
        : [],
    [data.statusHistory, selectedProspect]
  );

  const statusCounts = useMemo(() => {
    const counts = new Map<string, number>();
    data.statuses.forEach((s) => counts.set(s, 0));
    data.prospects.forEach((p) => counts.set(p.status, (counts.get(p.status) ?? 0) + 1));
    return counts;
  }, [data.prospects, data.statuses]);

  const avgRatingByProspect = useMemo(() => {
    const map = new Map<string, number>();
    const grouped = new Map<string, number[]>();
    data.evaluations.forEach((e) => {
      if (typeof e.rating === "number") {
        const list = grouped.get(e.prospect_id) ?? [];
        list.push(e.rating);
        grouped.set(e.prospect_id, list);
      }
    });
    grouped.forEach((values, key) => {
      map.set(key, values.reduce((a, b) => a + b, 0) / values.length);
    });
    return map;
  }, [data.evaluations]);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (filters.status) n++;
    if (filters.archived) n++;
    return n;
  }, [filters.status, filters.archived]);

  function toast(kind: Toast["kind"], message: string) {
    const id = Date.now() + Math.floor(Math.random() * 999);
    setToasts((prev) => [...prev, { id, kind, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4500);
  }

  async function loadData(nextFilters = filters) {
    const params = new URLSearchParams();
    if (nextFilters.q) params.set("q", nextFilters.q);
    if (nextFilters.status) params.set("status", nextFilters.status);
    params.set("archived", nextFilters.archived ? "true" : "false");

    const res = await fetch(`/api/app/my-recruitment?${params.toString()}`, {
      cache: "no-store",
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Failed to load recruitment data");
    setData(json);
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await loadData();
      } catch (e) {
        if (mounted) toast("error", e instanceof Error ? e.message : "Load failed");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function changeStatus() {
    if (!selectedProspect || !statusChange.newStatus) return;
    const res = await fetch("/api/app/my-recruitment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entity: "status_change",
        prospectId: selectedProspect.id,
        newStatus: statusChange.newStatus,
        reason: statusChange.reason || null,
      }),
    });
    const json = await res.json();
    if (!res.ok) return toast("error", json.error ?? "Failed to update status");

    setStatusChange({ newStatus: "", reason: "" });
    await loadData();
    toast("success", "Status updated.");
  }

  async function addEvaluation() {
    if (!selectedProspect) return;
    const res = await fetch("/api/app/my-recruitment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entity: "evaluation",
        prospectId: selectedProspect.id,
        eventId: newEval.eventId || null,
        rating: newEval.rating ? Number(newEval.rating) : null,
        readiness: newEval.readiness || null,
        strengths: newEval.strengths || null,
        developmentAreas: newEval.developmentAreas || null,
        notes: newEval.notes || null,
        tags: newEval.tags
          ? newEval.tags
              .split(",")
              .map((v) => v.trim())
              .filter(Boolean)
          : [],
      }),
    });
    const json = await res.json();
    if (!res.ok) return toast("error", json.error ?? "Failed to add evaluation");

    setNewEval({
      eventId: "",
      rating: "",
      readiness: "",
      strengths: "",
      developmentAreas: "",
      notes: "",
      tags: "",
    });
    await loadData();
    toast("success", "Evaluation saved.");
  }

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* Toast notifications */}
      <div className="fixed right-4 top-4 z-50 space-y-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={
              t.kind === "success"
                ? "rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800 shadow"
                : "rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 shadow"
            }
          >
            {t.message}
          </div>
        ))}
      </div>

      {/* Page header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Recruitment</h1>
          <p className="text-sm text-gray-500">
            {data.teams.length > 0
              ? `Prospects and events for: ${data.teams.map((t) => t.name).join(", ")}`
              : "Prospects and events for your assigned teams."}
          </p>
        </div>
        <div className="inline-flex rounded-lg border border-gray-200 p-1 bg-white shrink-0">
          {(
            [
              ["pipeline", "Pipeline"],
              ["history", "History"],
            ] as [string, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`px-3 py-1.5 text-sm rounded-md ${
                activeView === id
                  ? "bg-blue-600 text-white"
                  : "text-gray-600 hover:text-gray-900"
              }`}
              onClick={() => setActiveView(id as typeof activeView)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Search + Filter row */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
          <Input
            className="pl-8"
            placeholder="Search by name, email, club..."
            value={filters.q}
            onChange={(e) => setFilters((prev) => ({ ...prev, q: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === "Enter") void loadData(filters);
            }}
          />
        </div>
        <Button
          variant="outline"
          className="shrink-0"
          onClick={() => setFilterModalOpen(true)}
        >
          <Filter className="h-4 w-4 mr-1.5" />
          Filters
          {activeFilterCount > 0 && (
            <span className="ml-1.5 inline-flex items-center justify-center h-4 w-4 rounded-full bg-blue-600 text-white text-[10px] font-semibold">
              {activeFilterCount}
            </span>
          )}
        </Button>
        <Button className="shrink-0" onClick={() => void loadData(filters)}>
          <Search className="h-4 w-4 mr-1.5" />
          Search
        </Button>
      </div>

      {/* Filter modal */}
      <Dialog open={filterModalOpen} onOpenChange={setFilterModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Filter Prospects</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="modal-filter-status">Status</Label>
              <Select
                value={filters.status || "all"}
                onValueChange={(v) =>
                  setFilters((prev) => ({
                    ...prev,
                    status: v === "all" ? "" : v,
                  }))
                }
              >
                <SelectTrigger id="modal-filter-status">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {data.statuses.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="modal-filter-scope">Record Scope</Label>
              <Select
                value={filters.archived ? "archived" : "active"}
                onValueChange={(v) =>
                  setFilters((prev) => ({ ...prev, archived: v === "archived" }))
                }
              >
                <SelectTrigger id="modal-filter-scope">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active Prospects</SelectItem>
                  <SelectItem value="archived">Archived / Historical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                className="flex-1"
                onClick={() => {
                  void loadData(filters);
                  setFilterModalOpen(false);
                }}
              >
                Apply Filters
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setFilters(defaultFilters);
                  void loadData(defaultFilters);
                  setFilterModalOpen(false);
                }}
              >
                Reset
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {loading ? (
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center text-gray-500">
          Loading your recruitment workspace...
        </div>
      ) : (
        <div className="space-y-3">
          {/* ── PIPELINE VIEW ── */}
          {activeView === "pipeline" && (
            <>
              <CollapsibleSection title="Status Overview">
                <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-2 pt-2">
                  {data.statuses.map((status) => (
                    <button
                      key={status}
                      type="button"
                      className={`rounded-md border px-3 py-2 text-left transition-colors ${
                        filters.status === status
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 bg-white hover:border-gray-300"
                      }`}
                      onClick={() => {
                        const next = {
                          ...filters,
                          status: filters.status === status ? "" : status,
                        };
                        setFilters(next);
                        void loadData(next);
                      }}
                    >
                      <p className="text-xs text-gray-500">{status}</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {statusCounts.get(status) ?? 0}
                      </p>
                    </button>
                  ))}
                </div>
              </CollapsibleSection>

              <CollapsibleSection
                title={`Prospect List${data.prospects.length > 0 ? ` (${data.prospects.length})` : ""}`}
              >
                <div className="max-h-96 overflow-auto space-y-2 pt-2">
                  {data.prospects.map((p) => {
                    const team = data.teams.find((t) => t.id === p.team_id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        className={`w-full rounded-md border px-3 py-2 text-left transition-colors ${
                          selectedProspectId === p.id
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 bg-white hover:border-gray-300"
                        }`}
                        onClick={() => setSelectedProspectId(p.id)}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium text-sm text-gray-900">
                            {p.first_name} {p.last_name}
                          </p>
                          <Badge variant="outline">{p.status}</Badge>
                        </div>
                        <p className="text-xs text-gray-500">
                          {p.age_division ?? "N/A"} • {p.gender ?? "N/A"} •{" "}
                          {p.primary_position ?? "Position TBD"}
                        </p>
                        {team && (
                          <p className="text-xs text-gray-500">{team.name}</p>
                        )}
                        <p className="mt-0.5 text-xs text-gray-500">
                          Avg Eval:{" "}
                          {avgRatingByProspect.get(p.id)?.toFixed(1) ?? "—"}
                        </p>
                      </button>
                    );
                  })}
                  {data.prospects.length === 0 && (
                    <p className="text-sm text-gray-500 py-2">
                      No prospects for your teams yet.
                    </p>
                  )}
                </div>
              </CollapsibleSection>

              <CollapsibleSection
                title={`My Team Events${data.events.length > 0 ? ` (${data.events.length})` : ""}`}
                defaultOpen={false}
              >
                <div className="space-y-1 pt-2">
                  {data.events.map((ev) => {
                    const team = data.teams.find((t) => t.id === ev.team_id);
                    return (
                      <div
                        key={ev.id}
                        className="rounded border border-gray-200 p-3 text-sm"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900">{ev.name}</p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {ev.event_type.replace("_", " ")}
                              {team ? ` • ${team.name}` : ""}
                              {ev.starts_at
                                ? ` • ${new Date(ev.starts_at).toLocaleDateString(
                                    undefined,
                                    {
                                      month: "short",
                                      day: "numeric",
                                      year: "numeric",
                                    }
                                  )} ${new Date(ev.starts_at).toLocaleTimeString(
                                    undefined,
                                    { hour: "numeric", minute: "2-digit" }
                                  )}`
                                : ""}
                            </p>
                            {ev.location && (
                              <p className="text-xs text-gray-400 mt-0.5">
                                {ev.location}
                              </p>
                            )}
                          </div>
                          {ev.season && (
                            <span className="text-xs text-gray-400 shrink-0">
                              {ev.season}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {data.events.length === 0 && (
                    <p className="text-sm text-gray-500 py-2">
                      No events scheduled for your teams yet.
                    </p>
                  )}
                </div>
              </CollapsibleSection>

              {selectedProspect && (
                <CollapsibleSection
                  title={`Prospect — ${selectedProspect.first_name} ${selectedProspect.last_name}`}
                >
                  <div className="space-y-4 pt-2">
                    {/* Prospect info */}
                    <div className="rounded-md border border-gray-200 p-3 text-sm space-y-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-gray-900">
                          {selectedProspect.first_name} {selectedProspect.last_name}
                        </p>
                        <Badge variant="outline">{selectedProspect.status}</Badge>
                      </div>
                      <p className="text-xs text-gray-500">
                        DOB: {selectedProspect.date_of_birth ?? "N/A"} •{" "}
                        {selectedProspect.age_division ?? "N/A"} •{" "}
                        {selectedProspect.gender ?? "N/A"}
                      </p>
                      <p className="text-xs text-gray-500">
                        Position:{" "}
                        {[
                          selectedProspect.primary_position,
                          selectedProspect.secondary_position,
                        ]
                          .filter(Boolean)
                          .join(" / ") || "N/A"}
                      </p>
                      {selectedProspect.current_club && (
                        <p className="text-xs text-gray-500">
                          Current Club: {selectedProspect.current_club}
                          {selectedProspect.current_team
                            ? ` — ${selectedProspect.current_team}`
                            : ""}
                        </p>
                      )}
                      <p className="text-xs text-gray-500">
                        Parent: {selectedProspect.parent_name ?? "N/A"} •{" "}
                        {selectedProspect.parent_email ?? "no email"}
                        {selectedProspect.parent_phone
                          ? ` • ${selectedProspect.parent_phone}`
                          : ""}
                      </p>
                      {selectedProspect.notes && (
                        <p className="text-xs text-gray-500 mt-1 border-t border-gray-100 pt-1">
                          {selectedProspect.notes}
                        </p>
                      )}
                    </div>

                    {/* Status update */}
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-800">
                        Update Status
                      </p>
                      <Select
                        value={statusChange.newStatus || "none"}
                        onValueChange={(v) =>
                          setStatusChange((prev) => ({
                            ...prev,
                            newStatus: v === "none" ? "" : v,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select next status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Select status</SelectItem>
                          {data.statuses.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder="Reason (optional)"
                        value={statusChange.reason}
                        onChange={(e) =>
                          setStatusChange((prev) => ({
                            ...prev,
                            reason: e.target.value,
                          }))
                        }
                      />
                      <Button
                        size="sm"
                        onClick={() => void changeStatus()}
                        disabled={!statusChange.newStatus}
                      >
                        Save Status
                      </Button>
                    </div>

                    {/* Evaluation form */}
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-800">
                        Add Evaluation
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label htmlFor="eval-event">Event</Label>
                          <Select
                            value={newEval.eventId || "none"}
                            onValueChange={(v) =>
                              setNewEval((prev) => ({
                                ...prev,
                                eventId: v === "none" ? "" : v,
                              }))
                            }
                          >
                            <SelectTrigger id="eval-event">
                              <SelectValue placeholder="No event" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No event</SelectItem>
                              {data.events.map((e) => (
                                <SelectItem key={e.id} value={e.id}>
                                  {e.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="eval-rating">Rating (1–5)</Label>
                          <Input
                            id="eval-rating"
                            placeholder="e.g. 4"
                            value={newEval.rating}
                            onChange={(e) =>
                              setNewEval((prev) => ({
                                ...prev,
                                rating: e.target.value,
                              }))
                            }
                          />
                        </div>
                      </div>
                      <Input
                        placeholder="Readiness"
                        value={newEval.readiness}
                        onChange={(e) =>
                          setNewEval((prev) => ({
                            ...prev,
                            readiness: e.target.value,
                          }))
                        }
                      />
                      <Input
                        placeholder="Strengths"
                        value={newEval.strengths}
                        onChange={(e) =>
                          setNewEval((prev) => ({
                            ...prev,
                            strengths: e.target.value,
                          }))
                        }
                      />
                      <Input
                        placeholder="Development Areas"
                        value={newEval.developmentAreas}
                        onChange={(e) =>
                          setNewEval((prev) => ({
                            ...prev,
                            developmentAreas: e.target.value,
                          }))
                        }
                      />
                      <Input
                        placeholder="Tags (comma separated)"
                        value={newEval.tags}
                        onChange={(e) =>
                          setNewEval((prev) => ({
                            ...prev,
                            tags: e.target.value,
                          }))
                        }
                      />
                      <Input
                        placeholder="Notes"
                        value={newEval.notes}
                        onChange={(e) =>
                          setNewEval((prev) => ({
                            ...prev,
                            notes: e.target.value,
                          }))
                        }
                      />
                      <Button size="sm" onClick={() => void addEvaluation()}>
                        <ClipboardCheck className="h-4 w-4 mr-1" /> Save Evaluation
                      </Button>
                    </div>

                    {/* Evaluations history */}
                    <div>
                      <p className="text-sm font-medium text-gray-800 mb-2">
                        Evaluations ({selectedProspectEvals.length})
                      </p>
                      <div className="max-h-48 overflow-auto space-y-1">
                        {selectedProspectEvals.map((e) => (
                          <div
                            key={e.id}
                            className="rounded border border-gray-200 p-2 text-xs"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-medium text-gray-800">
                                Rating: {e.rating ?? "—"}
                                {e.readiness ? ` • ${e.readiness}` : ""}
                              </p>
                              <span className="text-gray-400">
                                {new Date(e.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            {e.strengths && (
                              <p className="text-gray-600 mt-0.5">
                                Strengths: {e.strengths}
                              </p>
                            )}
                            {e.development_areas && (
                              <p className="text-gray-600">
                                Dev Areas: {e.development_areas}
                              </p>
                            )}
                            {e.notes && (
                              <p className="text-gray-500 mt-0.5 border-t border-gray-100 pt-0.5">
                                {e.notes}
                              </p>
                            )}
                            {e.tags?.length > 0 && (
                              <p className="text-gray-400 mt-0.5">
                                {e.tags.join(", ")}
                              </p>
                            )}
                          </div>
                        ))}
                        {selectedProspectEvals.length === 0 && (
                          <p className="text-xs text-gray-500">
                            No evaluations yet.
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Status history */}
                    {selectedProspectHistory.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-gray-800 mb-2">
                          Status History
                        </p>
                        <div className="max-h-40 overflow-auto space-y-1">
                          {selectedProspectHistory.map((h) => (
                            <div
                              key={h.id}
                              className="flex items-center gap-2 text-xs text-gray-600"
                            >
                              <span className="text-gray-400">
                                {new Date(h.created_at).toLocaleDateString()}
                              </span>
                              <span>
                                {h.previous_status ?? "—"} → {h.new_status}
                              </span>
                              {h.change_reason && (
                                <span className="text-gray-400">
                                  ({h.change_reason})
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CollapsibleSection>
              )}
            </>
          )}

          {/* ── HISTORY VIEW ── */}
          {activeView === "history" && (
            <CollapsibleSection
              title={`Historical Applicants${data.prospects.length > 0 ? ` (${data.prospects.length})` : ""}`}
            >
              <div className="space-y-2 pt-2">
                {data.prospects.map((p) => {
                  const team = data.teams.find((t) => t.id === p.team_id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      className={`w-full rounded-md border px-3 py-2 text-left transition-colors ${
                        selectedProspectId === p.id
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 bg-white hover:border-gray-300"
                      }`}
                      onClick={() => setSelectedProspectId(p.id)}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-sm text-gray-900">
                          {p.first_name} {p.last_name}
                        </p>
                        <Badge variant="outline">{p.status}</Badge>
                      </div>
                      <p className="text-xs text-gray-500">
                        {p.age_division ?? "N/A"} • {p.gender ?? "N/A"} •{" "}
                        {p.primary_position ?? "Position TBD"}
                      </p>
                      {team && (
                        <p className="text-xs text-gray-500">{team.name}</p>
                      )}
                    </button>
                  );
                })}
                {data.prospects.length === 0 && (
                  <p className="text-sm text-gray-500 py-2">
                    No historical prospects found.
                  </p>
                )}
              </div>
            </CollapsibleSection>
          )}
        </div>
      )}
    </div>
  );
}
