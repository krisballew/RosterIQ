"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Upload, Link as LinkIcon, ClipboardCheck, History, UserPlus, Filter, CalendarClock, Pencil, Trash2, X, Check, ChevronDown } from "lucide-react";

type Team = { id: string; name: string; age_division: string | null };
type FieldSpace = { id: string; map_id: string; name: string; field_type: string | null; availability_status: string; complex_name: string | null };

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
  school_year: string | null;
  recruiting_source: string | null;
  roster_fit_tag: string | null;
  tags: string[];
  notes: string | null;
  status: string;
  team_id: string | null;
  event_id: string | null;
  archived: boolean;
  created_at: string;
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

type RegistrationLink = {
  id: string;
  slug: string;
  name: string;
  event_id: string | null;
  season: string | null;
  age_division: string | null;
  gender: string | null;
  team_id: string | null;
  starts_on: string | null;
  ends_on: string | null;
  is_active: boolean;
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

type Plan = {
  id: string;
  team_id: string | null;
  age_division: string | null;
  target_roster_size: number | null;
  open_positions: string[];
  recruiting_priority: "low" | "medium" | "high" | "urgent";
  upcoming_dates: string[];
  notes: string | null;
  is_active: boolean;
};

type RecruitmentData = {
  role: string;
  prospects: Prospect[];
  events: Event[];
  links: RegistrationLink[];
  evaluations: Evaluation[];
  statusHistory: StatusHistory[];
  plans: Plan[];
  teams: Team[];
  fieldSpaces: FieldSpace[];
  statuses: string[];
};

type Filters = {
  q: string;
  status: string;
  ageDivision: string;
  gender: string;
  teamId: string;
  position: string;
  source: string;
  currentClub: string;
  archived: boolean;
};

const defaultFilters: Filters = {
  q: "",
  status: "",
  ageDivision: "",
  gender: "",
  teamId: "",
  position: "",
  source: "",
  currentClub: "",
  archived: false,
};

type Toast = { id: number; kind: "success" | "error"; message: string };

function parseCsv(text: string) {
  const rows: string[][] = [];
  let cur = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];

    if (ch === '"' && inQuotes && next === '"') {
      cur += '"';
      i += 1;
      continue;
    }
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === "," && !inQuotes) {
      row.push(cur.trim());
      cur = "";
      continue;
    }
    if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (cur.length > 0 || row.length > 0) {
        row.push(cur.trim());
        rows.push(row);
      }
      row = [];
      cur = "";
      if (ch === "\r" && next === "\n") i += 1;
      continue;
    }
    cur += ch;
  }

  if (cur.length > 0 || row.length > 0) {
    row.push(cur.trim());
    rows.push(row);
  }
  return rows;
}

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
      {open && <div className="px-4 pb-4 pt-1 border-t border-gray-100">{children}</div>}
    </div>
  );
}

export function RecruitmentClient() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<RecruitmentData>({
    role: "",
    prospects: [],
    events: [],
    links: [],
    evaluations: [],
    statusHistory: [],
    plans: [],
    teams: [],
    fieldSpaces: [],
    statuses: [],
  });

  const isCoach = data.role === "select_coach" || data.role === "academy_coach";

  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [selectedProspectId, setSelectedProspectId] = useState("");
  const [activeView, setActiveView] = useState<"pipeline" | "intake" | "planning" | "history">("pipeline");

  const [newProspect, setNewProspect] = useState({
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    gender: "",
    parentName: "",
    parentEmail: "",
    parentPhone: "",
    currentClub: "",
    currentTeam: "",
    primaryPosition: "",
    secondaryPosition: "",
  });

  const [statusChange, setStatusChange] = useState({ newStatus: "", reason: "" });
  const [newEvent, setNewEvent] = useState({
    name: "",
    eventType: "tryout",
    season: "",
    gender: "coed",
    startDate: "",
    startTime: "",
    durationMinutes: "90",
    fieldSpaceId: "",
    teamId: "",
  });

  const [newLink, setNewLink] = useState({
    name: "",
    eventId: "",
    teamId: "",
    startsOn: "",
    endsOn: "",
  });

  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
  const [editLinkData, setEditLinkData] = useState({ startsOn: "", endsOn: "" });

  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editEventData, setEditEventData] = useState({
    name: "",
    eventType: "tryout",
    season: "",
    gender: "coed",
    startDate: "",
    startTime: "",
    durationMinutes: "90",
    fieldSpaceId: "",
    teamId: "",
    existingLocation: "",
  });

  const [newEval, setNewEval] = useState({
    eventId: "",
    rating: "",
    readiness: "",
    strengths: "",
    developmentAreas: "",
    notes: "",
    tags: "",
  });

  const [newPlan, setNewPlan] = useState({
    teamId: "",
    ageDivision: "",
    targetRosterSize: "",
    openPositions: "",
    recruitingPriority: "medium",
    upcomingDates: "",
    notes: "",
  });

  const [csvText, setCsvText] = useState("");
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvPreview, setCsvPreview] = useState<string[][]>([]);
  const [csvMapping, setCsvMapping] = useState<Record<string, string>>({});

  const [toasts, setToasts] = useState<Toast[]>([]);
  const [filterModalOpen, setFilterModalOpen] = useState(false);

  const selectedProspect = useMemo(
    () => data.prospects.find((p) => p.id === selectedProspectId) ?? null,
    [data.prospects, selectedProspectId]
  );

  const selectedProspectEvals = useMemo(
    () => (selectedProspect ? data.evaluations.filter((e) => e.prospect_id === selectedProspect.id) : []),
    [data.evaluations, selectedProspect]
  );

  const selectedProspectHistory = useMemo(
    () => (selectedProspect ? data.statusHistory.filter((h) => h.prospect_id === selectedProspect.id) : []),
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
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      map.set(key, avg);
    });
    return map;
  }, [data.evaluations]);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (filters.status) n++;
    if (filters.teamId) n++;
    if (filters.archived) n++;
    return n;
  }, [filters.status, filters.teamId, filters.archived]);

  function toast(kind: Toast["kind"], message: string) {
    const id = Date.now() + Math.floor(Math.random() * 999);
    setToasts((prev) => [...prev, { id, kind, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4500);
  }

  async function loadData(nextFilters = filters) {
    const params = new URLSearchParams();
    if (nextFilters.q) params.set("q", nextFilters.q);
    if (nextFilters.status) params.set("status", nextFilters.status);
    if (nextFilters.ageDivision) params.set("ageDivision", nextFilters.ageDivision);
    if (nextFilters.gender) params.set("gender", nextFilters.gender);
    if (nextFilters.teamId) params.set("teamId", nextFilters.teamId);
    if (nextFilters.position) params.set("position", nextFilters.position);
    if (nextFilters.source) params.set("source", nextFilters.source);
    if (nextFilters.currentClub) params.set("currentClub", nextFilters.currentClub);
    params.set("archived", nextFilters.archived ? "true" : "false");

    const res = await fetch(`/api/app/recruitment?${params.toString()}`, { cache: "no-store" });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Failed to load recruitment data");
    setData(json);

    if (!selectedProspectId && json.prospects.length > 0) {
      setSelectedProspectId(json.prospects[0].id);
    }
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

  async function createProspect() {
    if (!newProspect.firstName.trim() || !newProspect.lastName.trim() || !newProspect.dateOfBirth) {
      return toast("error", "First name, last name, and date of birth are required.");
    }

    const res = await fetch("/api/app/recruitment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entity: "prospect",
        firstName: newProspect.firstName,
        lastName: newProspect.lastName,
        dateOfBirth: newProspect.dateOfBirth,
        gender: newProspect.gender,
        parentName: newProspect.parentName,
        parentEmail: newProspect.parentEmail,
        parentPhone: newProspect.parentPhone,
        currentClub: newProspect.currentClub,
        currentTeam: newProspect.currentTeam,
        primaryPosition: newProspect.primaryPosition,
        secondaryPosition: newProspect.secondaryPosition,
      }),
    });
    const json = await res.json();
    if (!res.ok) return toast("error", json.error ?? "Failed to create prospect");

    setNewProspect({
      firstName: "",
      lastName: "",
      dateOfBirth: "",
      gender: "",
      parentName: "",
      parentEmail: "",
      parentPhone: "",
      currentClub: "",
      currentTeam: "",
      primaryPosition: "",
      secondaryPosition: "",
    });
    await loadData();
    if (json.prospect?.id) setSelectedProspectId(json.prospect.id);
    toast("success", "Prospect added.");
  }

  async function createEvent() {
    if (!newEvent.name.trim() || !newEvent.startDate || !newEvent.startTime) {
      return toast("error", "Event name, start date, and start time are required.");
    }

    const durationMinutes = Number(newEvent.durationMinutes || "0");
    if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
      return toast("error", "Duration must be a positive number of minutes.");
    }

    const startAt = `${newEvent.startDate}T${newEvent.startTime}`;

    const selectedSpace = data.fieldSpaces.find((s) => s.id === newEvent.fieldSpaceId);
    const locationLabel = selectedSpace
      ? selectedSpace.complex_name
        ? `${selectedSpace.complex_name} — ${selectedSpace.name}`
        : selectedSpace.name
      : null;

    const res = await fetch("/api/app/recruitment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entity: "event",
        name: newEvent.name,
        eventType: newEvent.eventType,
        season: newEvent.season,
        gender: newEvent.gender,
        startAt,
        durationMinutes,
        location: locationLabel,
        teamId: newEvent.teamId || null,
        fieldSpaceId: newEvent.fieldSpaceId || null,
        fieldSpaceMapId: selectedSpace?.map_id ?? null,
      }),
    });
    const json = await res.json();
    if (!res.ok) return toast("error", json.error ?? "Failed to create event");

    setNewEvent({
      name: "",
      eventType: "tryout",
      season: "",
      gender: "coed",
      startDate: "",
      startTime: "",
      durationMinutes: "90",
      fieldSpaceId: "",
      teamId: "",
    });
    await loadData();
    toast("success", "Recruiting event created.");
  }

  async function createRegistrationLink() {
    if (!newLink.name.trim()) return;
    
    const selectedEvent = data.events.find((e) => e.id === newLink.eventId);
    const payload = {
      entity: "registration_link",
      name: newLink.name,
      eventId: newLink.eventId || null,
      season: selectedEvent?.season ?? null,
      ageDivision: selectedEvent?.age_division ?? null,
      gender: selectedEvent?.gender ?? null,
      teamId: newLink.teamId || null,
      startsOn: newLink.startsOn || null,
      endsOn: newLink.endsOn || null,
    };
    
    const res = await fetch("/api/app/recruitment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) return toast("error", json.error ?? "Failed to create link");

    setNewLink({ name: "", eventId: "", teamId: "", startsOn: "", endsOn: "" });
    await loadData();
    toast("success", "Registration link created.");
  }

  async function updateRegistrationLink(linkId: string) {
    const res = await fetch("/api/app/recruitment", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entity: "registration_link",
        linkId,
        startsOn: editLinkData.startsOn || null,
        endsOn: editLinkData.endsOn || null,
      }),
    });
    const json = await res.json();
    if (!res.ok) return toast("error", json.error ?? "Failed to update link");

    setEditingLinkId(null);
    setEditLinkData({ startsOn: "", endsOn: "" });
    await loadData();
    toast("success", "Link updated.");
  }

  async function updateEvent(eventId: string) {
    if (!editEventData.name.trim() || !editEventData.startDate || !editEventData.startTime) {
      return toast("error", "Event name, start date, and start time are required.");
    }
    const durationMinutes = Number(editEventData.durationMinutes || "0");
    if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
      return toast("error", "Duration must be a positive number of minutes.");
    }
    const selectedSpace = editEventData.fieldSpaceId
      ? data.fieldSpaces.find((s) => s.id === editEventData.fieldSpaceId)
      : null;
    const locationLabel = selectedSpace
      ? selectedSpace.complex_name
        ? `${selectedSpace.complex_name} — ${selectedSpace.name}`
        : selectedSpace.name
      : editEventData.existingLocation || null;
    const startAt = `${editEventData.startDate}T${editEventData.startTime}`;
    const res = await fetch("/api/app/recruitment", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entity: "event",
        eventId,
        name: editEventData.name,
        eventType: editEventData.eventType,
        season: editEventData.season,
        gender: editEventData.gender,
        startAt,
        durationMinutes,
        location: locationLabel,
        teamId: editEventData.teamId || null,
      }),
    });
    const json = await res.json();
    if (!res.ok) return toast("error", json.error ?? "Failed to update event");
    setEditingEventId(null);
    await loadData();
    toast("success", "Event updated.");
  }

  async function deleteEvent(eventId: string, eventName: string) {
    if (!confirm(`Delete event "${eventName}" and all its associated registration links? This cannot be undone.`)) return;
    const res = await fetch(`/api/app/recruitment?eventId=${encodeURIComponent(eventId)}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok) return toast("error", json.error ?? "Failed to delete event");
    await loadData();
    toast("success", "Event and associated registration links deleted.");
  }

  async function deleteRegistrationLink(linkId: string) {
    if (!confirm("Are you sure you want to delete this registration link?")) return;

    const res = await fetch(`/api/app/recruitment?linkId=${linkId}`, {
      method: "DELETE",
    });
    const json = await res.json();
    if (!res.ok) return toast("error", json.error ?? "Failed to delete link");

    await loadData();
    toast("success", "Link deleted.");
  }

  async function changeStatus() {
    if (!selectedProspect || !statusChange.newStatus) return;
    const res = await fetch("/api/app/recruitment", {
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
    const res = await fetch("/api/app/recruitment", {
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
        tags: newEval.tags ? newEval.tags.split(",").map((v) => v.trim()).filter(Boolean) : [],
      }),
    });
    const json = await res.json();
    if (!res.ok) return toast("error", json.error ?? "Failed to add evaluation");

    setNewEval({ eventId: "", rating: "", readiness: "", strengths: "", developmentAreas: "", notes: "", tags: "" });
    await loadData();
    toast("success", "Evaluation added.");
  }

  async function savePlan() {
    const res = await fetch("/api/app/recruitment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entity: "plan",
        teamId: newPlan.teamId || null,
        ageDivision: newPlan.ageDivision || null,
        targetRosterSize: newPlan.targetRosterSize ? Number(newPlan.targetRosterSize) : null,
        openPositions: newPlan.openPositions.split(",").map((v) => v.trim()).filter(Boolean),
        recruitingPriority: newPlan.recruitingPriority,
        upcomingDates: newPlan.upcomingDates.split(",").map((v) => v.trim()).filter(Boolean),
        notes: newPlan.notes || null,
      }),
    });
    const json = await res.json();
    if (!res.ok) return toast("error", json.error ?? "Failed to save plan");

    setNewPlan({ teamId: "", ageDivision: "", targetRosterSize: "", openPositions: "", recruitingPriority: "medium", upcomingDates: "", notes: "" });
    await loadData();
    toast("success", "Recruiting plan saved.");
  }

  async function convertToPlayer() {
    if (!selectedProspect) return;
    const res = await fetch("/api/app/recruitment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity: "convert_to_player", prospectId: selectedProspect.id }),
    });
    const json = await res.json();
    if (!res.ok) return toast("error", json.error ?? "Failed to convert prospect");

    await loadData();
    toast("success", `Prospect converted to active player (${json.playerId}).`);
  }

  async function importCsvRecords() {
    if (!csvText.trim()) return;
    const res = await fetch("/api/app/recruitment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity: "import_csv", csv: csvText, mapping: csvMapping }),
    });
    const json = await res.json();
    if (!res.ok) return toast("error", json.error ?? "Import failed");

    setCsvText("");
    setCsvHeaders([]);
    setCsvPreview([]);
    setCsvMapping({});
    await loadData();
    toast("success", `${json.imported} prospects imported.`);
  }

  function onCsvUpload(file: File) {
    void (async () => {
      const text = await file.text();
      setCsvText(text);
      const rows = parseCsv(text);
      const headers = rows[0] ?? [];
      setCsvHeaders(headers);
      setCsvPreview(rows.slice(1, 6));

      const autoMap: Record<string, string> = {};
      const targets = [
        "first_name",
        "last_name",
        "date_of_birth",
        "age_division",
        "gender",
        "parent_name",
        "parent_email",
        "parent_phone",
        "current_club",
        "current_team",
        "primary_position",
        "secondary_position",
        "grad_year",
        "school_year",
        "recruiting_source",
        "roster_fit_tag",
        "status",
        "notes",
      ];

      targets.forEach((target) => {
        const found = headers.find((h) => h.toLowerCase().replace(/\s+/g, "_") === target);
        if (found) autoMap[target] = found;
      });
      setCsvMapping(autoMap);
    })();
  }

  const externalLinkBase = typeof window !== "undefined" ? window.location.origin : "";

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
          <h1 className="text-2xl font-bold text-gray-900">Recruitment CRM</h1>
          <p className="text-sm text-gray-500">Track prospects from first interest through evaluation, decision, and roster conversion.</p>
        </div>
        <div className="inline-flex rounded-lg border border-gray-200 p-1 bg-white shrink-0">
          {([
            ["pipeline", "Pipeline"],
            ...(!isCoach ? [["intake", "Intake"]] : []),
            ...(!isCoach ? [["planning", "Planning"]] : []),
            ["history", "History"],
          ] as [string, string][]).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`px-3 py-1.5 text-sm rounded-md ${
                activeView === id ? "bg-blue-600 text-white" : "text-gray-600 hover:text-gray-900"
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
            placeholder="Search by name, email, club, position..."
            value={filters.q}
            onChange={(e) => setFilters((prev) => ({ ...prev, q: e.target.value }))}
            onKeyDown={(e) => { if (e.key === "Enter") void loadData(filters); }}
          />
        </div>
        <Button variant="outline" className="shrink-0" onClick={() => setFilterModalOpen(true)}>
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
              <Select value={filters.status || "all"} onValueChange={(v) => setFilters((prev) => ({ ...prev, status: v === "all" ? "" : v }))}>
                <SelectTrigger id="modal-filter-status"><SelectValue placeholder="All Statuses" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {data.statuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="modal-filter-team">Team</Label>
              <Select value={filters.teamId || "all"} onValueChange={(v) => setFilters((prev) => ({ ...prev, teamId: v === "all" ? "" : v }))}>
                <SelectTrigger id="modal-filter-team"><SelectValue placeholder="All Teams" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Teams</SelectItem>
                  {data.teams.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="modal-filter-scope">Record Scope</Label>
              <Select value={filters.archived ? "archived" : "active"} onValueChange={(v) => setFilters((prev) => ({ ...prev, archived: v === "archived" }))}>
                <SelectTrigger id="modal-filter-scope"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active Prospects</SelectItem>
                  <SelectItem value="archived">Archived / Historical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 pt-2">
              <Button className="flex-1" onClick={() => { void loadData(filters); setFilterModalOpen(false); }}>
                Apply Filters
              </Button>
              <Button variant="outline" onClick={() => { setFilters(defaultFilters); void loadData(defaultFilters); setFilterModalOpen(false); }}>
                Reset
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {loading ? (
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center text-gray-500">
          Loading recruitment workspace...
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
                      className={`rounded-md border px-3 py-2 text-left transition-colors ${filters.status === status ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white hover:border-gray-300"}`}
                      onClick={() => {
                        const next = { ...filters, status: filters.status === status ? "" : status };
                        setFilters(next);
                        void loadData(next);
                      }}
                    >
                      <p className="text-xs text-gray-500">{status}</p>
                      <p className="text-lg font-semibold text-gray-900">{statusCounts.get(status) ?? 0}</p>
                    </button>
                  ))}
                </div>
              </CollapsibleSection>

              <CollapsibleSection title={`Prospect List${data.prospects.length > 0 ? ` (${data.prospects.length})` : ""}`}>
                <div className="max-h-96 overflow-auto space-y-2 pt-2">
                  {data.prospects.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className={`w-full rounded-md border px-3 py-2 text-left transition-colors ${selectedProspectId === p.id ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white hover:border-gray-300"}`}
                      onClick={() => setSelectedProspectId(p.id)}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-sm text-gray-900">{p.first_name} {p.last_name}</p>
                        <Badge variant="outline">{p.status}</Badge>
                      </div>
                      <p className="text-xs text-gray-500">{p.age_division ?? "N/A"} • {p.gender ?? "N/A"} • {p.primary_position ?? "Position TBD"}</p>
                      <p className="text-xs text-gray-500">{p.current_club ?? "No current club"}</p>
                      <p className="mt-0.5 text-xs text-gray-500">Avg Eval: {avgRatingByProspect.get(p.id)?.toFixed(1) ?? "—"}</p>
                    </button>
                  ))}
                  {data.prospects.length === 0 && <p className="text-sm text-gray-500 py-2">No prospects match current filters.</p>}
                </div>
              </CollapsibleSection>

              {/* Coaches see a read-only events list in Pipeline; managers see it under Intake */}
              {isCoach && (
                <CollapsibleSection title={`My Team Events${data.events.length > 0 ? ` (${data.events.length})` : ""}`}>
                  <div className="space-y-1 pt-2">
                    {data.events.map((ev) => {
                      const team = data.teams.find((t) => t.id === ev.team_id);
                      return (
                        <div key={ev.id} className="rounded border border-gray-200 p-3 text-sm">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-medium text-gray-900">{ev.name}</p>
                              <p className="text-xs text-gray-500 mt-0.5">
                                {ev.event_type.replace("_", " ")}
                                {team ? ` • ${team.name}` : ""}
                                {ev.starts_at
                                  ? ` • ${new Date(ev.starts_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })} ${new Date(ev.starts_at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`
                                  : ""}
                              </p>
                              {ev.location && <p className="text-xs text-gray-400 mt-0.5">{ev.location}</p>}
                            </div>
                            {ev.season && <span className="text-xs text-gray-400 shrink-0">{ev.season}</span>}
                          </div>
                        </div>
                      );
                    })}
                    {data.events.length === 0 && (
                      <p className="text-sm text-gray-500 py-2">No events scheduled for your teams yet.</p>
                    )}
                  </div>
                </CollapsibleSection>
              )}

              {selectedProspect && (
                <CollapsibleSection title={`Workspace — ${selectedProspect.first_name} ${selectedProspect.last_name}`}>
                  <div className="space-y-4 pt-2">
                    <div className="rounded-md border border-gray-200 p-3 text-sm">
                      <p className="font-semibold text-gray-900">{selectedProspect.first_name} {selectedProspect.last_name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">DOB: {selectedProspect.date_of_birth ?? "N/A"} • Source: {selectedProspect.recruiting_source ?? "N/A"}</p>
                      <p className="text-xs text-gray-500">Parent: {selectedProspect.parent_name ?? "N/A"} • {selectedProspect.parent_email ?? "no email"}</p>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-800">Status Transition</p>
                      <Select value={statusChange.newStatus || "none"} onValueChange={(v) => setStatusChange((prev) => ({ ...prev, newStatus: v === "none" ? "" : v }))}>
                        <SelectTrigger><SelectValue placeholder="Select next status" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Select status</SelectItem>
                          {data.statuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder="Reason (optional)"
                        value={statusChange.reason}
                        onChange={(e) => setStatusChange((prev) => ({ ...prev, reason: e.target.value }))}
                      />
                      <Button size="sm" onClick={() => void changeStatus()} disabled={!statusChange.newStatus}>
                        Update Status
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-800">Add Evaluation</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label htmlFor="eval-event">Event</Label>
                          <Select value={newEval.eventId || "none"} onValueChange={(v) => setNewEval((prev) => ({ ...prev, eventId: v === "none" ? "" : v }))}>
                            <SelectTrigger id="eval-event"><SelectValue placeholder="Select event" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No event</SelectItem>
                              {data.events.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="eval-rating">Rating (1–5)</Label>
                          <Input id="eval-rating" placeholder="e.g. 4" value={newEval.rating} onChange={(e) => setNewEval((prev) => ({ ...prev, rating: e.target.value }))} />
                        </div>
                      </div>
                      <Input placeholder="Readiness" value={newEval.readiness} onChange={(e) => setNewEval((prev) => ({ ...prev, readiness: e.target.value }))} />
                      <Input placeholder="Strengths" value={newEval.strengths} onChange={(e) => setNewEval((prev) => ({ ...prev, strengths: e.target.value }))} />
                      <Input placeholder="Development Areas" value={newEval.developmentAreas} onChange={(e) => setNewEval((prev) => ({ ...prev, developmentAreas: e.target.value }))} />
                      <Input placeholder="Tags (comma separated)" value={newEval.tags} onChange={(e) => setNewEval((prev) => ({ ...prev, tags: e.target.value }))} />
                      <Input placeholder="Notes" value={newEval.notes} onChange={(e) => setNewEval((prev) => ({ ...prev, notes: e.target.value }))} />
                      <Button size="sm" onClick={() => void addEvaluation()}>
                        <ClipboardCheck className="h-4 w-4 mr-1" /> Save Evaluation
                      </Button>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-gray-800 mb-2">Recent Evaluations</p>
                      <div className="max-h-40 overflow-auto space-y-1">
                        {selectedProspectEvals.map((e) => (
                          <div key={e.id} className="rounded border border-gray-200 p-2 text-xs">
                            <p className="font-medium">Rating: {e.rating ?? "—"} • {e.readiness ?? "No readiness"}</p>
                            <p className="text-gray-500">{e.notes ?? "No notes"}</p>
                          </div>
                        ))}
                        {selectedProspectEvals.length === 0 && <p className="text-xs text-gray-500">No evaluations yet.</p>}
                      </div>
                    </div>

                    <div>
                      <Button size="sm" variant="outline" onClick={() => void convertToPlayer()}>
                        <UserPlus className="h-4 w-4 mr-1" /> Convert to Rostered Player
                      </Button>
                    </div>
                  </div>
                </CollapsibleSection>
              )}
            </>
          )}

          {/* ── INTAKE VIEW ── */}
          {activeView === "intake" && (
            <>
              <CollapsibleSection title="Manual Prospect Entry" defaultOpen={false}>
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <div className="space-y-1">
                    <Label htmlFor="prospect-first-name">First Name</Label>
                    <Input id="prospect-first-name" placeholder="First name" value={newProspect.firstName} onChange={(e) => setNewProspect((prev) => ({ ...prev, firstName: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="prospect-last-name">Last Name</Label>
                    <Input id="prospect-last-name" placeholder="Last name" value={newProspect.lastName} onChange={(e) => setNewProspect((prev) => ({ ...prev, lastName: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="prospect-dob">Date of Birth</Label>
                    <Input id="prospect-dob" type="date" value={newProspect.dateOfBirth} onChange={(e) => setNewProspect((prev) => ({ ...prev, dateOfBirth: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="prospect-gender">Gender</Label>
                    <Input id="prospect-gender" placeholder="e.g. coed" value={newProspect.gender} onChange={(e) => setNewProspect((prev) => ({ ...prev, gender: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="prospect-parent-name">Parent / Guardian Name</Label>
                    <Input id="prospect-parent-name" placeholder="Parent name" value={newProspect.parentName} onChange={(e) => setNewProspect((prev) => ({ ...prev, parentName: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="prospect-parent-email">Parent Email</Label>
                    <Input id="prospect-parent-email" placeholder="Email address" value={newProspect.parentEmail} onChange={(e) => setNewProspect((prev) => ({ ...prev, parentEmail: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="prospect-parent-phone">Parent Phone</Label>
                    <Input id="prospect-parent-phone" placeholder="Phone number" value={newProspect.parentPhone} onChange={(e) => setNewProspect((prev) => ({ ...prev, parentPhone: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="prospect-current-club">Current Club</Label>
                    <Input id="prospect-current-club" placeholder="Club name" value={newProspect.currentClub} onChange={(e) => setNewProspect((prev) => ({ ...prev, currentClub: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="prospect-current-team">Current Team</Label>
                    <Input id="prospect-current-team" placeholder="Team name" value={newProspect.currentTeam} onChange={(e) => setNewProspect((prev) => ({ ...prev, currentTeam: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="prospect-primary-position">Primary Position</Label>
                    <Input id="prospect-primary-position" placeholder="e.g. ST" value={newProspect.primaryPosition} onChange={(e) => setNewProspect((prev) => ({ ...prev, primaryPosition: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="prospect-secondary-position">Secondary Position</Label>
                    <Input id="prospect-secondary-position" placeholder="e.g. RW" value={newProspect.secondaryPosition} onChange={(e) => setNewProspect((prev) => ({ ...prev, secondaryPosition: e.target.value }))} />
                  </div>
                </div>
                <div className="pt-3">
                  <Button onClick={() => void createProspect()}>
                    <Plus className="h-4 w-4 mr-1" /> Add Prospect
                  </Button>
                </div>
              </CollapsibleSection>

              <CollapsibleSection title={`Events${data.events.length > 0 ? ` (${data.events.length})` : ""}`}>
                <div className="pt-2 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label htmlFor="event-name">Event Name</Label>
                      <Input id="event-name" placeholder="Event name" value={newEvent.name} onChange={(e) => setNewEvent((prev) => ({ ...prev, name: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="event-type">Event Type</Label>
                      <Select value={newEvent.eventType} onValueChange={(v) => setNewEvent((prev) => ({ ...prev, eventType: v }))}>
                        <SelectTrigger id="event-type"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="tryout">Tryout</SelectItem>
                          <SelectItem value="open_session">Open Session</SelectItem>
                          <SelectItem value="interest_form">Interest Form</SelectItem>
                          <SelectItem value="camp">Camp</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="event-season">Season</Label>
                      <Input id="event-season" placeholder="e.g. 2026-fall" value={newEvent.season} onChange={(e) => setNewEvent((prev) => ({ ...prev, season: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="event-team">Team</Label>
                      <Select value={newEvent.teamId || "none"} onValueChange={(v) => setNewEvent((prev) => ({ ...prev, teamId: v === "none" ? "" : v }))}>
                        <SelectTrigger id="event-team"><SelectValue placeholder="Select team" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No team</SelectItem>
                          {data.teams.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="event-gender">Gender</Label>
                      <Select value={newEvent.gender} onValueChange={(v) => setNewEvent((prev) => ({ ...prev, gender: v }))}>
                        <SelectTrigger id="event-gender"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="coed">Coed</SelectItem>
                          <SelectItem value="boys">Boys</SelectItem>
                          <SelectItem value="girls">Girls</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="event-field-space">Location (Field Space)</Label>
                      <Select value={newEvent.fieldSpaceId || "none"} onValueChange={(v) => setNewEvent((prev) => ({ ...prev, fieldSpaceId: v === "none" ? "" : v }))}>
                        <SelectTrigger id="event-field-space"><SelectValue placeholder="Select field space" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No location</SelectItem>
                          {data.fieldSpaces.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.complex_name ? `${s.complex_name} — ` : ""}{s.name}{s.field_type ? ` (${s.field_type})` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="event-start-date">Start Date</Label>
                      <Input id="event-start-date" type="date" value={newEvent.startDate} onChange={(e) => setNewEvent((prev) => ({ ...prev, startDate: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="event-start-time">Start Time</Label>
                      <Input id="event-start-time" type="time" value={newEvent.startTime} onChange={(e) => setNewEvent((prev) => ({ ...prev, startTime: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="event-duration">Duration (minutes)</Label>
                      <Input id="event-duration" type="number" min={15} max={720} step={15} placeholder="90" value={newEvent.durationMinutes} onChange={(e) => setNewEvent((prev) => ({ ...prev, durationMinutes: e.target.value }))} />
                    </div>
                  </div>
                  <Button size="sm" onClick={() => void createEvent()}>
                    <CalendarClock className="h-4 w-4 mr-1" /> Create Event
                  </Button>

                  {data.events.length > 0 && (
                    <div className="space-y-1 pt-2 border-t border-gray-100">
                      <p className="text-xs font-medium text-gray-500 pb-1">Existing Events</p>
                      <div className="space-y-1">
                        {data.events.map((ev) => (
                          <div key={ev.id} className="rounded border border-gray-200 p-2 text-xs">
                            {editingEventId === ev.id ? (
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <p className="font-medium text-gray-700 text-[11px]">Edit Event</p>
                                  <div className="flex gap-1">
                                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => void updateEvent(ev.id)}><Check className="h-3 w-3" /></Button>
                                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setEditingEventId(null)}><X className="h-3 w-3" /></Button>
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-1.5">
                                  <div className="space-y-0.5">
                                    <Label className="text-[10px]">Name</Label>
                                    <Input className="h-7 text-xs" value={editEventData.name} onChange={(e) => setEditEventData((p) => ({ ...p, name: e.target.value }))} />
                                  </div>
                                  <div className="space-y-0.5">
                                    <Label className="text-[10px]">Type</Label>
                                    <Select value={editEventData.eventType} onValueChange={(v) => setEditEventData((p) => ({ ...p, eventType: v }))}>
                                      <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="tryout">Tryout</SelectItem>
                                        <SelectItem value="open_session">Open Session</SelectItem>
                                        <SelectItem value="interest_form">Interest Form</SelectItem>
                                        <SelectItem value="camp">Camp</SelectItem>
                                        <SelectItem value="other">Other</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-0.5">
                                    <Label className="text-[10px]">Team</Label>
                                    <Select value={editEventData.teamId || "none"} onValueChange={(v) => setEditEventData((p) => ({ ...p, teamId: v === "none" ? "" : v }))}>
                                      <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="No team" /></SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="none">No team</SelectItem>
                                        {data.teams.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-0.5">
                                    <Label className="text-[10px]">Gender</Label>
                                    <Select value={editEventData.gender} onValueChange={(v) => setEditEventData((p) => ({ ...p, gender: v }))}>
                                      <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="coed">Coed</SelectItem>
                                        <SelectItem value="boys">Boys</SelectItem>
                                        <SelectItem value="girls">Girls</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-0.5">
                                    <Label className="text-[10px]">Location (Field Space)</Label>
                                    <Select value={editEventData.fieldSpaceId || "none"} onValueChange={(v) => setEditEventData((p) => ({ ...p, fieldSpaceId: v === "none" ? "" : v }))}>
                                      <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Keep existing" /></SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="none">Keep existing</SelectItem>
                                        {data.fieldSpaces.map((s) => (
                                          <SelectItem key={s.id} value={s.id}>{s.complex_name ? `${s.complex_name} \u2014 ` : ""}{s.name}{s.field_type ? ` (${s.field_type})` : ""}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-0.5">
                                    <Label className="text-[10px]">Season</Label>
                                    <Input className="h-7 text-xs" value={editEventData.season} onChange={(e) => setEditEventData((p) => ({ ...p, season: e.target.value }))} />
                                  </div>
                                  <div className="space-y-0.5">
                                    <Label className="text-[10px]">Start Date</Label>
                                    <Input type="date" className="h-7 text-xs" value={editEventData.startDate} onChange={(e) => setEditEventData((p) => ({ ...p, startDate: e.target.value }))} />
                                  </div>
                                  <div className="space-y-0.5">
                                    <Label className="text-[10px]">Start Time</Label>
                                    <Input type="time" className="h-7 text-xs" value={editEventData.startTime} onChange={(e) => setEditEventData((p) => ({ ...p, startTime: e.target.value }))} />
                                  </div>
                                  <div className="space-y-0.5">
                                    <Label className="text-[10px]">Duration (min)</Label>
                                    <Input type="number" min={15} max={720} step={15} className="h-7 text-xs" value={editEventData.durationMinutes} onChange={(e) => setEditEventData((p) => ({ ...p, durationMinutes: e.target.value }))} />
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-gray-900 truncate">{ev.name}</p>
                                  <p className="text-gray-500">{ev.event_type.replace("_", " ")}{ev.starts_at ? ` • ${new Date(ev.starts_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })} ${new Date(ev.starts_at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}` : ""}</p>
                                  {ev.location && <p className="text-gray-400 truncate">{ev.location}</p>}
                                </div>
                                <div className="flex gap-1 shrink-0">
                                  <Button
                                    size="sm" variant="ghost" className="h-7 w-7 p-0"
                                    onClick={() => {
                                      setEditingEventId(ev.id);
                                      setEditEventData({
                                        name: ev.name,
                                        eventType: ev.event_type,
                                        season: ev.season ?? "",
                                        gender: ev.gender ?? "coed",
                                        startDate: ev.starts_at ? ev.starts_at.slice(0, 10) : "",
                                        startTime: ev.starts_at ? ev.starts_at.slice(11, 16) : "",
                                        durationMinutes: ev.starts_at && ev.ends_at
                                          ? String(Math.round((new Date(ev.ends_at).getTime() - new Date(ev.starts_at).getTime()) / 60000))
                                          : "90",
                                        fieldSpaceId: "",
                                        teamId: ev.team_id ?? "",
                                        existingLocation: ev.location ?? "",
                                      });
                                    }}
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => void deleteEvent(ev.id, ev.name)}>
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CollapsibleSection>

              <CollapsibleSection title={`Registration Links${data.links.length > 0 ? ` (${data.links.length})` : ""}`}>
                <div className="pt-2 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label htmlFor="link-name">Link Name</Label>
                      <Input id="link-name" placeholder="Link name" value={newLink.name} onChange={(e) => setNewLink((prev) => ({ ...prev, name: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="link-event">Event</Label>
                      <Select value={newLink.eventId || "none"} onValueChange={(v) => setNewLink((prev) => ({ ...prev, eventId: v === "none" ? "" : v }))}>
                        <SelectTrigger id="link-event"><SelectValue placeholder="Select event" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No event</SelectItem>
                          {data.events.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="link-team">Team (optional)</Label>
                      <Select value={newLink.teamId || "none"} onValueChange={(v) => setNewLink((prev) => ({ ...prev, teamId: v === "none" ? "" : v }))}>
                        <SelectTrigger id="link-team"><SelectValue placeholder="Select team" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No team</SelectItem>
                          {data.teams.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div />
                    <div className="space-y-1">
                      <Label htmlFor="link-starts-on">Active From</Label>
                      <Input id="link-starts-on" type="date" value={newLink.startsOn} onChange={(e) => setNewLink((prev) => ({ ...prev, startsOn: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="link-ends-on">Active Until</Label>
                      <Input id="link-ends-on" type="date" value={newLink.endsOn} onChange={(e) => setNewLink((prev) => ({ ...prev, endsOn: e.target.value }))} />
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => void createRegistrationLink()}>
                    <LinkIcon className="h-4 w-4 mr-1" /> Create Public Link
                  </Button>

                  {data.links.length > 0 && (
                    <div className="space-y-1 pt-2 border-t border-gray-100">
                      <p className="text-xs font-medium text-gray-500 pb-1">Existing Links</p>
                      <div className="space-y-1">
                        {data.links.map((l) => (
                          <div key={l.id} className="rounded border border-gray-200 p-2 text-xs">
                            {editingLinkId === l.id ? (
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <p className="font-medium text-gray-900">{l.name}</p>
                                  <div className="flex gap-1">
                                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => void updateRegistrationLink(l.id)}><Check className="h-3 w-3" /></Button>
                                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => { setEditingLinkId(null); setEditLinkData({ startsOn: "", endsOn: "" }); }}><X className="h-3 w-3" /></Button>
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <Label className="text-[10px]">Active From</Label>
                                    <Input type="date" className="h-7 text-xs" value={editLinkData.startsOn} onChange={(e) => setEditLinkData((prev) => ({ ...prev, startsOn: e.target.value }))} />
                                  </div>
                                  <div>
                                    <Label className="text-[10px]">Active Until</Label>
                                    <Input type="date" className="h-7 text-xs" value={editLinkData.endsOn} onChange={(e) => setEditLinkData((prev) => ({ ...prev, endsOn: e.target.value }))} />
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-gray-900">{l.name}</p>
                                  <p className="text-gray-500">/{l.slug}</p>
                                  {(l.starts_on || l.ends_on) && (
                                    <p className="text-gray-500 mt-0.5">
                                      {l.starts_on ? new Date(l.starts_on).toLocaleDateString() : "No start"} — {l.ends_on ? new Date(l.ends_on).toLocaleDateString() : "No end"}
                                    </p>
                                  )}
                                </div>
                                <div className="flex gap-1 shrink-0">
                                  <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => { const link = `${externalLinkBase}/register/${l.slug}`; void navigator.clipboard.writeText(link); toast("success", "Registration link copied."); }}>Copy</Button>
                                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setEditingLinkId(l.id); setEditLinkData({ startsOn: l.starts_on || "", endsOn: l.ends_on || "" }); }}><Pencil className="h-3 w-3" /></Button>
                                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => void deleteRegistrationLink(l.id)}><Trash2 className="h-3 w-3" /></Button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {data.links.length === 0 && <p className="text-xs text-gray-500">No registration links yet.</p>}
                </div>
              </CollapsibleSection>

              <CollapsibleSection title="CSV Import" defaultOpen={false}>
                <div className="pt-2 space-y-3">
                  <p className="text-xs text-gray-500">Upload a CSV exported from Google Sheets / Drive and map columns to prospect fields.</p>
                  <Input type="file" accept=".csv,text/csv" onChange={(e) => { const file = e.target.files?.[0]; if (file) onCsvUpload(file); }} />
                  <div className="space-y-1">
                    <Label>Or paste CSV</Label>
                    <textarea
                      value={csvText}
                      onChange={(e) => setCsvText(e.target.value)}
                      className="w-full min-h-28 rounded-md border border-gray-200 p-2 text-xs"
                      placeholder={"first_name,last_name,parent_email\nArin,Vale,parent@example.com"}
                    />
                  </div>
                  {csvHeaders.length > 0 && (
                    <div className="space-y-2">
                      <Label>Field Mapping</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          "first_name", "last_name", "date_of_birth", "age_division", "gender",
                          "parent_name", "parent_email", "parent_phone", "current_club",
                          "primary_position", "status", "notes",
                        ].map((target) => (
                          <div key={target} className="grid grid-cols-2 gap-1 items-center">
                            <span className="text-[11px] text-gray-600">{target}</span>
                            <Select value={csvMapping[target] || "none"} onValueChange={(v) => setCsvMapping((prev) => ({ ...prev, [target]: v === "none" ? "" : v }))}>
                              <SelectTrigger className="h-8"><SelectValue placeholder="Column" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Ignore</SelectItem>
                                {csvHeaders.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                        ))}
                      </div>
                      {csvPreview.length > 0 && (
                        <div className="rounded border border-gray-200 p-2 overflow-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr>{csvHeaders.map((h) => <th key={h} className="text-left text-gray-500 font-medium pr-3">{h}</th>)}</tr>
                            </thead>
                            <tbody>
                              {csvPreview.map((row, i) => (
                                <tr key={i}>{csvHeaders.map((h, idx) => <td key={`${h}-${idx}`} className="pr-3 py-0.5 text-gray-700">{row[idx] ?? ""}</td>)}</tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                  <Button size="sm" onClick={() => void importCsvRecords()}>
                    <Upload className="h-4 w-4 mr-1" /> Import Applicants
                  </Button>
                </div>
              </CollapsibleSection>
            </>
          )}

          {/* ── PLANNING VIEW ── */}
          {activeView === "planning" && (
            <>
              <CollapsibleSection title="Plan Builder" defaultOpen={false}>
                <div className="pt-2 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label htmlFor="plan-team">Team</Label>
                      <Select value={newPlan.teamId || "none"} onValueChange={(v) => setNewPlan((prev) => ({ ...prev, teamId: v === "none" ? "" : v }))}>
                        <SelectTrigger id="plan-team"><SelectValue placeholder="Select team" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No team</SelectItem>
                          {data.teams.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="plan-age-division">Age Division</Label>
                      <Input id="plan-age-division" placeholder="e.g. U15" value={newPlan.ageDivision} onChange={(e) => setNewPlan((prev) => ({ ...prev, ageDivision: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="plan-target-size">Target Roster Size</Label>
                      <Input id="plan-target-size" placeholder="e.g. 18" value={newPlan.targetRosterSize} onChange={(e) => setNewPlan((prev) => ({ ...prev, targetRosterSize: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="plan-priority">Recruiting Priority</Label>
                      <Select value={newPlan.recruitingPriority} onValueChange={(v) => setNewPlan((prev) => ({ ...prev, recruitingPriority: v }))}>
                        <SelectTrigger id="plan-priority"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Input placeholder="Open positions (comma separated, e.g. ST, RW, CB)" value={newPlan.openPositions} onChange={(e) => setNewPlan((prev) => ({ ...prev, openPositions: e.target.value }))} />
                  <Input placeholder="Upcoming tryout dates (comma separated YYYY-MM-DD)" value={newPlan.upcomingDates} onChange={(e) => setNewPlan((prev) => ({ ...prev, upcomingDates: e.target.value }))} />
                  <Input placeholder="Plan notes" value={newPlan.notes} onChange={(e) => setNewPlan((prev) => ({ ...prev, notes: e.target.value }))} />
                  <Button onClick={() => void savePlan()}>
                    <Plus className="h-4 w-4 mr-1" /> Save Plan
                  </Button>
                </div>
              </CollapsibleSection>

              <CollapsibleSection title={`Current Plans${data.plans.length > 0 ? ` (${data.plans.length})` : ""}`}>
                <div className="space-y-2 pt-2">
                  {data.plans.map((p) => {
                    const team = data.teams.find((t) => t.id === p.team_id)?.name ?? "No team";
                    const pipelineCount = data.prospects.filter((prospect) =>
                      (p.team_id ? prospect.team_id === p.team_id : prospect.age_division === p.age_division) && !prospect.archived
                    ).length;
                    return (
                      <div key={p.id} className="rounded-md border border-gray-200 p-3 text-sm">
                        <p className="font-medium text-gray-900">{team} • {p.age_division ?? "Any age"}</p>
                        <p className="text-xs text-gray-500 mt-0.5">Priority: {p.recruiting_priority} • Target: {p.target_roster_size ?? "—"}</p>
                        <p className="text-xs text-gray-500">Open positions: {(p.open_positions ?? []).join(", ") || "None listed"}</p>
                        <p className="text-xs text-gray-500">Pipeline count: {pipelineCount}</p>
                        <p className="text-xs text-gray-500">Upcoming dates: {(p.upcoming_dates ?? []).join(", ") || "None"}</p>
                        {p.notes && <p className="text-xs text-gray-600 mt-1">{p.notes}</p>}
                      </div>
                    );
                  })}
                  {data.plans.length === 0 && <p className="text-sm text-gray-500">No recruiting plans yet.</p>}
                </div>
              </CollapsibleSection>
            </>
          )}

          {/* ── HISTORY VIEW ── */}
          {activeView === "history" && (
            <>
              <CollapsibleSection title={`Historical Applicants${data.prospects.length > 0 ? ` (${data.prospects.length})` : ""}`}>
                <div className="space-y-1.5 max-h-96 overflow-auto pt-2">
                  <p className="text-xs text-gray-500 pb-1">Use the archived filter to revisit prior prospects when roster needs change.</p>
                  {data.prospects.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className={`w-full text-left rounded-md border px-3 py-2 transition-colors ${selectedProspectId === p.id ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"}`}
                      onClick={() => setSelectedProspectId(p.id)}
                    >
                      <p className="text-sm font-medium text-gray-900">{p.first_name} {p.last_name}</p>
                      <p className="text-xs text-gray-500">{p.status} • {p.current_club ?? "No club"} • {p.primary_position ?? "No position"}</p>
                    </button>
                  ))}
                  {data.prospects.length === 0 && <p className="text-sm text-gray-500 py-2">No results. Try switching Record Scope to Archived in the Filters.</p>}
                </div>
              </CollapsibleSection>

              <CollapsibleSection title="Status Timeline">
                <div className="space-y-2 max-h-96 overflow-auto pt-2">
                  {selectedProspectHistory.map((h) => (
                    <div key={h.id} className="rounded-md border border-gray-200 p-2 text-xs">
                      <p className="font-medium text-gray-900">{h.previous_status ?? "(none)"} → {h.new_status}</p>
                      <p className="text-gray-500">{new Date(h.created_at).toLocaleString()}</p>
                      {h.change_reason && <p className="text-gray-600">{h.change_reason}</p>}
                    </div>
                  ))}
                  {selectedProspectHistory.length === 0 && (
                    <p className="text-sm text-gray-500 py-2">Select a prospect from the list above to view status progression.</p>
                  )}
                </div>
              </CollapsibleSection>
            </>
          )}

        </div>
      )}
    </div>
  );
}

