import { NextResponse } from 'next/server';
import { listTransactions } from '@/lib/data/transactions';
import { requireAdmin } from '@/lib/auth';

export async function GET() {
  const auth = await requireAdmin();
  if (auth?.error) {
    return auth.error;
  }

  const data = await listTransactions();
  return NextResponse.json(data);
}

