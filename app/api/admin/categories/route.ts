import { NextResponse } from 'next/server';
import { createCategory, listCategories } from '@/lib/data/categories';
import { requireAdmin } from '@/lib/auth';

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
    sort_order: body.sort_order != null ? Number(body.sort_order) : undefined,
    is_active: body.is_active ?? true,
    parent_id: body.parent_id || null,
  };

  const category = await createCategory(payload);
  return NextResponse.json(category);
}

