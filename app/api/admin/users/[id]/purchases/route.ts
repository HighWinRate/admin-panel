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
  if (session.user.user_metadata?.role !== 'admin') {
    return { error: new NextResponse('Forbidden', { status: 403 }) };
  }
  return { user: session.user };
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (auth?.error) {
    return auth.error;
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('user_purchases')
    .select(`*, product:products(*)`)
    .eq('user_id', params.id)
    .order('created_at', { ascending: false });

  if (error) {
    return new NextResponse(error.message, { status: 500 });
  }

  return NextResponse.json(data || []);
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (auth?.error) {
    return auth.error;
  }

  const body = await request.json();
  if (!body.productId) {
    return new NextResponse('productId is required', { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('user_purchases')
    .insert({
      user_id: params.id,
      product_id: body.productId,
      purchased_at: new Date().toISOString(),
    })
    .select('*, product:products(*)')
    .single();

  if (error) {
    return new NextResponse(error.message, { status: 500 });
  }

  return NextResponse.json(data);
}

