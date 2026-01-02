import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createServerSupabaseClient } from '@/lib/supabase/server';

async function requireAdmin() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) {
    return { error: new NextResponse('Authentication required', { status: 401 }) };
  }
  if (session.user.user_metadata?.role !== 'admin' && session.user.user_metadata?.role !== 'support') {
    return { error: new NextResponse('Forbidden', { status: 403 }) };
  }
  return { user: session.user };
}

export async function GET(request: Request) {
  const auth = await requireAdmin();
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
    .select('*, user:users(*), assigned_to:users(*)', { count: 'exact' });

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

