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
    .select("id, tenant_id, role")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (membershipError || !membership) {
    return NextResponse.json({ error: "No active membership" }, { status: 403 });
  }

  // Parse query parameters
  const searchParams = req.nextUrl.searchParams;
  const content_id = searchParams.get("content_id");
  const membership_id = searchParams.get("membership_id");

  let query = supabase
    .from("training_progress")
    .select(`
      *,
      training_content:content_id (title, content_type, thumbnail_url, duration_minutes)
    `)
    .eq("tenant_id", membership.tenant_id);

  // Filter by content if specified
  if (content_id) {
    query = query.eq("content_id", content_id);
  }

  // Leadership and coaches can view others' progress
  const adminRoles = ["club_admin", "director_of_coaching", "club_director", "platform_admin"];
  const coachRoles = ["select_coach", "academy_coach"];
  
  if (adminRoles.includes(membership.role)) {
    // Admins can view all progress, optionally filtered by membership_id
    if (membership_id) {
      query = query.eq("membership_id", membership_id);
    }
  } else if (coachRoles.includes(membership.role)) {
    // Coaches can view their own or optionally filter by membership_id if they coach that player
    if (membership_id) {
      query = query.eq("membership_id", membership_id);
    } else {
      query = query.eq("membership_id", membership.id);
    }
  } else {
    // Players can only view their own progress
    query = query.eq("membership_id", membership.id);
  }

  query = query.order("last_viewed_at", { ascending: false, nullsFirst: false });

  const { data: progress, error } = await query;

  if (error) {
    console.error("Error fetching progress:", error);
    return NextResponse.json({ error: "Failed to fetch progress" }, { status: 500 });
  }

  return NextResponse.json({ progress });
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

  // Get tenant context
  const { data: membership, error: membershipError } = await supabase
    .from("memberships")
    .select("id, tenant_id, role")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (membershipError || !membership) {
    return NextResponse.json({ error: "No active membership" }, { status: 403 });
  }

  const body = await req.json();
  const { content_id, completion_percentage, is_completed, rating, feedback_text } = body;

  if (!content_id) {
    return NextResponse.json({ error: "content_id is required" }, { status: 400 });
  }

  // Check if progress record already exists
  const { data: existingProgress } = await supabase
    .from("training_progress")
    .select("*")
    .eq("content_id", content_id)
    .eq("membership_id", membership.id)
    .maybeSingle();

  const now = new Date().toISOString();

  if (existingProgress) {
    // Update existing progress
    const updateData: Record<string, unknown> = {
      last_viewed_at: now,
      view_count: existingProgress.view_count + 1,
    };

    if (completion_percentage !== undefined) {
      updateData.completion_percentage = completion_percentage;
    }
    if (is_completed !== undefined) {
      updateData.is_completed = is_completed;
      if (is_completed && !existingProgress.completed_at) {
        updateData.completed_at = now;
      }
    }
    if (rating !== undefined) {
      updateData.rating = rating;
    }
    if (feedback_text !== undefined) {
      updateData.feedback_text = feedback_text;
    }

    const { data: progress, error } = await supabase
      .from("training_progress")
      .update(updateData)
      .eq("id", existingProgress.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating progress:", error);
      return NextResponse.json({ error: "Failed to update progress" }, { status: 500 });
    }

    return NextResponse.json({ progress });
  } else {
    // Create new progress record
    const { data: progress, error } = await supabase
      .from("training_progress")
      .insert({
        tenant_id: membership.tenant_id,
        content_id,
        membership_id: membership.id,
        first_viewed_at: now,
        last_viewed_at: now,
        view_count: 1,
        completion_percentage: completion_percentage ?? 0,
        is_completed: is_completed ?? false,
        completed_at: is_completed ? now : null,
        rating: rating || null,
        feedback_text: feedback_text || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating progress:", error);
      return NextResponse.json({ error: "Failed to create progress" }, { status: 500 });
    }

    return NextResponse.json({ progress }, { status: 201 });
  }
}
