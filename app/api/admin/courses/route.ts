import { NextResponse } from 'next/server';
import { createCourse, listCourses } from '@/lib/data/courses';
import { requireAdmin } from '@/lib/auth';

export async function GET() {
  const auth = await requireAdmin();
  if (auth?.error) {
    return auth.error;
  }

  const data = await listCourses();
  return NextResponse.json(data);
}

export async function POST(request: Request) {
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

  const course = await createCourse(payload);
  return NextResponse.json(course);
}

