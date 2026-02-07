import { Buffer } from 'buffer';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { buildCourseThumbnailUrl, updateCourse } from '@/lib/data/courses';
import { requireAdmin } from '@/lib/auth';

const BUCKET = 'thumbnails';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const auth = await requireAdmin();
  if (auth?.error) {
    return auth.error;
  }

  const formData = await request.formData();
  const file = formData.get('thumbnail');
  if (!file || !(file instanceof File)) {
    return new NextResponse('Thumbnail is required', { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const filename = `${id}/${Date.now()}-${file.name}`.replace(/\s+/g, '_');

  const admin = createAdminClient();
  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(filename, buffer, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) {
    return new NextResponse(`Upload failed: ${uploadError.message}`, { status: 500 });
  }

  const updatedCourse = await updateCourse(id, { thumbnail: filename });
  return NextResponse.json({
    ...updatedCourse,
    thumbnailUrl: buildCourseThumbnailUrl(updatedCourse.thumbnail),
  });
}

