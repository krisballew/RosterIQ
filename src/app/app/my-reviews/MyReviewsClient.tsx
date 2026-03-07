"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  CheckCircle2,
  ClipboardList,
  AlertCircle,
  Star,
} from "lucide-react";

type ReviewPeriod = {
  id: string;
  season: "fall" | "spring";
  season_year: number;
  title: string;
  due_date: string;
  is_active: boolean;
};

type PlayerReview = {
  id: string;
  player_id: string;
  review_period_id: string;
  status: "draft" | "published" | "completed";
  ratings: Record<string, "red" | "yellow" | "green">;
  key_strengths: string | null;
  growth_areas: string | null;
  coach_notes: string | null;
  shared_at: string | null;
  published_at: string | null;
  accepted_by_user_id: string | null;
  created_at: string;
  updated_at: string;
};

type Player = {
  id: string;
  first_name: string;
  last_name: string;
  team_assigned: string | null;
  age_division: string | null;
  status: string;
};

interface MyReviewsClientProps {
  player: Player;
  periods: ReviewPeriod[];
  reviews: PlayerReview[];
}

const REVIEW_SECTIONS = [
  { id: "technical", title: "Technical" },
  { id: "tactical", title: "Tactical" },
  { id: "psychological", title: "Psychological" },
  { id: "physical", title: "Physical" },
];

const ratingColors = {
  green: "bg-green-100 text-green-800 border-green-300",
  yellow: "bg-yellow-100 text-yellow-800 border-yellow-300",
  red: "bg-red-100 text-red-800 border-red-300",
};

function getStatusBadge(status: string) {
  switch (status) {
    case "completed":
      return <Badge className="bg-green-500">Completed</Badge>;
    case "published":
      return <Badge className="bg-blue-500">Published</Badge>;
    case "draft":
      return <Badge className="bg-gray-500">Draft</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
}

export function MyReviewsClient({
  player,
  periods,
  reviews,
}: MyReviewsClientProps) {
  const [selectedReview, setSelectedReview] = useState<PlayerReview | null>(null);

  const reviewsByPeriod = new Map<string, PlayerReview>();
  reviews.forEach((review) => {
    reviewsByPeriod.set(review.review_period_id, review);
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <div className="mb-8">
        <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg w-fit mb-4">
          <ClipboardList className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900">My Reviews</h1>
        <p className="text-gray-600 mt-2">
          Coach feedback on your performance and development
        </p>
      </div>

      {/* Player Info Card */}
      <Card className="mb-6 border-0 shadow-md">
        <CardHeader>
          <CardTitle className="text-xl">
            {player.first_name} {player.last_name}
          </CardTitle>
          <CardDescription className="flex gap-3 mt-2">
            {player.age_division && (
              <Badge variant="outline">{player.age_division}</Badge>
            )}
            {player.team_assigned && (
              <Badge variant="outline">{player.team_assigned}</Badge>
            )}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Reviews List */}
      {periods.length > 0 ? (
        <div className="space-y-4">
          {periods.map((period) => {
            const review = reviewsByPeriod.get(period.id);
            const hasReview = !!review;

            return (
              <Card
                key={period.id}
                className={`border-0 shadow-md cursor-pointer transition-all hover:shadow-lg ${
                  hasReview ? "bg-white" : "bg-gray-50"
                }`}
                onClick={() => hasReview && setSelectedReview(review)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-lg text-gray-900">
                        {period.title}
                        {period.season && (
                          <span className="text-sm text-gray-500 ml-2">
                            ({period.season.charAt(0).toUpperCase() + period.season.slice(1)} {period.season_year})
                          </span>
                        )}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        Due: {new Date(period.due_date).toLocaleDateString()}
                      </p>
                    </div>
                    {hasReview ? (
                      getStatusBadge(review.status)
                    ) : (
                      <Badge variant="outline" className="text-gray-500">
                        No Review Yet
                      </Badge>
                    )}
                  </div>
                </CardHeader>

                {hasReview && review && (
                  <CardContent className="space-y-3">
                    {review.key_strengths && (
                      <div>
                        <h4 className="text-sm font-semibold text-green-700 mb-1">
                          ✓ Key Strengths
                        </h4>
                        <p className="text-sm text-gray-700">
                          {review.key_strengths}
                        </p>
                      </div>
                    )}

                    {review.growth_areas && (
                      <div>
                        <h4 className="text-sm font-semibold text-amber-700 mb-1">
                          ⚡ Areas for Growth
                        </h4>
                        <p className="text-sm text-gray-700">
                          {review.growth_areas}
                        </p>
                      </div>
                    )}

                    {Object.keys(review.ratings).length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900 mb-2">
                          Performance Ratings
                        </h4>
                        <div className="grid grid-cols-2 gap-2">
                          {Object.entries(review.ratings).slice(0, 4).map(([key, rating]) => (
                            <div
                              key={key}
                              className={`px-3 py-2 rounded text-xs font-medium border ${
                                ratingColors[rating]
                              }`}
                            >
                              {key.split("_")[1]?.replace(/_/g, " ")}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {review.status === "published" || review.status === "completed" ? (
                      <button className="text-sm text-blue-600 hover:text-blue-700 font-medium mt-3">
                        View Full Review →
                      </button>
                    ) : (
                      <p className="text-xs text-gray-500 italic">
                        Review not yet shared by coach
                      </p>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16">
          <AlertCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            No review periods available
          </h3>
          <p className="text-gray-500">
            Your club hasn&apos;t set up any review periods yet.
          </p>
        </div>
      )}

      {/* Review Detail Dialog */}
      <Dialog open={selectedReview !== null} onOpenChange={(open) => !open && setSelectedReview(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedReview && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl">Review Details</DialogTitle>
                <DialogDescription className="flex gap-2 mt-2">
                  {getStatusBadge(selectedReview.status)}
                  {selectedReview.published_at && (
                    <span className="text-xs text-gray-500">
                      Shared: {new Date(selectedReview.published_at).toLocaleDateString()}
                    </span>
                  )}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* Key Strengths */}
                {selectedReview.key_strengths && (
                  <div>
                    <h3 className="font-semibold text-green-700 mb-2 flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5" />
                      Key Strengths
                    </h3>
                    <p className="text-gray-700 bg-green-50 p-4 rounded-lg">
                      {selectedReview.key_strengths}
                    </p>
                  </div>
                )}

                {/* Growth Areas */}
                {selectedReview.growth_areas && (
                  <div>
                    <h3 className="font-semibold text-amber-700 mb-2 flex items-center gap-2">
                      <AlertCircle className="h-5 w-5" />
                      Areas for Growth
                    </h3>
                    <p className="text-gray-700 bg-amber-50 p-4 rounded-lg">
                      {selectedReview.growth_areas}
                    </p>
                  </div>
                )}

                {/* Performance Ratings */}
                {Object.keys(selectedReview.ratings).length > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Star className="h-5 w-5" />
                      Performance Ratings
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      {REVIEW_SECTIONS.map((section) => (
                        <div key={section.id} className="bg-gray-50 p-4 rounded-lg">
                          <h4 className="font-semibold text-gray-900 mb-2 text-sm">
                            {section.title}
                          </h4>
                          {/* Only show ratings for this section */}
                          <div className="space-y-1 text-xs">
                            {Object.entries(selectedReview.ratings)
                              .filter(([key]) => key.startsWith(section.id))
                              .map(([key, rating]) => (
                                <div
                                  key={key}
                                  className={`px-2 py-1 rounded border text-center font-medium ${
                                    ratingColors[rating]
                                  }`}
                                >
                                  {rating === "green" && "✓ Strong"}
                                  {rating === "yellow" && "⚠ Developing"}
                                  {rating === "red" && "✗ Needs Work"}
                                </div>
                              ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Coach Notes */}
                {selectedReview.coach_notes && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">
                      Coach&apos;s Notes
                    </h3>
                    <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                      <p className="text-gray-700 text-sm whitespace-pre-wrap">
                        {selectedReview.coach_notes}
                      </p>
                    </div>
                  </div>
                )}

                {selectedReview.status === "draft" && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">
                      This review is still being worked on by your coach and hasn&apos;t been shared yet.
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
