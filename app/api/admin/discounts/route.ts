import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createDiscountCode, listDiscountCodes } from '@/lib/data/discounts';

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
    max_uses: body.max_uses != null ? Number(body.max_uses) : null,
    start_date: body.start_date || null,
    end_date: body.end_date || null,
    description: body.description || null,
    minimum_amount: body.minimum_amount != null ? Number(body.minimum_amount) : null,
  };

  const discount = await createDiscountCode(payload);
  return NextResponse.json(discount);
}

