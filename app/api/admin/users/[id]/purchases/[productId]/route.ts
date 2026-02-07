import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth';

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string; productId: string }> }) {
  const { id, productId } = await params;
  const auth = await requireAdmin();
  if (auth?.error) {
    return auth.error;
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from('user_purchases')
    .delete()
    .eq('user_id', id)
    .eq('product_id', productId);

  if (error) {
    return new NextResponse(error.message, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

