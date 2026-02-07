import { NextResponse } from 'next/server';
import { deleteCourse, getCourseById, updateCourse } from '@/lib/data/courses';
import { requireAdmin } from '@/lib/auth';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireAdmin();
  if (auth?.error) {
    return auth.error;
  }

  const course = await getCourseById(id);
  if (!course) {
    return new NextResponse('Course not found', { status: 404 });
  }
  return NextResponse.json(course);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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

  const updated = await updateCourse(id, payload);
  return NextResponse.json(updated);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireAdmin();
  if (auth?.error) {
    return auth.error;
  }

  await deleteCourse(id);
  return NextResponse.json({ success: true });
}

