"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import type { TrainingContent, TrainingAssignment,Player, Team } from "@/types/database";

type ContentWithAssignments = TrainingContent & {
  assignmentCount?: number;
};

type AssignmentWithDetails = TrainingAssignment & {
  training_content?: {
    title: string;
    content_type: string;
    thumbnail_url: string | null;
    duration_minutes: number | null;
  };
  player?: {
    first_name: string;
    last_name: string;
  };
  team?: {
    name: string;
  };
};

export default function CoachTrainingClient() {
  const [content, setContent] = useState<ContentWithAssignments[]>([]);
  const [assignments, setAssignments] = useState<AssignmentWithDetails[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedContent, setSelectedContent] = useState<TrainingContent | null>(null);
  const [viewMode, setViewMode] = useState<"browse" | "assignments" | "coach-library">("browse");

  // Assignment form
  const [assignTo, setAssignTo] = useState<"player" | "team">("player");
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [assignmentNote, setAssignmentNote] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [isRequired, setIsRequired] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const filterPublished = true;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Load published content
      const contentRes = await fetch(
        `/api/app/training/content?is_published=${filterPublished}`
      );
      if (contentRes.ok) {
        const { content: contentData } = await contentRes.json();
        setContent(contentData);
      }

      // Load assignments
      const assignRes = await fetch("/api/app/training/assignments");
      if (assignRes.ok) {
        const { assignments: assignData } = await assignRes.json();
        setAssignments(assignData);
      }

      // Load players for assignment
      const playersRes = await fetch("/api/app/players");
      if (playersRes.ok) {
        const { players: playersData } = await playersRes.json();
        setPlayers(playersData || []);
      }

      // Load teams for assignment
      const teamsRes = await fetch("/api/app/teams");
      if (teamsRes.ok) {
        const { teams: teamsData } = await teamsRes.json();
        setTeams(teamsData || []);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  }, [filterPublished]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openAssignDialog = (item: TrainingContent) => {
    setSelectedContent(item);
    setAssignTo("player");
    setSelectedPlayerId("");
    setSelectedTeamId("");
    setAssignmentNote("");
    setDueDate("");
    setIsRequired(true);
    setAssignDialogOpen(true);
  };

  const handleAssign = async () => {
    if (!selectedContent) return;
    if (assignTo === "player" && !selectedPlayerId) {
      alert("Please select a player");
      return;
    }
    if (assignTo === "team" && !selectedTeamId) {
      alert("Please select a team");
      return;
    }

    try {
      const res = await fetch("/api/app/training/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content_id: selectedContent.id,
          player_id: assignTo === "player" ? selectedPlayerId : null,
          team_id: assignTo === "team" ? selectedTeamId : null,
          assignment_note: assignmentNote || null,
          due_date: dueDate || null,
          is_required: isRequired,
        }),
      });

      if (res.ok) {
        setAssignDialogOpen(false);
        loadData();
        alert("Assignment created successfully");
      } else {
        const error = await res.json();
        alert(error.error || "Failed to create assignment");
      }
    } catch (error) {
      console.error("Error creating assignment:", error);
      alert("Failed to create assignment");
    }
  };

  const handleDeleteAssignment = async (id: string) => {
    if (!confirm("Are you sure you want to delete this assignment?")) return;

    try {
      const res = await fetch(`/api/app/training/assignments/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        loadData();
      } else {
        alert("Failed to delete assignment");
      }
    } catch (error) {
      console.error("Error deleting assignment:", error);
      alert("Failed to delete assignment");
    }
  };

  // Filter content based on view mode and search
  const filteredContent = content.filter((item) => {
    if (viewMode === "coach-library" && item.audience !== "coach" && item.audience !== "both") {
      return false;
    }
    if (viewMode === "browse" && item.audience === "coach") {
      return false;
    }
    if (searchQuery && !item.title.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Training Center</h1>
      </div>

      {/* View Mode Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setViewMode("browse")}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            viewMode === "browse"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-600 hover:text-gray-900"
          }`}
        >
          Player Training Library
        </button>
        <button
          onClick={() => setViewMode("coach-library")}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            viewMode === "coach-library"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-600 hover:text-gray-900"
          }`}
        >
          Coach Education
        </button>
        <button
          onClick={() => setViewMode("assignments")}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            viewMode === "assignments"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-600 hover:text-gray-900"
          }`}
        >
          My Assignments ({assignments.length})
        </button>
      </div>

      {viewMode !== "assignments" && (
        <>
          {/* Search */}
          <Card className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Search</Label>
                <Input
                  placeholder="Search training content..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </Card>

          {/* Content Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredContent.map((item) => (
              <Card key={item.id} className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{item.title}</h3>
                    {item.description && (
                      <p className="text-sm text-gray-600 line-clamp-2">{item.description}</p>
                    )}
                  </div>
                  {item.thumbnail_url && (
                    <img
                      src={item.thumbnail_url}
                      alt={item.title}
                      className="w-16 h-16 object-cover rounded ml-2"
                    />
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{item.content_type}</Badge>
                  <Badge variant="outline">{item.audience}</Badge>
                  {item.is_featured && <Badge variant="default">Featured</Badge>}
                </div>

                {item.tags && item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {item.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="text-sm text-gray-500">
                  {item.duration_minutes && <span>{item.duration_minutes} min</span>}
                  {item.view_count > 0 && <span className="ml-2">• {item.view_count} views</span>}
                </div>

                {viewMode === "browse" && (
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" onClick={() => openAssignDialog(item)} className="flex-1">
                      Assign to Player/Team
                    </Button>
                  </div>
                )}
              </Card>
            ))}
          </div>

          {filteredContent.length === 0 && (
            <Card className="p-8 text-center text-gray-500">
              <p>No training content found.</p>
            </Card>
          )}
        </>
      )}

      {viewMode === "assignments" && (
        <div className="space-y-4">
          {assignments.length === 0 && (
            <Card className="p-8 text-center text-gray-500">
              <p>No assignments yet. Browse the training library to assign content to your players.</p>
            </Card>
          )}

          {assignments.map((assignment) => (
            <Card key={assignment.id} className="p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">
                    {assignment.training_content?.title || "Untitled"}
                  </h3>
                  <div className="text-sm text-gray-600 mt-1">
                    Assigned to:{" "}
                    {assignment.player
                      ? `${assignment.player.first_name} ${assignment.player.last_name}`
                      : assignment.team
                      ? assignment.team.name
                      : "Unknown"}
                  </div>
                  {assignment.assignment_note && (
                    <p className="text-sm text-gray-600 mt-2">{assignment.assignment_note}</p>
                  )}
                  <div className="flex gap-4 mt-2 text-sm">
                    <span className="text-gray-500">
                      Assigned: {new Date(assignment.assigned_at).toLocaleDateString()}
                    </span>
                    {assignment.due_date && (
                      <span
                        className={
                          new Date(assignment.due_date) < new Date()
                            ? "text-red-600 font-medium"
                            : "text-gray-500"
                        }
                      >
                        Due: {new Date(assignment.due_date).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-2 ml-4">
                  <Badge variant={assignment.is_required ? "default" : "secondary"}>
                    {assignment.is_required ? "Required" : "Recommended"}
                  </Badge>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDeleteAssignment(assignment.id)}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Assignment Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Assign Training Content</h2>

          {selectedContent && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold">{selectedContent.title}</h3>
              {selectedContent.description && (
                <p className="text-sm text-gray-600 mt-1">{selectedContent.description}</p>
              )}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <Label>Assign To</Label>
              <div className="flex gap-4 mt-2">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={assignTo === "player"}
                    onChange={() => setAssignTo("player")}
                  />
                  <span>Individual Player</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={assignTo === "team"}
                    onChange={() => setAssignTo("team")}
                  />
                  <span>Entire Team</span>
                </label>
              </div>
            </div>

            {assignTo === "player" && (
              <div>
                <Label>Select Player *</Label>
                <Select value={selectedPlayerId} onValueChange={setSelectedPlayerId}>
                  <option value="">Choose a player...</option>
                  {players.map((player) => (
                    <option key={player.id} value={player.id}>
                      {player.first_name} {player.last_name}
                    </option>
                  ))}
                </Select>
              </div>
            )}

            {assignTo === "team" && (
              <div>
                <Label>Select Team *</Label>
                <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                  <option value="">Choose a team...</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </Select>
              </div>
            )}

            <div>
              <Label>Note to Player (Optional)</Label>
              <textarea
                className="w-full border rounded-md p-2 min-h-[80px]"
                value={assignmentNote}
                onChange={(e) => setAssignmentNote(e.target.value)}
                placeholder="Add a message about why you're assigning this content..."
              />
            </div>

            <div>
              <Label>Due Date (Optional)</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>

            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isRequired}
                  onChange={(e) => setIsRequired(e.target.checked)}
                />
                <span>Required (unchecked = recommended)</span>
              </label>
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-4 border-t">
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssign}>Create Assignment</Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
