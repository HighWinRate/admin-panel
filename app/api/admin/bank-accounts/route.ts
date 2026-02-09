import { NextResponse } from 'next/server';
import { createBankAccount, listBankAccounts } from '@/lib/data/bank-accounts';
import { requireAdmin } from '@/lib/auth';

export async function GET() {
  const auth = await requireAdmin();
  if (auth?.error) {
    return auth.error;
  }

  const data = await listBankAccounts();
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth?.error) {
    return auth.error;
  }

  const body = await request.json();
  if (!body.card_number || !body.account_holder || !body.bank_name) {
    return NextResponse.json(
      { error: 'card_number, account_holder, and bank_name are required' },
      { status: 400 }
    );
  }

  const cardNumber = String(body.card_number).replace(/\D/g, '');
  if (cardNumber.length !== 16) {
    return NextResponse.json(
      { error: 'شماره کارت باید ۱۶ رقم باشد' },
      { status: 400 }
    );
  }

  const payload = {
    card_number: cardNumber,
    account_holder: body.account_holder.trim(),
    bank_name: body.bank_name.trim(),
    iban: body.iban ? String(body.iban).replace(/\s/g, '') : null,
    is_active: body.is_active ?? true,
  };

  if (payload.iban && (payload.iban.length !== 26 || !payload.iban.startsWith('IR'))) {
    return NextResponse.json(
      { error: 'شماره شبا باید ۲۶ کاراکتر و با IR شروع شود' },
      { status: 400 }
    );
  }

  const account = await createBankAccount(payload);
  return NextResponse.json(account);
}
