import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { updateTransactionById } from '@/lib/data/transactions';

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

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (auth?.error) {
    return auth.error;
  }

  const body = await request.json();
  const payload: Record<string, unknown> = {};

  if (body.status) payload.status = body.status;
  if (body.amount != null) payload.amount = Number(body.amount);
  if (body.discount_amount != null) payload.discount_amount = Number(body.discount_amount);
  if (body.crypto_currency) payload.crypto_currency = body.crypto_currency;
  if (body.crypto_amount != null) payload.crypto_amount = Number(body.crypto_amount);
  if (body.tx_hash) payload.tx_hash = body.tx_hash;
  if (body.gateway) payload.gateway = body.gateway;
  if (body.paid_at) payload.paid_at = new Date(body.paid_at).toISOString();

  const updated = await updateTransactionById(params.id, payload);
  return NextResponse.json(updated);
}

