"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Loader2,
  Plus,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type ReviewSeason = "fall" | "spring";
type ReviewStatus = "draft" | "published" | "completed";
type RatingValue = "red" | "yellow" | "green";

type ReviewPeriod = {
  id: string;
  season: ReviewSeason;
  season_year: number;
  title: string;
  due_date: string;
  is_active: boolean;
};

type PlayerReviewRow = {
  id: string;
  first_name: string;
  last_name: string;
  team_assigned: string | null;
  age_division: string | null;
  status: string;
  review: {
    id: string;
    status: ReviewStatus;
    ratings: Record<string, RatingValue>;
    key_strengths: string;
    growth_areas: string;
    coach_notes: string;
    shared_at: string | null;
    published_at: string | null;
    accepted_by_user_id: string | null;
    updated_at: string;
    completed_at: string | null;
  } | null;
};

type ReviewsPayload = {
  canManagePeriods: boolean;
  periods: ReviewPeriod[];
  selectedPeriodId: string | null;
  dueAlert: { type: "overdue" | "due_soon"; message: string } | null;
  summary: {
    total: number;
    completed: number;
    incomplete: number;
  };
  players: PlayerReviewRow[];
};

type Criterion = {
  key: string;
  label: string;
  description: string;
};

const REVIEW_SECTIONS: Array<{ id: string; title: string; criteria: Criterion[] }> = [
  {
    id: "technical",
    title: "Technical",
    criteria: [
      { key: "technical_first_touch", label: "1st Touch Control", description: "Controls and receives the ball consistently." },
      { key: "technical_ball_mastery", label: "Ball Mastery", description: "Execution of foot skills and ball control." },
      { key: "technical_dribbling", label: "Dribbling", description: "Moves with control at speed under pressure." },
      { key: "technical_short_passing", label: "Short Passing", description: "Accurate passing with both feet." },
      { key: "technical_ball_striking", label: "Ball Striking", description: "Clean striking with laces and instep." },
      { key: "technical_aerial_control", label: "Aerial Ball Control", description: "Ability to control the ball in the air." },
      { key: "technical_shielding", label: "Shielding The Ball", description: "Protects possession under pressure." },
    ],
  },
  {
    id: "tactical",
    title: "Tactical",
    criteria: [
      { key: "tactical_1v1_attacking", label: "1v1 Attacking", description: "Dominant in 1v1 moments with the ball." },
      { key: "tactical_1v1_defending", label: "1v1 Defending", description: "Dominant in 1v1 moments without the ball." },
      { key: "tactical_small_sided", label: "Small Sided Scenarios", description: "Reads and reacts to small game situations." },
      { key: "tactical_positional", label: "Positional Play", description: "Understands role responsibilities on the field." },
      { key: "tactical_possession", label: "Possession", description: "Helps maintain team possession." },
      { key: "tactical_attack_transition", label: "Attacking Transition", description: "Reaction to team winning the ball." },
      { key: "tactical_def_transition", label: "Defensive Transition", description: "Reaction to team losing possession." },
    ],
  },
  {
    id: "psychological",
    title: "Psychological",
    criteria: [
      { key: "psych_decision_making", label: "Decision Making", description: "Makes quality choices in possession." },
      { key: "psych_coachability", label: "Coachability", description: "Listens, applies feedback, and adapts." },
      { key: "psych_work_ethic", label: "Work Ethic", description: "Consistent effort and commitment." },
    ],
  },
  {
    id: "physical",
    title: "Physical",
    criteria: [
      { key: "physical_footwork", label: "Footwork", description: "Movement efficiency and balance." },
      { key: "physical_speed", label: "Speed and Quickness", description: "Explosive movement and acceleration." },
      { key: "physical_strength", label: "Strength", description: "Body control and dueling strength." },
      { key: "physical_stamina", label: "Stamina Endurance", description: "Maintains output throughout session/game." },
    ],
  },
];

type ReviewFormState = {
  ratings: Record<string, RatingValue>;
  key_strengths: string;
  growth_areas: string;
  coach_notes: string;
};

const EMPTY_FORM: ReviewFormState = {
  ratings: {},
  key_strengths: "",
  growth_areas: "",
  coach_notes: "",
};

function formatIsoDate(date: string) {
  const d = new Date(date);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function statusBadge(status: ReviewStatus | null) {
  if (status === "completed") {
    return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">Completed</Badge>;
  }
  if (status === "published") {
    return <Badge className="bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100">Published</Badge>;
  }
  if (status === "draft") {
    return <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100">Draft</Badge>;
  }
  return <Badge variant="outline">Not started</Badge>;
}

export function ReviewsClient() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [canManagePeriods, setCanManagePeriods] = useState(false);
  const [periods, setPeriods] = useState<ReviewPeriod[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);
  const [players, setPlayers] = useState<PlayerReviewRow[]>([]);
  const [summary, setSummary] = useState({ total: 0, completed: 0, incomplete: 0 });
  const [dueAlert, setDueAlert] = useState<{ type: "overdue" | "due_soon"; message: string } | null>(null);

  const [reviewingPlayer, setReviewingPlayer] = useState<PlayerReviewRow | null>(null);
  const [reviewForm, setReviewForm] = useState<ReviewFormState>(EMPTY_FORM);

  const [createPeriodOpen, setCreatePeriodOpen] = useState(false);
  const [editPeriodOpen, setEditPeriodOpen] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<ReviewPeriod | null>(null);

  const [newPeriodSeason, setNewPeriodSeason] = useState<ReviewSeason>("fall");
  const [newPeriodYear, setNewPeriodYear] = useState(String(new Date().getFullYear()));
  const [newPeriodDueDate, setNewPeriodDueDate] = useState("");

  const [editTitle, setEditTitle] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);

  const load = useCallback(async (periodId?: string | null) => {
    setLoading(true);
    setError(null);
    try {
      const qs = periodId ? `?periodId=${encodeURIComponent(periodId)}` : "";
      const res = await fetch(`/api/app/reviews${qs}`);
      const json = (await res.json()) as ReviewsPayload & { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to load reviews");

      setCanManagePeriods(json.canManagePeriods);
      setPeriods(json.periods ?? []);
      setSelectedPeriodId(json.selectedPeriodId);
      setPlayers(json.players ?? []);
      setSummary(json.summary);
      setDueAlert(json.dueAlert);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load reviews");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedPeriod = useMemo(
    () => periods.find((p) => p.id === selectedPeriodId) ?? null,
    [periods, selectedPeriodId]
  );

  const openReview = (player: PlayerReviewRow) => {
    setReviewingPlayer(player);
    setReviewForm({
      ratings: player.review?.ratings ?? {},
      key_strengths: player.review?.key_strengths ?? "",
      growth_areas: player.review?.growth_areas ?? "",
      coach_notes: player.review?.coach_notes ?? "",
    });
  };

  const updateRating = (key: string, value: RatingValue) => {
    setReviewForm((prev) => ({ ...prev, ratings: { ...prev.ratings, [key]: value } }));
  };

  const persistDraftReview = async () => {
    if (!selectedPeriodId || !reviewingPlayer) return undefined;

    const res = await fetch("/api/app/reviews", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        review_period_id: selectedPeriodId,
        player_id: reviewingPlayer.id,
        ratings: reviewForm.ratings,
        key_strengths: reviewForm.key_strengths,
        growth_areas: reviewForm.growth_areas,
        coach_notes: reviewForm.coach_notes,
      }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Failed to save review");
    return json.review?.id as string | undefined;
  };

  const saveReview = async () => {
    if (!selectedPeriodId || !reviewingPlayer) return;
    setSaving(true);
    setError(null);
    try {
      await persistDraftReview();
      setReviewingPlayer(null);
      await load(selectedPeriodId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save review");
    } finally {
      setSaving(false);
    }
  };

  const publishReview = async () => {
    if (!selectedPeriodId || !reviewingPlayer) return;

    setSaving(true);
    setError(null);
    try {
      let reviewId = reviewingPlayer.review?.id;
      if (!reviewId) {
        reviewId = await persistDraftReview();
      }
      if (!reviewId) {
        throw new Error("Please save the review first before publishing.");
      }

      const res = await fetch(`/api/app/reviews/${reviewId}/publish`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to publish review");

      setReviewingPlayer(null);
      await load(selectedPeriodId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to publish review");
    } finally {
      setSaving(false);
    }
  };

  const createPeriod = async () => {
    setSaving(true);
    setError(null);
    try {
      const year = Number(newPeriodYear);
      const seasonLabel = newPeriodSeason === "fall" ? "Fall" : "Spring";
      const title = `${seasonLabel} ${year}`;
      const res = await fetch("/api/app/review-periods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          season: newPeriodSeason,
          season_year: year,
          due_date: newPeriodDueDate,
          title,
          is_active: true,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to create review period");
      setCreatePeriodOpen(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create review period");
    } finally {
      setSaving(false);
    }
  };

  const openEditPeriod = (period: ReviewPeriod) => {
    setEditingPeriod(period);
    setEditTitle(period.title);
    setEditDueDate(period.due_date);
    setEditIsActive(period.is_active);
    setEditPeriodOpen(true);
  };

  const updatePeriod = async () => {
    if (!editingPeriod) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/app/review-periods/${editingPeriod.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle,
          due_date: editDueDate,
          is_active: editIsActive,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to update review period");
      setEditPeriodOpen(false);
      setEditingPeriod(null);
      await load(selectedPeriodId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update review period");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Individual Development Plan Reviews</h1>
          <p className="mt-1 text-sm text-gray-500">
            Complete seasonal player reviews and prepare 1:1 development conversations.
          </p>
        </div>
        {canManagePeriods && (
          <Button onClick={() => setCreatePeriodOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Review Period
          </Button>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {dueAlert && (
        <div
          className={`mb-4 rounded-md border px-3 py-2 text-sm ${
            dueAlert.type === "overdue"
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-amber-200 bg-amber-50 text-amber-700"
          }`}
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            <span>{dueAlert.message}</span>
          </div>
        </div>
      )}

      <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="w-full max-w-sm">
          <Label htmlFor="period">Review Period</Label>
          <Select
            value={selectedPeriodId ?? "__none__"}
            onValueChange={(v) => {
              const next = v === "__none__" ? null : v;
              setSelectedPeriodId(next);
              void load(next);
            }}
          >
            <SelectTrigger id="period" className="mt-1">
              <SelectValue placeholder="Select review period" />
            </SelectTrigger>
            <SelectContent>
              {periods.length === 0 ? (
                <SelectItem value="__none__">No periods available</SelectItem>
              ) : (
                periods.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.title} (Due {formatIsoDate(p.due_date)})
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        {canManagePeriods && selectedPeriod && (
          <Button variant="outline" onClick={() => openEditPeriod(selectedPeriod)}>
            <CalendarClock className="mr-2 h-4 w-4" />
            Edit Period
          </Button>
        )}
      </div>

      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Players</CardDescription>
            <CardTitle className="text-2xl">{summary.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Completed Reviews</CardDescription>
            <CardTitle className="text-2xl text-emerald-600">{summary.completed}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Incomplete Reviews</CardDescription>
            <CardTitle className="text-2xl text-amber-600">{summary.incomplete}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {loading ? (
        <div className="rounded-xl border border-gray-200 bg-white py-16 flex items-center justify-center text-gray-500">
          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
          Loading reviews...
        </div>
      ) : players.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white py-16 flex flex-col items-center text-gray-500">
          <ClipboardList className="h-9 w-9 text-gray-300" />
          <p className="mt-3 text-sm font-medium">No players available for the selected review period.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="px-4 py-3 text-left">Player</th>
                  <th className="px-4 py-3 text-left">Team</th>
                  <th className="px-4 py-3 text-left">Division</th>
                  <th className="px-4 py-3 text-left">Review Status</th>
                  <th className="px-4 py-3 text-left">Last Update</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {players.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50/60">
                    <td className="px-4 py-3 font-medium text-gray-900">{p.first_name} {p.last_name}</td>
                    <td className="px-4 py-3 text-gray-600">{p.team_assigned ?? "-"}</td>
                    <td className="px-4 py-3 text-gray-600">{p.age_division ?? "-"}</td>
                    <td className="px-4 py-3">{statusBadge(p.review?.status ?? null)}</td>
                    <td className="px-4 py-3 text-gray-600">{p.review?.updated_at ? formatIsoDate(p.review.updated_at) : "-"}</td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" variant="outline" onClick={() => openReview(p)} disabled={!selectedPeriodId}>
                        {p.review?.status === "completed" ? "View" : p.review ? "Edit" : "Start"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={!!reviewingPlayer} onOpenChange={(open) => !open && setReviewingPlayer(null)}>
        <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {reviewingPlayer ? `IDP Review - ${reviewingPlayer.first_name} ${reviewingPlayer.last_name}` : "IDP Review"}
            </DialogTitle>
            <DialogDescription>
              Rate performance areas, then capture strengths and growth goals for the next season discussion.
            </DialogDescription>
          </DialogHeader>

          {reviewingPlayer?.review?.status === "published" && (
            <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">
              Published to player on {reviewingPlayer.review.published_at ? formatIsoDate(reviewingPlayer.review.published_at) : "-"}. Waiting for player acceptance.
            </div>
          )}

          {reviewingPlayer?.review?.status === "completed" && (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              Accepted by player on {reviewingPlayer.review.completed_at ? formatIsoDate(reviewingPlayer.review.completed_at) : "-"}.
            </div>
          )}

          <div className="space-y-6">
            {REVIEW_SECTIONS.map((section) => (
              <Card key={section.id}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base uppercase tracking-wide text-red-700">{section.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {section.criteria.map((criterion) => (
                    <div key={criterion.key} className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 border-b border-gray-100 pb-3 last:border-b-0">
                      <div>
                        <p className="font-medium text-gray-900">{criterion.label}</p>
                        <p className="text-xs text-gray-500">{criterion.description}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {(["red", "yellow", "green"] as const).map((value) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => updateRating(criterion.key, value)}
                            className={`h-8 w-8 rounded-full border-2 transition ${
                              reviewForm.ratings[criterion.key] === value
                                ? "border-gray-900"
                                : "border-gray-300"
                            } ${
                              value === "red"
                                ? "bg-red-500"
                                : value === "yellow"
                                  ? "bg-yellow-400"
                                  : "bg-green-500"
                            }`}
                            aria-label={`${criterion.label} ${value}`}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Development Summary</CardTitle>
                <CardDescription>Use bullet points for key strengths and growth priorities.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="strengths">Key Strengths</Label>
                  <textarea
                    id="strengths"
                    className="min-h-28 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={reviewForm.key_strengths}
                    onChange={(e) => setReviewForm((prev) => ({ ...prev, key_strengths: e.target.value }))}
                    placeholder="1. ..."
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="growth">Key Areas for Growth</Label>
                  <textarea
                    id="growth"
                    className="min-h-28 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={reviewForm.growth_areas}
                    onChange={(e) => setReviewForm((prev) => ({ ...prev, growth_areas: e.target.value }))}
                    placeholder="1. ..."
                  />
                </div>
                <div className="md:col-span-2 space-y-1">
                  <Label htmlFor="coach_notes">Coach Notes</Label>
                  <textarea
                    id="coach_notes"
                    className="min-h-24 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={reviewForm.coach_notes}
                    onChange={(e) => setReviewForm((prev) => ({ ...prev, coach_notes: e.target.value }))}
                    placeholder="Discussion points for player/family meeting..."
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewingPlayer(null)} disabled={saving}>Cancel</Button>
            <Button variant="outline" onClick={() => void saveReview()} disabled={saving || reviewingPlayer?.review?.status === "completed"}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Draft
            </Button>
            <Button onClick={() => void publishReview()} disabled={saving || reviewingPlayer?.review?.status === "completed"}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
              Publish to Player
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createPeriodOpen} onOpenChange={setCreatePeriodOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Review Period</DialogTitle>
            <DialogDescription>
              Define the season and due date coaches must complete player reviews by.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="season">Season</Label>
              <Select value={newPeriodSeason} onValueChange={(v) => setNewPeriodSeason(v as ReviewSeason)}>
                <SelectTrigger id="season">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fall">Fall</SelectItem>
                  <SelectItem value="spring">Spring</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="seasonYear">Season Year</Label>
              <Input id="seasonYear" value={newPeriodYear} onChange={(e) => setNewPeriodYear(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="due">Due Date</Label>
              <Input id="due" type="date" value={newPeriodDueDate} onChange={(e) => setNewPeriodDueDate(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreatePeriodOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={() => void createPeriod()} disabled={saving || !newPeriodDueDate}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editPeriodOpen} onOpenChange={setEditPeriodOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Review Period</DialogTitle>
            <DialogDescription>
              Update due date and period status for coach reminders.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="editTitle">Title</Label>
              <Input id="editTitle" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="editDue">Due Date</Label>
              <Input id="editDue" type="date" value={editDueDate} onChange={(e) => setEditDueDate(e.target.value)} />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={editIsActive}
                onChange={(e) => setEditIsActive(e.target.checked)}
              />
              Active period
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPeriodOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={() => void updatePeriod()} disabled={saving || !editDueDate || !editTitle.trim()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
