import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth';

export async function GET(request: Request) {
  const auth = await requireAdmin({ allowSupport: true });
  if (auth?.error) {
    return auth.error;
  }

  const url = new URL(request.url);
  const page = Number(url.searchParams.get('page') ?? '1');
  const limit = Number(url.searchParams.get('limit') ?? '20');
  const status = url.searchParams.get('status') || undefined;
  const priority = url.searchParams.get('priority') || undefined;
  const type = url.searchParams.get('type') || undefined;

  const admin = createAdminClient();
  let query = admin
    .from('tickets')
    .select('*, user:users!user_id(*), assigned_to_user:users!assigned_to(*)', { count: 'exact' });

  if (status) query = query.eq('status', status);
  if (priority) query = query.eq('priority', priority);
  if (type) query = query.eq('type', type);

  const from = (page - 1) * limit;
  const to = from + limit - 1;
  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    return new NextResponse(error.message, { status: 500 });
  }

  const totalPages = count ? Math.max(1, Math.ceil(count / limit)) : 1;
  return NextResponse.json({ tickets: data || [], totalPages });
}

