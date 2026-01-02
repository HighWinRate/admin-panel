import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createCategory, listCategories } from '@/lib/data/categories';

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

  const data = await listCategories();
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth?.error) {
    return auth.error;
  }

  const body = await request.json();
  if (!body.name) {
    return new NextResponse('Name is required', { status: 400 });
  }

  const payload = {
    name: body.name,
    description: body.description || null,
    slug: body.slug || null,
    icon: body.icon || null,
    sort_order: body.sort_order != null ? Number(body.sort_order) : null,
    is_active: body.is_active ?? true,
    parent_id: body.parent_id || null,
  };

  const category = await createCategory(payload);
  return NextResponse.json(category);
}

