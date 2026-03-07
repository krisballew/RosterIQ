"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  Video,
  FileText,
  Newspaper,
  Search,
  FolderOpen,
  Play,
  Clock,
} from "lucide-react";
import type {
  TrainingContent,
  TrainingCategory,
} from "@/types/database";

const getContentIcon = (contentType: string) => {
  switch (contentType) {
    case "video":
      return <Video className="h-5 w-5" />;
    case "document":
      return <FileText className="h-5 w-5" />;
    case "article":
      return <Newspaper className="h-5 w-5" />;
    default:
      return <BookOpen className="h-5 w-5" />;
  }
};

interface EducationLibraryClientProps {
  initialContent: TrainingContent[];
  initialCategories: TrainingCategory[];
}

export function EducationLibraryClient({
  initialContent,
  initialCategories,
}: EducationLibraryClientProps) {
  const [content] = useState<TrainingContent[]>(initialContent);
  const [categories] = useState<TrainingCategory[]>(initialCategories);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [selectedItem, setSelectedItem] = useState<TrainingContent | null>(null);

  const filteredContent = useCallback(() => {
    return content.filter((item) => {
      const matchesSearch = item.title
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
        (item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);

      const matchesCategory =
        filterCategory === "all" || item.category_id === filterCategory;

      return matchesSearch && matchesCategory;
    });
  }, [content, searchTerm, filterCategory]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
      {/* Header */}
      <div className="mb-8">
        <div className="p-2 bg-gradient-to-br from-green-500 to-blue-600 rounded-lg w-fit mb-4">
          <BookOpen className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
          Educational Content
        </h1>
        <p className="text-gray-600 mt-2">
          Explore learning resources curated by your club
        </p>
      </div>

      {/* Search and Filter */}
      <Card className="p-4 mb-6 border-0 shadow-sm bg-white/50 backdrop-blur">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="search" className="text-sm font-medium text-gray-700 flex items-center gap-1.5 mb-1.5">
              <Search className="h-3.5 w-3.5" /> Search
            </Label>
            <Input
              id="search"
              placeholder="Search educational content..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label className="text-sm font-medium text-gray-700 flex items-center gap-1.5 mb-1.5">
              <FolderOpen className="h-3.5 w-3.5" /> Category
            </Label>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Content Grid */}
      {filteredContent().length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredContent().map((item) => (
            <Card
              key={item.id}
              className="overflow-hidden border-0 shadow-md hover:shadow-lg transition-shadow cursor-pointer group"
              onClick={() => setSelectedItem(item)}
            >
              {/* Thumbnail */}
              <div className="relative w-full h-48 bg-gray-200 overflow-hidden">
                {item.thumbnail_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.thumbnail_url}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-green-500 via-blue-500 to-purple-600 flex items-center justify-center">
                    {getContentIcon(item.content_type)}
                  </div>
                )}
                <div className="absolute top-3 right-3 flex gap-2">
                  {item.content_type === "video" && (
                    <Badge className="bg-red-500 hover:bg-red-600 flex items-center gap-1">
                      <Play className="h-3 w-3" /> Video
                    </Badge>
                  )}
                </div>
              </div>

              {/* Content Info */}
              <div className="p-4">
                <h3 className="font-bold text-lg text-gray-900 line-clamp-2 mb-2">
                  {item.title}
                </h3>

                <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                  {item.description || "No description available"}
                </p>

                <div className="flex items-center justify-between mb-3">
                  {item.duration_minutes && (
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="h-3.5 w-3.5" />
                      {item.duration_minutes} min
                    </div>
                  )}
                </div>

                {item.tags && item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {item.tags.slice(0, 2).map((tag, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedItem(item);
                  }}
                  className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
                >
                  View Content
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            No content available
          </h3>
          <p className="text-gray-500">
            Your club hasn&apos;t published any educational content yet.
          </p>
        </div>
      )}

      {/* Content Detail Dialog */}
      <Dialog open={selectedItem !== null} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedItem?.title}</DialogTitle>
            <DialogDescription>
              {selectedItem?.description}
            </DialogDescription>
          </DialogHeader>

          {selectedItem && (
            <div className="space-y-4">
              {/* Thumbnail */}
              {selectedItem.thumbnail_url && (
                <div className="w-full h-64 rounded-lg overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={selectedItem.thumbnail_url}
                    alt={selectedItem.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Content Type and Duration */}
              <div className="flex gap-3 flex-wrap">
                <Badge className="capitalize bg-blue-100 text-blue-800">
                  {selectedItem.content_type}
                </Badge>
                {selectedItem.duration_minutes && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {selectedItem.duration_minutes} minutes
                  </Badge>
                )}
              </div>

              {/* Content Body */}
              {selectedItem.content_body && (
                <div className="prose prose-sm max-w-none">
                  <div className="text-gray-700 whitespace-pre-wrap">
                    {selectedItem.content_body}
                  </div>
                </div>
              )}

              {/* Video URL */}
              {selectedItem.video_url && (
                <div>
                  <h4 className="font-semibold mb-2 text-gray-900">
                    Video Content
                  </h4>
                  <a
                    href={selectedItem.video_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
                  >
                    <Play className="h-4 w-4" />
                    Watch Video
                  </a>
                </div>
              )}

              {/* Document URL */}
              {selectedItem.document_url && (
                <div>
                  <h4 className="font-semibold mb-2 text-gray-900">
                    Document
                  </h4>
                  <a
                    href={selectedItem.document_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
                  >
                    <FileText className="h-4 w-4" />
                    View Document
                  </a>
                </div>
              )}

              {/* Tags */}
              {selectedItem.tags && selectedItem.tags.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2 text-gray-900">Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedItem.tags.map((tag, idx) => (
                      <Badge key={idx} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
