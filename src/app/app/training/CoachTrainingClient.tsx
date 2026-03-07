"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  BookOpen, Video, FileText, Newspaper, Users, User, 
  Star, Eye, Clock, UserPlus, Calendar, Send,
  GraduationCap, Target, ClipboardList, Search
} from "lucide-react";
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

  const getContentIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video className="h-5 w-5" />;
      case 'document': return <FileText className="h-5 w-5" />;
      case 'article': return <Newspaper className="h-5 w-5" />;
      case 'lesson': return <BookOpen className="h-5 w-5" />;
      default: return <FileText className="h-5 w-5" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <GraduationCap className="h-12 w-12 text-blue-600 mx-auto mb-4 animate-pulse" />
          <div className="text-lg text-gray-600">Loading training center...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="p-6 md:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                <GraduationCap className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Training Center</h1>
            </div>
            <p className="text-gray-600">Browse content and assign training to your players</p>
          </div>
        </div>

        {/* View Mode Tabs */}
        <Card className="p-1 bg-white/80 backdrop-blur shadow-lg border-0">
          <div className="flex gap-1">
            <button
              onClick={() => setViewMode("browse")}
              className={`flex-1 px-4 py-3 font-medium rounded-lg transition-all flex items-center justify-center gap-2 ${
                viewMode === "browse"
                  ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Target className="h-4 w-4" /> Player Training Library
            </button>
            <button
              onClick={() => setViewMode("coach-library")}
              className={`flex-1 px-4 py-3 font-medium rounded-lg transition-all flex items-center justify-center gap-2 ${
                viewMode === "coach-library"
                  ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <GraduationCap className="h-4 w-4" /> Coach Education
            </button>
            <button
              onClick={() => setViewMode("assignments")}
              className={`flex-1 px-4 py-3 font-medium rounded-lg transition-all flex items-center justify-center gap-2 ${
                viewMode === "assignments"
                  ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <ClipboardList className="h-4 w-4" /> My Assignments 
              <Badge className="ml-1">{assignments.length}</Badge>
            </button>
          </div>
        </Card>

        {viewMode !== "assignments" && (
          <>
            {/* Search */}
            <Card className="p-4 shadow-lg border-0 bg-white/80 backdrop-blur">
              <Label className="text-sm font-medium text-gray-700 flex items-center gap-1.5 mb-2">
                <Search className="h-4 w-4" /> Search Training Content
              </Label>
              <Input
                placeholder="Search training content..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </Card>

            {/* Content Grid */}
            {filteredContent.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredContent.map((item) => (
                  <Card key={item.id} className="group overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-300 bg-white">
                    {/* Thumbnail */}
                    <div className="relative h-40 overflow-hidden">
                      {item.thumbnail_url ? (
                        <img
                          src={item.thumbnail_url}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-600 flex items-center justify-center">
                          <div className="text-white text-5xl opacity-80">
                            {getContentIcon(item.content_type)}
                          </div>
                        </div>
                      )}
                      {item.is_featured && (
                        <div className="absolute top-2 right-2 px-2.5 py-1 bg-yellow-400 text-yellow-900 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg">
                          <Star className="h-3 w-3" /> Featured
                        </div>
                      )}
                    </div>

                    <div className="p-4 space-y-3">
                      <div>
                        <h3 className="font-bold text-lg text-gray-900 line-clamp-2 min-h-[3.5rem]">{item.title}</h3>
                        {item.description && (
                          <p className="text-sm text-gray-600 line-clamp-2 mt-1">{item.description}</p>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" className="gap-1">
                          {getContentIcon(item.content_type)}
                          <span className="capitalize">{item.content_type}</span>
                        </Badge>
                        <Badge variant="outline" className="gap-1">
                          {item.audience === 'both' ? <Users className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
                          <span className="capitalize">{item.audience}</span>
                        </Badge>
                      </div>

                      {item.tags && item.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {item.tags.slice(0, 2).map((tag) => (
                            <span key={tag} className="text-xs bg-purple-50 text-purple-700 px-2.5 py-1 rounded-full font-medium">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center gap-3 text-sm text-gray-500 pt-2 border-t">
                        {item.duration_minutes && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" /> {item.duration_minutes}m
                          </span>
                        )}
                        {item.view_count > 0 && (
                          <span className="flex items-center gap-1">
                            <Eye className="h-4 w-4" /> {item.view_count}
                          </span>
                        )}
                      </div>

                      {viewMode === "browse" && (
                        <Button 
                          onClick={() => openAssignDialog(item)} 
                          className="w-full gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                        >
                          <UserPlus className="h-4 w-4" /> Assign to Player/Team
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-12 text-center border-2 border-dashed border-gray-300 bg-gray-50/50">
                <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No content found</h3>
                <p className="text-gray-600">Try adjusting your search query</p>
              </Card>
            )}
          </>
        )}

      {viewMode === "assignments" && (
        <div className="space-y-4">
          {assignments.length === 0 ? (
            <Card className="p-12 text-center border-2 border-dashed border-gray-300 bg-gray-50/50">
              <ClipboardList className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No assignments yet</h3>
              <p className="text-gray-600 mb-4">Browse the training library to assign content to your players</p>
              <Button onClick={() => setViewMode("browse")} className="gap-2">
                <Target className="h-4 w-4" /> Browse Training Library
              </Button>
            </Card>
          ) : (
            assignments.map((assignment) => (
              <Card key={assignment.id} className="p-5 shadow-lg border-0 hover:shadow-xl transition-shadow bg-white">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-start gap-3 mb-2">
                      {assignment.training_content?.thumbnail_url ? (
                        <img 
                          src={assignment.training_content.thumbnail_url} 
                          alt="" 
                          className="w-16 h-16 object-cover rounded-lg shadow"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                          <BookOpen className="h-7 w-7 text-white" />
                        </div>
                      )}
                      <div className="flex-1">
                        <h3 className="font-bold text-lg text-gray-900">
                          {assignment.training_content?.title || "Untitled"}
                        </h3>
                        <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                          <Users className="h-4 w-4" />
                          <span>Assigned to: {
                            assignment.player
                              ? `${assignment.player.first_name} ${assignment.player.last_name}`
                              : assignment.team
                              ? assignment.team.name
                              : "Unknown"
                          }</span>
                        </div>
                      </div>
                    </div>
                    
                    {assignment.assignment_note && (
                      <div className="mt-3 p-3 bg-blue-50 border-l-4 border-blue-500 rounded">
                        <p className="text-sm text-gray-700">
                          <span className="font-semibold">Note:</span> {assignment.assignment_note}
                        </p>
                      </div>
                    )}
                    
                    <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-600">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-4 w-4" />
                        Assigned: {new Date(assignment.assigned_at).toLocaleDateString()}
                      </span>
                      {assignment.due_date && (
                        <span
                          className={`flex items-center gap-1.5 ${
                            new Date(assignment.due_date) < new Date()
                              ? "text-red-600 font-semibold"
                              : "text-gray-600"
                          }`}
                        >
                          <Calendar className="h-4 w-4" />
                          Due: {new Date(assignment.due_date).toLocaleDateString()}
                        </span>
                      )}
                      {assignment.training_content?.duration_minutes && (
                        <span className="flex items-center gap-1.5">
                          <Clock className="h-4 w-4" />
                          {assignment.training_content.duration_minutes}m
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <Badge 
                      variant={assignment.is_required ? "default" : "secondary"}
                      className="justify-center"
                    >
                      {assignment.is_required ? "Required" : "Recommended"}
                    </Badge>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteAssignment(assignment.id)}
                      className="gap-1.5"
                    >
                      <UserPlus className="h-4 w-4 rotate-45" /> Remove
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Assignment Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
              <Send className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-2xl font-bold">Assign Training Content</h2>
          </div>

          {selectedContent && (
            <Card className="p-4 bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200">
              <div className="flex items-center gap-1.5 text-blue-700 mb-2">
                <BookOpen className="h-4 w-4" />
                <span className="text-sm font-semibold">Content</span>
              </div>
              <h3 className="font-bold text-gray-900">{selectedContent.title}</h3>
              {selectedContent.description && (
                <p className="text-sm text-gray-700 mt-1">{selectedContent.description}</p>
              )}
            </Card>
          )}

          <div className="space-y-4">
            <div>
              <Label className="font-semibold text-gray-900 flex items-center gap-1.5">
                <Users className="h-4 w-4" /> Assign To
              </Label>
              <div className="flex gap-4 mt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={assignTo === "player"}
                    onChange={() => setAssignTo("player")}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="font-medium">Individual Player</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={assignTo === "team"}
                    onChange={() => setAssignTo("team")}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="font-medium">Entire Team</span>
                </label>
              </div>
            </div>

            {assignTo === "player" && (
              <div>
                <Label className="font-semibold flex items-center gap-1.5">
                  <User className="h-4 w-4" /> Select Player *
                </Label>
                <Select value={selectedPlayerId} onValueChange={setSelectedPlayerId}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Choose a player..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Choose a player...</SelectItem>
                    {players.map((player) => (
                      <SelectItem key={player.id} value={player.id}>
                        {player.first_name} {player.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {assignTo === "team" && (
              <div>
                <Label className="font-semibold flex items-center gap-1.5">
                  <Users className="h-4 w-4" /> Select Team *
                </Label>
                <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Choose a team..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Choose a team...</SelectItem>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label className="font-semibold">Note to Player (Optional)</Label>
              <textarea
                className="w-full border rounded-lg p-3 min-h-[90px] mt-1.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={assignmentNote}
                onChange={(e) => setAssignmentNote(e.target.value)}
                placeholder="Add a message about why you're assigning this content..."
              />
            </div>

            <div>
              <Label className="font-semibold flex items-center gap-1.5">
                <Calendar className="h-4 w-4" /> Due Date (Optional)
              </Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="mt-1.5"
              />
            </div>

            <div className="pt-2">
              <label className="flex items-center gap-2 cursor-pointer p-3 rounded-lg hover:bg-gray-50 transition-colors">
                <input
                  type="checkbox"
                  checked={isRequired}
                  onChange={(e) => setIsRequired(e.target.checked)}
                  className="w-4 h-4 text-blue-600"
                />
                <div>
                  <span className="font-semibold text-gray-900">Required</span>
                  <p className="text-sm text-gray-600">Uncheck to mark as recommended instead</p>
                </div>
              </label>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssign} className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
              <Send className="h-4 w-4" /> Create Assignment
            </Button>
          </div>
        </div>
      </Dialog>
      </div>
    </div>
  );
}
