"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
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

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center">Loading your training...</div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="p-8">
        <div className="text-center text-red-600">Failed to load training dashboard</div>
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
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">My Training</h1>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-sm text-gray-600">Total Assignments</div>
          <div className="text-3xl font-bold mt-1">{stats.totalAssignments}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600">Completed</div>
          <div className="text-3xl font-bold mt-1 text-green-600">
            {stats.completedAssignments}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600">Overdue</div>
          <div className="text-3xl font-bold mt-1 text-red-600">{stats.overdueAssignments}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600">Completion Rate</div>
          <div className="text-3xl font-bold mt-1">{stats.completionRate}%</div>
        </Card>
      </div>

      {/* View Mode Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setViewMode("assigned")}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            viewMode === "assigned"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-600 hover:text-gray-900"
          }`}
        >
          Assigned Training ({pendingAssignments.length})
        </button>
        <button
          onClick={() => setViewMode("browse")}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            viewMode === "browse"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-600 hover:text-gray-900"
          }`}
        >
          Browse Library ({recommended.length})
        </button>
        <button
          onClick={() => setViewMode("history")}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            viewMode === "history"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-600 hover:text-gray-900"
          }`}
        >
          History ({completedAssignments.length})
        </button>
      </div>

      {/* Assigned Training */}
      {viewMode === "assigned" && (
        <div className="space-y-4">
          {pendingAssignments.length === 0 && (
            <Card className="p-8 text-center text-gray-500">
              <p>No pending assignments. Great job!</p>
            </Card>
          )}

          {pendingAssignments.map((assignment) => {
            const isOverdue =
              assignment.due_date && new Date(assignment.due_date) < new Date();
            return (
              <Card
                key={assignment.id}
                className={`p-4 ${isOverdue ? "border-red-300 bg-red-50" : ""}`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">
                        {assignment.training_content?.title || "Untitled"}
                      </h3>
                      {assignment.is_required ? (
                        <Badge variant="default">Required</Badge>
                      ) : (
                        <Badge variant="secondary">Recommended</Badge>
                      )}
                      {isOverdue && <Badge variant="destructive">Overdue</Badge>}
                    </div>
                    {assignment.training_content?.description && (
                      <p className="text-sm text-gray-600 mt-1">
                        {assignment.training_content.description}
                      </p>
                    )}
                    {assignment.assignment_note && (
                      <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
                        <span className="font-medium">Coach&apos;s Note: </span>
                        {assignment.assignment_note}
                      </div>
                    )}
                    <div className="flex gap-4 mt-2 text-sm text-gray-600">
                      <span>
                        Assigned: {new Date(assignment.assigned_at).toLocaleDateString()}
                      </span>
                      {assignment.due_date && (
                        <span className={isOverdue ? "text-red-600 font-medium" : ""}>
                          Due: {new Date(assignment.due_date).toLocaleDateString()}
                        </span>
                      )}
                      {assignment.training_content?.duration_minutes && (
                        <span>{assignment.training_content.duration_minutes} minutes</span>
                      )}
                    </div>
                    {assignment.progress && assignment.progress.completion_percentage > 0 && (
                      <div className="mt-2">
                        <div className="flex justify-between text-sm mb-1">
                          <span>Progress</span>
                          <span>{assignment.progress.completion_percentage}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${assignment.progress.completion_percentage}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="ml-4">
                    {assignment.training_content?.thumbnail_url && (
                      <img
                        src={assignment.training_content.thumbnail_url}
                        alt=""
                        className="w-24 h-24 object-cover rounded mb-2"
                      />
                    )}
                    <Button
                      onClick={() =>
                        openContentViewer(
                          assignment.content_id,
                          assignment.training_content as TrainingContent
                        )
                      }
                    >
                      Start Training
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
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
  );
}
