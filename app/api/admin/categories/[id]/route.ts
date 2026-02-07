import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { deleteCategory, getCategory, updateCategory } from '@/lib/data/categories';

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

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireAdmin();
  if (auth?.error) {
    return auth.error;
  }

  const category = await getCategory(id);
  if (!category) {
    return new NextResponse('Category not found', { status: 404 });
  }
  return NextResponse.json(category);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireAdmin();
  if (auth?.error) {
    return auth.error;
  }

  const body = await request.json();
  const payload = {
    name: body.name,
    description: body.description || null,
    slug: body.slug || null,
    icon: body.icon || null,
    sort_order: body.sort_order != null ? Number(body.sort_order) : null,
    is_active: body.is_active,
    parent_id: body.parent_id || null,
  };

  const updated = await updateCategory(id, payload);
  return NextResponse.json(updated);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireAdmin();
  if (auth?.error) {
    return auth.error;
  }

  await deleteCategory(id);
  return NextResponse.json({ success: true });
}

