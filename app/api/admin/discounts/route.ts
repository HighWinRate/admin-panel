import { NextResponse } from 'next/server';
import { createDiscountCode, listDiscountCodes } from '@/lib/data/discounts';
import { requireAdmin } from '@/lib/auth';

export async function GET() {
  const auth = await requireAdmin();
  if (auth?.error) {
    return auth.error;
  }

  const data = await listDiscountCodes();
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth?.error) {
    return auth.error;
  }

  const body = await request.json();
  if (!body.code || !body.amount || !body.type) {
    return new NextResponse('code, amount, and type are required', { status: 400 });
  }

  const payload = {
    code: body.code,
    amount: Number(body.amount),
    type: body.type,
    is_active: body.is_active ?? true,
    max_uses: body.max_uses != null ? Number(body.max_uses) : undefined,
    start_date: body.start_date || null,
    end_date: body.end_date || null,
    description: body.description || null,
    minimum_amount: body.minimum_amount != null ? Number(body.minimum_amount) : undefined,
  };

  const discount = await createDiscountCode(payload);
  return NextResponse.json(discount);
}

