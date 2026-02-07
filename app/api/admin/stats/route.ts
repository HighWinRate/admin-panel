import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth';

export async function GET() {
  const auth = await requireAdmin();
  if (auth?.error) {
    return auth.error;
  }

  const admin = createAdminClient();
  const [
    products,
    courses,
    users,
    transactions,
  ] = await Promise.all([
    admin.from('products').select('id', { count: 'exact', head: true }),
    admin.from('courses').select('id', { count: 'exact', head: true }),
    admin.from('users').select('id', { count: 'exact', head: true }),
    admin.from('transactions').select('id', { count: 'exact', head: true }),
  ]);

  if (products.error || courses.error || users.error || transactions.error) {
    const message =
      products.error?.message ||
      courses.error?.message ||
      users.error?.message ||
      transactions.error?.message ||
      'Failed to load stats';
    return new NextResponse(message, { status: 500 });
  }

  const stats = {
    products: products.count ?? 0,
    courses: courses.count ?? 0,
    users: users.count ?? 0,
    transactions: transactions.count ?? 0,
  };

  return NextResponse.json(stats);
}

