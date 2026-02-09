import { NextResponse } from 'next/server';
import { updateTransactionById } from '@/lib/data/transactions';
import { requireAdmin } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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
  if (body.paid_at) payload.paid_at = body.paid_at ? new Date(body.paid_at).toISOString() : null;
  if (body.bank_account_id !== undefined) payload.bank_account_id = body.bank_account_id || null;

  const admin = createAdminClient();
  const { data: previous } = await admin
    .from('transactions')
    .select('status')
    .eq('id', id)
    .single();

  const updated = await updateTransactionById(id, payload);

  if (body.status === 'completed' && previous?.status !== 'completed') {
    await admin.rpc('complete_purchase', { _transaction_id: id });
  }

  return NextResponse.json(updated);
}

