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
  Star, Eye, Clock, Edit, Trash2, Plus, Search,
  FolderOpen, Tag, TrendingUp, Filter
} from "lucide-react";
import type {
  TrainingContent,
  TrainingCategory,
  TrainingContentType,
  TrainingAudience,
  AgeDivision,
  GenderFilter,
  SkillLevel,
} from "@/types/database";

type ContentWithCategory = TrainingContent & {
  category?: TrainingCategory | null;
};

const CONTENT_TYPES: TrainingContentType[] = ["video", "document", "lesson", "article"];
const AUDIENCES: TrainingAudience[] = ["player", "coach", "both"];
const AGE_DIVISIONS: AgeDivision[] = [
  "U6",
  "U7",
  "U8",
  "U9",
  "U10",
  "U11",
  "U12",
  "U13",
  "U14",
  "U15",
  "U16",
  "U17",
  "U18",
  "U19",
];
const GENDER_FILTERS: GenderFilter[] = ["boys", "girls", "both"];
const SKILL_LEVELS: SkillLevel[] = ["beginner", "intermediate", "advanced", "all"];

export default function TrainingLibraryClient() {
  const [content, setContent] = useState<ContentWithCategory[]>([]);
  const [categories, setCategories] = useState<TrainingCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingContent, setEditingContent] = useState<TrainingContent | null>(null);
  const [editingCategory, setEditingCategory] = useState<TrainingCategory | null>(null);

  // Filters
  const [filterAudience, setFilterAudience] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterPublished, setFilterPublished] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    content_type: "video" as TrainingContentType,
    audience: "player" as TrainingAudience,
    min_age_division: null as AgeDivision | null,
    max_age_division: null as AgeDivision | null,
    gender_filter: null as GenderFilter | null,
    skill_level: null as SkillLevel | null,
    video_url: "",
    document_url: "",
    thumbnail_url: "",
    duration_minutes: null as number | null,
    content_body: "",
    category_id: null as string | null,
    tags: [] as string[],
    is_published: false,
    is_featured: false,
  });

  const [categoryFormData, setCategoryFormData] = useState({
    name: "",
    description: "",
    parent_category_id: null as string | null,
    sort_order: 0,
  });

  const [tagInput, setTagInput] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Load content
      const contentRes = await fetch("/api/app/training/content");
      if (contentRes.ok) {
        const { content: contentData } = await contentRes.json();
        setContent(contentData);
      }

      // Load categories
      const catRes = await fetch("/api/app/training/categories");
      if (catRes.ok) {
        const { categories: catData } = await catRes.json();
        setCategories(catData);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openContentDialog = (item?: TrainingContent) => {
    if (item) {
      setEditingContent(item);
      setFormData({
        title: item.title,
        description: item.description || "",
        content_type: item.content_type,
        audience: item.audience,
        min_age_division: item.min_age_division,
        max_age_division: item.max_age_division,
        gender_filter: item.gender_filter,
        skill_level: item.skill_level,
        video_url: item.video_url || "",
        document_url: item.document_url || "",
        thumbnail_url: item.thumbnail_url || "",
        duration_minutes: item.duration_minutes,
        content_body: item.content_body || "",
        category_id: item.category_id,
        tags: item.tags || [],
        is_published: item.is_published,
        is_featured: item.is_featured,
      });
    } else {
      setEditingContent(null);
      setFormData({
        title: "",
        description: "",
        content_type: "video",
        audience: "player",
        min_age_division: null,
        max_age_division: null,
        gender_filter: null,
        skill_level: null,
        video_url: "",
        document_url: "",
        thumbnail_url: "",
        duration_minutes: null,
        content_body: "",
        category_id: null,
        tags: [],
        is_published: false,
        is_featured: false,
      });
    }
    setDialogOpen(true);
  };

  const openCategoryDialog = (category?: TrainingCategory) => {
    if (category) {
      setEditingCategory(category);
      setCategoryFormData({
        name: category.name,
        description: category.description || "",
        parent_category_id: category.parent_category_id,
        sort_order: category.sort_order,
      });
    } else {
      setEditingCategory(null);
      setCategoryFormData({
        name: "",
        description: "",
        parent_category_id: null,
        sort_order: categories.length,
      });
    }
    setCategoryDialogOpen(true);
  };

  const handleSaveContent = async () => {
    try {
      const url = editingContent
        ? `/api/app/training/content/${editingContent.id}`
        : "/api/app/training/content";
      const method = editingContent ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setDialogOpen(false);
        loadData();
      } else {
        const error = await res.json();
        alert(error.error || "Failed to save content");
      }
    } catch (error) {
      console.error("Error saving content:", error);
      alert("Failed to save content");
    }
  };

  const handleDeleteContent = async (id: string) => {
    if (!confirm("Are you sure you want to delete this content?")) return;

    try {
      const res = await fetch(`/api/app/training/content/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        loadData();
      } else {
        alert("Failed to delete content");
      }
    } catch (error) {
      console.error("Error deleting content:", error);
      alert("Failed to delete content");
    }
  };

  const handleSaveCategory = async () => {
    try {
      const url = editingCategory
        ? `/api/app/training/categories/${editingCategory.id}`
        : "/api/app/training/categories";
      const method = editingCategory ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(categoryFormData),
      });

      if (res.ok) {
        setCategoryDialogOpen(false);
        loadData();
      } else {
        const error = await res.json();
        alert(error.error || "Failed to save category");
      }
    } catch (error) {
      console.error("Error saving category:", error);
      alert("Failed to save category");
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm("Are you sure you want to delete this category?")) return;

    try {
      const res = await fetch(`/api/app/training/categories/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        loadData();
      } else {
        alert("Failed to delete category");
      }
    } catch (error) {
      console.error("Error deleting category:", error);
      alert("Failed to delete category");
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({ ...formData, tags: [...formData.tags, tagInput.trim()] });
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    setFormData({ ...formData, tags: formData.tags.filter((t) => t !== tag) });
  };

  // Filter content
  const filteredContent = content.filter((item) => {
    if (filterAudience !== "all" && item.audience !== filterAudience && item.audience !== "both") {
      return false;
    }
    if (filterCategory !== "all" && item.category_id !== filterCategory) {
      return false;
    }
    if (filterPublished === "published" && !item.is_published) {
      return false;
    }
    if (filterPublished === "draft" && item.is_published) {
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

  const stats = {
    total: content.length,
    published: content.filter(c => c.is_published).length,
    draft: content.filter(c => !c.is_published).length,
    featured: content.filter(c => c.is_featured).length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <BookOpen className="h-12 w-12 text-blue-600 mx-auto mb-4 animate-pulse" />
          <div className="text-lg text-gray-600">Loading training library...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="p-6 md:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
                <BookOpen className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Training Library</h1>
            </div>
            <p className="text-gray-600">Manage training content and categories</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => openCategoryDialog()} variant="outline" className="gap-2">
              <FolderOpen className="h-4 w-4" /> Add Category
            </Button>
            <Button onClick={() => openContentDialog()} className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
              <Plus className="h-4 w-4" /> Add Content
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium opacity-90">Total Content</div>
                <div className="text-2xl font-bold mt-1">{stats.total}</div>
              </div>
              <BookOpen className="h-8 w-8 opacity-80" />
            </div>
          </Card>
          <Card className="p-4 bg-gradient-to-br from-green-500 to-green-600 text-white border-0 shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium opacity-90">Published</div>
                <div className="text-2xl font-bold mt-1">{stats.published}</div>
              </div>
              <TrendingUp className="h-8 w-8 opacity-80" />
            </div>
          </Card>
          <Card className="p-4 bg-gradient-to-br from-amber-500 to-amber-600 text-white border-0 shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium opacity-90">Drafts</div>
                <div className="text-2xl font-bold mt-1">{stats.draft}</div>
              </div>
              <Edit className="h-8 w-8 opacity-80" />
            </div>
          </Card>
          <Card className="p-4 bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium opacity-90">Featured</div>
                <div className="text-2xl font-bold mt-1">{stats.featured}</div>
              </div>
              <Star className="h-8 w-8 opacity-80" />
            </div>
          </Card>
        </div>

        {/* Categories Section */}
        <Card className="p-6 shadow-lg border-0 bg-white/80 backdrop-blur">
          <div className="flex items-center gap-2 mb-4">
            <FolderOpen className="h-5 w-5 text-indigo-600" />
            <h2 className="text-xl font-semibold">Categories</h2>
          </div>
          {categories.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <div key={cat.id} className="group flex items-center gap-2 bg-gradient-to-r from-indigo-50 to-blue-50 hover:from-indigo-100 hover:to-blue-100 border border-indigo-200 rounded-lg px-4 py-2 transition-all hover:shadow-md">
                  <FolderOpen className="h-4 w-4 text-indigo-600" />
                  <span className="font-medium text-gray-900">{cat.name}</span>
                  <button
                    onClick={() => openCategoryDialog(cat)}
                    className="opacity-0 group-hover:opacity-100 text-indigo-600 hover:text-indigo-700 text-sm ml-1 transition-opacity"
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteCategory(cat.id)}
                    className="opacity-0 group-hover:opacity-100 text-red-600 hover:text-red-700 text-sm transition-opacity"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <FolderOpen className="h-10 w-10 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 font-medium">No categories yet</p>
              <p className="text-sm text-gray-500 mt-1">Create one to organize your content</p>
            </div>
          )}
        </Card>

        {/* Filters */}
        <Card className="p-6 shadow-lg border-0 bg-white/80 backdrop-blur">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-5 w-5 text-indigo-600" />
            <h2 className="text-lg font-semibold">Filters</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                <Search className="h-3.5 w-3.5" /> Search
              </Label>
              <Input
                placeholder="Search content..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" /> Audience
              </Label>
              <Select value={filterAudience} onValueChange={setFilterAudience}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="player">Players</SelectItem>
                  <SelectItem value="coach">Coaches</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
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
            <div>
              <Label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5" /> Status
              </Label>
              <Select value={filterPublished} onValueChange={setFilterPublished}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Content Grid */}
        {filteredContent.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredContent.map((item) => (
              <Card key={item.id} className="group overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-300 bg-white">
                {/* Thumbnail or Gradient Header */}
                <div className="relative h-48 overflow-hidden">
                  {item.thumbnail_url ? (
                    <img
                      src={item.thumbnail_url}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 flex items-center justify-center">
                      <div className="text-white text-6xl opacity-80">
                        {getContentIcon(item.content_type)}
                      </div>
                    </div>
                  )}
                  {/* Overlay badges */}
                  <div className="absolute top-3 right-3 flex flex-col gap-2">
                    {item.is_featured && (
                      <div className="px-2.5 py-1 bg-yellow-400 text-yellow-900 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg">
                        <Star className="h-3 w-3" /> Featured
                      </div>
                    )}
                    {item.is_published ? (
                      <div className="px-2.5 py-1 bg-green-500 text-white rounded-full text-xs font-bold shadow-lg">
                        Published
                      </div>
                    ) : (
                      <div className="px-2.5 py-1 bg-gray-500 text-white rounded-full text-xs font-bold shadow-lg">
                        Draft
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-5 space-y-3">
                  <div>
                    <h3 className="font-bold text-lg text-gray-900 line-clamp-2 min-h-[3.5rem]">{item.title}</h3>
                    {item.description && (
                      <p className="text-sm text-gray-600 line-clamp-2 mt-2">{item.description}</p>
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
                      {item.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
                          <Tag className="h-3 w-3" />{tag}
                        </span>
                      ))}
                      {item.tags.length > 3 && (
                        <span className="text-xs text-gray-500 px-2 py-1">+{item.tags.length - 3}</span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-4 text-sm text-gray-500 pt-2 border-t">
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

                  <div className="flex gap-2 pt-3">
                    <Button size="sm" onClick={() => openContentDialog(item)} className="flex-1 gap-1.5">
                      <Edit className="h-4 w-4" /> Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteContent(item.id)}
                      className="gap-1.5"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center border-2 border-dashed border-gray-300 bg-gray-50/50">
            <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No content found</h3>
            <p className="text-gray-600 mb-4">Add your first training content to get started</p>
            <Button onClick={() => openContentDialog()} className="gap-2">
              <Plus className="h-4 w-4" /> Add Content
            </Button>
          </Card>
        )}

      {/* Content Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">
            {editingContent ? "Edit Content" : "Add Content"}
          </h2>

          <div className="grid grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto p-1">
            <div className="col-span-2">
              <Label>Title *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Content title"
              />
            </div>

            <div className="col-span-2">
              <Label>Description</Label>
              <textarea
                className="w-full border rounded-md p-2 min-h-[60px]"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description"
              />
            </div>

            <div>
              <Label>Content Type *</Label>
              <Select
                value={formData.content_type}
                onValueChange={(value) =>
                  setFormData({ ...formData, content_type: value as TrainingContentType })
                }
              >
                {CONTENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Label>Audience *</Label>
              <Select
                value={formData.audience}
                onValueChange={(value) =>
                  setFormData({ ...formData, audience: value as TrainingAudience })
                }
              >
                {AUDIENCES.map((aud) => (
                  <option key={aud} value={aud}>
                    {aud.charAt(0).toUpperCase() + aud.slice(1)}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Label>Min Age Division</Label>
              <Select
                value={formData.min_age_division || ""}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    min_age_division: (value as AgeDivision) || null,
                  })
                }
              >
                <option value="">None</option>
                {AGE_DIVISIONS.map((age) => (
                  <option key={age} value={age}>
                    {age}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Label>Max Age Division</Label>
              <Select
                value={formData.max_age_division || ""}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    max_age_division: (value as AgeDivision) || null,
                  })
                }
              >
                <option value="">None</option>
                {AGE_DIVISIONS.map((age) => (
                  <option key={age} value={age}>
                    {age}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Label>Gender Filter</Label>
              <Select
                value={formData.gender_filter || ""}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    gender_filter: (value as GenderFilter) || null,
                  })
                }
              >
                <option value="">None</option>
                {GENDER_FILTERS.map((gender) => (
                  <option key={gender} value={gender}>
                    {gender.charAt(0).toUpperCase() + gender.slice(1)}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Label>Skill Level</Label>
              <Select
                value={formData.skill_level || ""}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    skill_level: (value as SkillLevel) || null,
                  })
                }
              >
                <option value="">None</option>
                {SKILL_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Label>Category</Label>
              <Select
                value={formData.category_id || ""}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    category_id: value || null,
                  })
                }
              >
                <option value="">None</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Label>Duration (minutes)</Label>
              <Input
                type="number"
                value={formData.duration_minutes || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    duration_minutes: e.target.value ? parseInt(e.target.value) : null,
                  })
                }
              />
            </div>

            <div className="col-span-2">
              <Label>Video URL</Label>
              <Input
                value={formData.video_url}
                onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                placeholder="https://..."
              />
            </div>

            <div className="col-span-2">
              <Label>Document URL</Label>
              <Input
                value={formData.document_url}
                onChange={(e) => setFormData({ ...formData, document_url: e.target.value })}
                placeholder="https://..."
              />
            </div>

            <div className="col-span-2">
              <Label>Thumbnail URL</Label>
              <Input
                value={formData.thumbnail_url}
                onChange={(e) => setFormData({ ...formData, thumbnail_url: e.target.value })}
                placeholder="https://..."
              />
            </div>

            <div className="col-span-2">
              <Label>Content Body (Markdown supported)</Label>
              <textarea
                className="w-full border rounded-md p-2 min-h-[100px] font-mono text-sm"
                value={formData.content_body}
                onChange={(e) => setFormData({ ...formData, content_body: e.target.value })}
                placeholder="Lesson content or article text..."
              />
            </div>

            <div className="col-span-2">
              <Label>Tags</Label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                  placeholder="Add tag and press Enter"
                />
                <Button type="button" onClick={addTag}>
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.tags.map((tag) => (
                  <span
                    key={tag}
                    className="bg-gray-200 px-3 py-1 rounded-full text-sm flex items-center gap-2"
                  >
                    {tag}
                    <button onClick={() => removeTag(tag)} className="text-red-600 font-bold">
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div className="col-span-2 space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_published}
                  onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                />
                <span>Published (visible to users)</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_featured}
                  onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                />
                <span>Featured (show at top of recommended)</span>
              </label>
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-4 border-t">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveContent}>
              {editingContent ? "Update" : "Create"}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Category Dialog */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">
            {editingCategory ? "Edit Category" : "Add Category"}
          </h2>

          <div className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input
                value={categoryFormData.name}
                onChange={(e) =>
                  setCategoryFormData({ ...categoryFormData, name: e.target.value })
                }
                placeholder="Category name"
              />
            </div>

            <div>
              <Label>Description</Label>
              <textarea
                className="w-full border rounded-md p-2 min-h-[60px]"
                value={categoryFormData.description}
                onChange={(e) =>
                  setCategoryFormData({ ...categoryFormData, description: e.target.value })
                }
                placeholder="Optional description"
              />
            </div>

            <div>
              <Label>Parent Category</Label>
              <Select
                value={categoryFormData.parent_category_id || ""}
                onValueChange={(value) =>
                  setCategoryFormData({
                    ...categoryFormData,
                    parent_category_id: value || null,
                  })
                }
              >
                <option value="">None (Top Level)</option>
                {categories
                  .filter((cat) => cat.id !== editingCategory?.id)
                  .map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
              </Select>
            </div>

            <div>
              <Label>Sort Order</Label>
              <Input
                type="number"
                value={categoryFormData.sort_order}
                onChange={(e) =>
                  setCategoryFormData({
                    ...categoryFormData,
                    sort_order: parseInt(e.target.value) || 0,
                  })
                }
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-4 border-t">
            <Button variant="outline" onClick={() => setCategoryDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveCategory}>
              {editingCategory ? "Update" : "Create"}
            </Button>
          </div>
        </div>
      </Dialog>
      </div>
    </div>
  );
}
