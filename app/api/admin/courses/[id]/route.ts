import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { deleteCourse, getCourseById, updateCourse } from '@/lib/data/courses';

async function requireAdmin() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) {
    return { error: new NextResponse('Authentication required', { status: 401 }) };
  }
  if (session.user.user_metadata?.role !== 'admin') {
    return { error: new NextResponse('Forbidden', { status: 403 }) };
  }
  return { user: session.user };
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (auth?.error) {
    return auth.error;
  }

  const course = await getCourseById(params.id);
  if (!course) {
    return new NextResponse('Course not found', { status: 404 });
  }
  return NextResponse.json(course);
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (auth?.error) {
    return auth.error;
  }

  const body = await request.json();
  const payload = {
    title: body.title,
    description: body.description,
    markdown_description: body.markdown_description,
    markdown_content: body.markdown_content,
    keywords: body.keywords,
    is_active: body.is_active,
    sort_order: body.sort_order,
    duration_minutes: body.duration_minutes,
    categoryId: body.categoryId,
    fileIds: body.fileIds,
  };

  const updated = await updateCourse(params.id, payload);
  return NextResponse.json(updated);
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (auth?.error) {
    return auth.error;
  }

  await deleteCourse(params.id);
  return NextResponse.json({ success: true });
}

