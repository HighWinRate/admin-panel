import { NextResponse } from 'next/server';
import { deleteDiscountCode, getDiscountCodeById, updateDiscountCode } from '@/lib/data/discounts';
import { requireAdmin } from '@/lib/auth';

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
    max_uses: body.max_uses != null ? Number(body.max_uses) : undefined,
    start_date: body.start_date || null,
    end_date: body.end_date || null,
    description: body.description || null,
    minimum_amount: body.minimum_amount != null ? Number(body.minimum_amount) : undefined,
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

