"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { 
  BookOpen, Video, FileText, Newspaper, Trophy, Target, 
  Clock, Calendar, AlertCircle, CheckCircle, Star,
  TrendingUp, Eye, Play, RotateCcw, User
} from "lucide-react";
import type { TrainingContent, TrainingAssignment, TrainingProgress } from "@/types/database";

type AssignmentWithContent = TrainingAssignment & {
  training_content?: {
    id: string;
    title: string;
    description: string | null;
    content_type: string;
    thumbnail_url: string | null;
    duration_minutes: number | null;
    category_id: string | null;
  };
};

type ProgressWithContent = TrainingProgress & {
  training_content?: {
    id: string;
    title: string;
    content_type: string;
    thumbnail_url: string | null;
    duration_minutes: number | null;
  };
};

type DashboardData = {
  assignments: AssignmentWithContent[];
  progress: ProgressWithContent[];
  recommended: TrainingContent[];
  stats: {
    totalAssignments: number;
    completedAssignments: number;
    overdueAssignments: number;
    completionRate: number;
  };
};

export default function PlayerTrainingClient() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedContent, setSelectedContent] = useState<TrainingContent | null>(null);
  const [currentProgress, setCurrentProgress] = useState<TrainingProgress | null>(null);
  const [viewMode, setViewMode] = useState<"assigned" | "browse" | "history">("assigned");

  // Rating state
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/app/training/dashboard");
      if (res.ok) {
        const data = await res.json();
        setDashboardData(data);
      }
    } catch (error) {
      console.error("Error loading dashboard:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const openContentViewer = async (contentId: string, content?: TrainingContent) => {
    try {
      // Load full content details
      const contentRes = await fetch(`/api/app/training/content/${contentId}`);
      if (contentRes.ok) {
        const { content: fullContent } = await contentRes.json();
        setSelectedContent(fullContent);
      } else if (content) {
        setSelectedContent(content);
      }

      // Load or create progress record
      const progressRes = await fetch(`/api/app/training/progress?content_id=${contentId}`);
      if (progressRes.ok) {
        const { progress } = await progressRes.json();
        const userProgress = progress.find((p: TrainingProgress) => p.content_id === contentId);
        if (userProgress) {
          setCurrentProgress(userProgress);
          setRating(userProgress.rating || 0);
          setFeedback(userProgress.feedback_text || "");
        } else {
          setCurrentProgress(null);
          setRating(0);
          setFeedback("");
        }
      }

      // Track view
      await fetch("/api/app/training/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content_id: contentId }),
      });

      setViewerOpen(true);
    } catch (error) {
      console.error("Error opening content:", error);
    }
  };

  const markComplete = async () => {
    if (!selectedContent) return;

    try {
      const res = await fetch("/api/app/training/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content_id: selectedContent.id,
          completion_percentage: 100,
          is_completed: true,
          rating: rating || null,
          feedback_text: feedback || null,
        }),
      });

      if (res.ok) {
        alert("Training marked as complete!");
        setViewerOpen(false);
        loadDashboard();
      }
    } catch (error) {
      console.error("Error marking complete:", error);
      alert("Failed to mark complete");
    }
  };

  const saveProgress = async (percentage: number) => {
    if (!selectedContent) return;

    try {
      await fetch("/api/app/training/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content_id: selectedContent.id,
          completion_percentage: percentage,
          is_completed: percentage >= 100,
        }),
      });
    } catch (error) {
      console.error("Error saving progress:", error);
    }
  };

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
          <Trophy className="h-12 w-12 text-blue-600 mx-auto mb-4 animate-pulse" />
          <div className="text-lg text-gray-600">Loading your training...</div>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <div className="text-lg text-red-600">Failed to load training dashboard</div>
        </div>
      </div>
    );
  }

  const { assignments, progress, recommended, stats } = dashboardData;

  // Find progress for each assignment
  const assignmentsWithProgress = assignments.map((assignment) => {
    const assignmentProgress = progress.find((p) => p.content_id === assignment.content_id);
    return { ...assignment, progress: assignmentProgress };
  });

  // Separate completed and pending
  const pendingAssignments = assignmentsWithProgress.filter((a) => !a.progress?.is_completed);
  const completedAssignments = assignmentsWithProgress.filter((a) => a.progress?.is_completed);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
      <div className="p-6 md:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-gradient-to-br from-green-500 to-blue-600 rounded-lg">
                <Trophy className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">My Training</h1>
            </div>
            <p className="text-gray-600">Track your progress and complete assignments</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-5 bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium opacity-90">Total</div>
                <div className="text-3xl font-bold mt-1">{stats.totalAssignments}</div>
              </div>
              <Target className="h-9 w-9 opacity-80" />
            </div>
          </Card>
          <Card className="p-5 bg-gradient-to-br from-green-500 to-green-600 text-white border-0 shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium opacity-90">Completed</div>
                <div className="text-3xl font-bold mt-1">{stats.completedAssignments}</div>
              </div>
              <CheckCircle className="h-9 w-9 opacity-80" />
            </div>
          </Card>
          <Card className="p-5 bg-gradient-to-br from-red-500 to-red-600 text-white border-0 shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium opacity-90">Overdue</div>
                <div className="text-3xl font-bold mt-1">{stats.overdueAssignments}</div>
              </div>
              <AlertCircle className="h-9 w-9 opacity-80" />
            </div>
          </Card>
          <Card className="p-5 bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium opacity-90">Rate</div>
                <div className="text-3xl font-bold mt-1">{stats.completionRate}%</div>
              </div>
              <TrendingUp className="h-9 w-9 opacity-80" />
            </div>
          </Card>
        </div>

        {/* View Mode Tabs */}
        <Card className="p-1 bg-white/80 backdrop-blur shadow-lg border-0">
          <div className="flex gap-1">
            <button
              onClick={() => setViewMode("assigned")}
              className={`flex-1 px-4 py-3 font-medium rounded-lg transition-all flex items-center justify-center gap-2 ${
                viewMode === "assigned"
                  ? "bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Target className="h-4 w-4" /> Assigned 
              <Badge className="ml-1">{pendingAssignments.length}</Badge>
            </button>
            <button
              onClick={() => setViewMode("browse")}
              className={`flex-1 px-4 py-3 font-medium rounded-lg transition-all flex items-center justify-center gap-2 ${
                viewMode === "browse"
                  ? "bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <BookOpen className="h-4 w-4" /> Browse 
              <Badge className="ml-1">{recommended.length}</Badge>
            </button>
            <button
              onClick={() => setViewMode("history")}
              className={`flex-1 px-4 py-3 font-medium rounded-lg transition-all flex items-center justify-center gap-2 ${
                viewMode === "history"
                  ? "bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <RotateCcw className="h-4 w-4" /> History 
              <Badge className="ml-1">{completedAssignments.length}</Badge>
            </button>
          </div>
        </Card>

        {/* Assigned Training */}
        {viewMode === "assigned" && (
          <div className="space-y-6">
            {pendingAssignments.length === 0 ? (
              <Card className="p-12 text-center border-2 border-dashed border-gray-300 bg-gray-50/50">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">All caught up!</h3>
                <p className="text-gray-600">No pending assignments. Great job!</p>
              </Card>
            ) : (
              pendingAssignments.map((assignment) => {
                const isOverdue =
                  assignment.due_date && new Date(assignment.due_date) < new Date();
                return (
                  <Card
                    key={assignment.id}
                    className={`overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all ${
                      isOverdue ? "ring-2 ring-red-500" : ""
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row">
                      {/* Thumbnail */}
                      <div className="relative w-full sm:w-48 h-48 flex-shrink-0">
                        {assignment.training_content?.thumbnail_url ? (
                          <img
                            src={assignment.training_content.thumbnail_url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-green-500 via-blue-500 to-purple-600 flex items-center justify-center">
                            <BookOpen className="h-16 w-16 text-white opacity-80" />
                          </div>
                        )}
                        {isOverdue && (
                          <div className="absolute top-2 left-2 px-2.5 py-1 bg-red-500 text-white rounded-full text-xs font-bold flex items-center gap-1 shadow-lg">
                            <AlertCircle className="h-3 w-3" /> Overdue
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 p-5">
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div className="flex-1">
                            <h3 className="font-bold text-xl text-gray-900 mb-2">
                              {assignment.training_content?.title || "Untitled"}
                            </h3>
                            <div className="flex flex-wrap gap-2 mb-3">
                              {assignment.is_required ? (
                                <Badge className="bg-red-500">
                                  <Star className="h-3 w-3 mr-1" /> Required
                                </Badge>
                              ) : (
                                <Badge variant="secondary">Recommended</Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        {assignment.training_content?.description && (
                          <p className="text-gray-700 mb-3 line-clamp-2">
                            {assignment.training_content.description}
                          </p>
                        )}

                        {assignment.assignment_note && (
                          <div className="mt-3 p-3 bg-blue-50 border-l-4 border-blue-500 rounded mb-3">
                            <p className="text-sm text-gray-800">
                              <span className="font-semibold flex items-center gap-1.5 mb-1">
                                <User className="h-4 w-4" /> Coach's Note:
                              </span>
                              {assignment.assignment_note}
                            </p>
                          </div>
                        )}

                        <div className="flex flex-wrap gap-4 mb-3 text-sm text-gray-600">
                          <span className="flex items-center gap-1.5">
                            <Calendar className="h-4 w-4" />
                            Assigned: {new Date(assignment.assigned_at).toLocaleDateString()}
                          </span>
                          {assignment.due_date && (
                            <span
                              className={`flex items-center gap-1.5 font-semibold ${
                                isOverdue ? "text-red-600" : "text-gray-700"
                              }`}
                            >
                              <Clock className="h-4 w-4" />
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

                        {assignment.progress && assignment.progress.completion_percentage > 0 && (
                          <div className="mb-4">
                            <div className="flex justify-between text-sm mb-2 font-medium">
                              <span className="text-gray-700">Progress</span>
                              <span className="text-blue-600">
                                {assignment.progress.completion_percentage}%
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                              <div
                                className="bg-gradient-to-r from-green-500 to-blue-600 h-3 rounded-full transition-all duration-500"
                                style={{
                                  width: `${assignment.progress.completion_percentage}%`,
                                }}
                              />
                            </div>
                          </div>
                        )}

                        <Button
                          onClick={() =>
                            openContentViewer(
                              assignment.content_id,
                              assignment.training_content as TrainingContent
                            )
                          }
                          className="gap-2 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
                        >
                          <Play className="h-4 w-4" /> Start Training
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        )}

        {/* Browse Library */}
        {viewMode === "browse" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recommended.map((item) => {
            const itemProgress = progress.find((p) => p.content_id === item.id);
            return (
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
                </div>

                {itemProgress && itemProgress.is_completed && (
                  <Badge variant="default" className="w-full text-center">
                    ✓ Completed
                  </Badge>
                )}

                <Button onClick={() => openContentViewer(item.id, item)} className="w-full">
                  {itemProgress?.is_completed ? "Review" : "Start"}
                </Button>
              </Card>
            );
          })}

          {recommended.length === 0 && (
            <Card className="col-span-full p-8 text-center text-gray-500">
              <p>No recommended content available at this time.</p>
            </Card>
          )}
        </div>
      )}

      {/* History */}
      {viewMode === "history" && (
        <div className="space-y-4">
          {completedAssignments.length === 0 && (
            <Card className="p-8 text-center text-gray-500">
              <p>No completed training yet. Keep it up!</p>
            </Card>
          )}

          {completedAssignments.map((assignment) => (
            <Card key={assignment.id} className="p-4 bg-green-50">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-lg">
                      {assignment.training_content?.title || "Untitled"}
                    </h3>
                    <Badge variant="default">✓ Completed</Badge>
                  </div>
                  {assignment.training_content?.description && (
                    <p className="text-sm text-gray-600 mt-1">
                      {assignment.training_content.description}
                    </p>
                  )}
                  <div className="flex gap-4 mt-2 text-sm text-gray-600">
                    <span>
                      Completed: {new Date(assignment.progress?.completed_at || "").toLocaleDateString()}
                    </span>
                    {assignment.progress?.rating && (
                      <span>Rating: {"⭐".repeat(assignment.progress.rating)}</span>
                    )}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    openContentViewer(
                      assignment.content_id,
                      assignment.training_content as TrainingContent
                    )
                  }
                >
                  Review
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Content Viewer Dialog */}
      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        {selectedContent && (
          <div className="space-y-4 max-h-[80vh] overflow-y-auto">
            <div>
              <h2 className="text-2xl font-bold">{selectedContent.title}</h2>
              {selectedContent.description && (
                <p className="text-gray-600 mt-2">{selectedContent.description}</p>
              )}
              <div className="flex gap-2 mt-2">
                <Badge variant="outline">{selectedContent.content_type}</Badge>
                {selectedContent.duration_minutes && (
                  <Badge variant="outline">{selectedContent.duration_minutes} min</Badge>
                )}
              </div>
            </div>

            {/* Video Player */}
            {selectedContent.video_url && (
              <div className="aspect-video bg-black rounded-lg overflow-hidden">
                <video
                  src={selectedContent.video_url}
                  controls
                  className="w-full h-full"
                  onTimeUpdate={(e) => {
                    const video = e.currentTarget;
                    const percent = (video.currentTime / video.duration) * 100;
                    if (percent > 0 && percent % 25 < 1) {
                      saveProgress(Math.floor(percent));
                    }
                  }}
                />
              </div>
            )}

            {/* Document Link */}
            {selectedContent.document_url && (
              <div className="p-4 bg-blue-50 rounded-lg">
                <a
                  href={selectedContent.document_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline font-medium"
                >
                  📄 Open Document
                </a>
              </div>
            )}

            {/* Content Body */}
            {selectedContent.content_body && (
              <div className="prose max-w-none">
                <div className="whitespace-pre-wrap">{selectedContent.content_body}</div>
              </div>
            )}

            {/* Rating & Feedback */}
            {!currentProgress?.is_completed && (
              <div className="space-y-4 pt-4 border-t">
                <div>
                  <h3 className="font-semibold mb-2">Rate this training</h3>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setRating(star)}
                        className={`text-3xl ${
                          star <= rating ? "text-yellow-500" : "text-gray-300"
                        }`}
                      >
                        ⭐
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Feedback (optional)</h3>
                  <textarea
                    className="w-full border rounded-md p-2 min-h-[80px]"
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="What did you think of this training?"
                  />
                </div>

                <Button onClick={markComplete} className="w-full">
                  Mark as Complete
                </Button>
              </div>
            )}

            {currentProgress?.is_completed && (
              <div className="p-4 bg-green-50 rounded-lg text-center">
                <p className="text-green-700 font-medium">✓ You completed this training</p>
                {currentProgress.rating && (
                  <p className="text-sm mt-1">Your rating: {"⭐".repeat(currentProgress.rating)}</p>
                )}
              </div>
            )}
          </div>
        )}
      </Dialog>
      </div>
    </div>
  );
}
