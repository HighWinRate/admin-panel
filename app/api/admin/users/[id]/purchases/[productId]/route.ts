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

export async function DELETE(_: Request, { params }: { params: { id: string; productId: string } }) {
  const auth = await requireAdmin();
  if (auth?.error) {
    return auth.error;
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from('user_purchases')
    .delete()
    .eq('user_id', params.id)
    .eq('product_id', params.productId);

  if (error) {
    return new NextResponse(error.message, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

