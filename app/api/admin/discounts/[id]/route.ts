import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { deleteDiscountCode, getDiscountCodeById, updateDiscountCode } from '@/lib/data/discounts';

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

  const discount = await getDiscountCodeById(id);
  if (!discount) {
    return new NextResponse('Discount not found', { status: 404 });
  }
  return NextResponse.json(discount);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireAdmin();
  if (auth?.error) {
    return auth.error;
  }

  const body = await request.json();
  const payload = {
    code: body.code,
    amount: body.amount != null ? Number(body.amount) : undefined,
    type: body.type,
    is_active: body.is_active,
    max_uses: body.max_uses != null ? Number(body.max_uses) : null,
    start_date: body.start_date || null,
    end_date: body.end_date || null,
    description: body.description || null,
    minimum_amount: body.minimum_amount != null ? Number(body.minimum_amount) : null,
  };

  const updated = await updateDiscountCode(id, payload);
  return NextResponse.json(updated);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireAdmin();
  if (auth?.error) {
    return auth.error;
  }

  await deleteDiscountCode(id);
  return NextResponse.json({ success: true });
}

