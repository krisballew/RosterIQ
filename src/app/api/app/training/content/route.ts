import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get tenant context
  const { data: membership, error: membershipError } = await supabase
    .from("memberships")
    .select("tenant_id, role")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (membershipError || !membership) {
    return NextResponse.json({ error: "No active membership" }, { status: 403 });
  }

  // Parse query parameters for filtering
  const searchParams = req.nextUrl.searchParams;
  const audience = searchParams.get("audience");
  const category_id = searchParams.get("category_id");
  const is_published = searchParams.get("is_published");
  const is_featured = searchParams.get("is_featured");

  let query = supabase
    .from("training_content")
    .select("*")
    .eq("tenant_id", membership.tenant_id);

  // Apply filters
  if (audience) {
    query = query.or(`audience.eq.${audience},audience.eq.both`);
  }
  if (category_id) {
    query = query.eq("category_id", category_id);
  }
  if (is_published !== null && is_published !== undefined) {
    query = query.eq("is_published", is_published === "true");
  }
  if (is_featured !== null && is_featured !== undefined) {
    query = query.eq("is_featured", is_featured === "true");
  }

  query = query.order("created_at", { ascending: false });

  const { data: content, error } = await query;

  if (error) {
    console.error("Error fetching training content:", error);
    return NextResponse.json({ error: "Failed to fetch content" }, { status: 500 });
  }

  return NextResponse.json({ content });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get tenant context and check permissions
  const { data: membership, error: membershipError } = await supabase
    .from("memberships")
    .select("id, tenant_id, role")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (membershipError || !membership) {
    return NextResponse.json({ error: "No active membership" }, { status: 403 });
  }

  // Only club leadership can create content
  const allowedRoles = ["club_admin", "director_of_coaching", "club_director", "platform_admin"];
  if (!allowedRoles.includes(membership.role)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const body = await req.json();
  const {
    title,
    description,
    content_type,
    audience,
    min_age_division,
    max_age_division,
    gender_filter,
    skill_level,
    video_url,
    document_url,
    thumbnail_url,
    duration_minutes,
    content_body,
    category_id,
    tags,
    is_published,
    is_featured,
  } = body;

  if (!title || !content_type || !audience) {
    return NextResponse.json(
      { error: "Title, content_type, and audience are required" },
      { status: 400 }
    );
  }

  const { data: content, error } = await supabase
    .from("training_content")
    .insert({
      tenant_id: membership.tenant_id,
      title,
      description: description || null,
      content_type,
      audience,
      min_age_division: min_age_division || null,
      max_age_division: max_age_division || null,
      gender_filter: gender_filter || null,
      skill_level: skill_level || null,
      video_url: video_url || null,
      document_url: document_url || null,
      thumbnail_url: thumbnail_url || null,
      duration_minutes: duration_minutes || null,
      content_body: content_body || null,
      category_id: category_id || null,
      tags: tags || [],
      is_published: is_published ?? false,
      is_featured: is_featured ?? false,
      created_by: membership.id,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating training content:", error);
    return NextResponse.json({ error: "Failed to create content" }, { status: 500 });
  }

  return NextResponse.json({ content }, { status: 201 });
}
