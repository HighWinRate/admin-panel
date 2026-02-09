import { NextResponse } from 'next/server';
import {
  deleteBankAccountById,
  getBankAccountById,
  updateBankAccountById,
} from '@/lib/data/bank-accounts';
import { requireAdmin } from '@/lib/auth';

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await requireAdmin();
  if (auth?.error) {
    return auth.error;
  }

  const account = await getBankAccountById(id);
  if (!account) {
    return NextResponse.json({ error: 'Bank account not found' }, { status: 404 });
  }
  return NextResponse.json(account);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await requireAdmin();
  if (auth?.error) {
    return auth.error;
  }

  const body = await request.json();
  const payload: {
    card_number?: string;
    account_holder?: string;
    bank_name?: string;
    iban?: string | null;
    is_active?: boolean;
  } = {};

  if (body.card_number !== undefined) {
    const cardNumber = String(body.card_number).replace(/\D/g, '');
    if (cardNumber.length !== 16) {
      return NextResponse.json(
        { error: 'شماره کارت باید ۱۶ رقم باشد' },
        { status: 400 }
      );
    }
    payload.card_number = cardNumber;
  }
  if (body.account_holder !== undefined) payload.account_holder = body.account_holder.trim();
  if (body.bank_name !== undefined) payload.bank_name = body.bank_name.trim();
  if (body.iban !== undefined) {
    const iban = body.iban ? String(body.iban).replace(/\s/g, '') : null;
    if (iban && (iban.length !== 26 || !iban.startsWith('IR'))) {
      return NextResponse.json(
        { error: 'شماره شبا باید ۲۶ کاراکتر و با IR شروع شود' },
        { status: 400 }
      );
    }
    payload.iban = iban;
  }
  if (body.is_active !== undefined) payload.is_active = Boolean(body.is_active);

  const updated = await updateBankAccountById(id, payload);
  return NextResponse.json(updated);
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await requireAdmin();
  if (auth?.error) {
    return auth.error;
  }

  await deleteBankAccountById(id);
  return NextResponse.json({ success: true });
}
