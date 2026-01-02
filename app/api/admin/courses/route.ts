import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createCourse, listCourses } from '@/lib/data/courses';

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

