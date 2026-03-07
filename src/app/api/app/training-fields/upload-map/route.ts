import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireTrainingFieldAccess } from "../_auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await requireTrainingFieldAccess(true);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { tenantId } = auth;
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const bucket = "training-field-maps";
  await admin.storage.createBucket(bucket, { public: true }).catch(() => undefined);

  const ext = file.name.includes(".") ? file.name.split(".").pop() : "png";
  const path = `${tenantId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await admin.storage.from(bucket).upload(path, file, {
    contentType: file.type || "image/png",
    upsert: false,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data } = admin.storage.from(bucket).getPublicUrl(path);
  return NextResponse.json({ imageUrl: data.publicUrl, path });
}
