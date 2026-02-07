import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { deleteProduct, getProductById, updateProduct } from '@/lib/data/products';

async function requireAdmin() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    return { error: new NextResponse('Authentication required', { status: 401 }) };
  }
  const role = session.user.user_metadata?.role;
  if (role !== 'admin') {
    return { error: new NextResponse('Forbidden', { status: 403 }) };
  }

  return { user: session.user };
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireAdmin();
  if (auth?.error) {
    return auth.error;
  }

  const product = await getProductById(id);
  if (!product) {
    return new NextResponse('Product not found', { status: 404 });
  }
  return NextResponse.json(product);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireAdmin();
  if (auth?.error) {
    return auth.error;
  }

  const payload = await request.json();
  const productPayload = {
    title: payload.title,
    description: payload.description,
    price: payload.price != null ? Number(payload.price) : undefined,
    winrate: payload.winrate != null ? Number(payload.winrate) : undefined,
    discountedPrice: payload.discountedPrice ? Number(payload.discountedPrice) : undefined,
    discountExpiresAt: payload.discountExpiresAt || null,
    backtest_trades_count:
      payload.backtest_trades_count != null ? Number(payload.backtest_trades_count) : undefined,
    category_id: payload.categoryId || null,
    trading_style: payload.trading_style || null,
    trading_session: payload.trading_session || null,
    markdown_description: payload.markdown_description || null,
    backtest_results: payload.backtest_results || null,
    sort_order: payload.sort_order != null ? Number(payload.sort_order) : undefined,
    is_active: payload.is_active,
    keywords: payload.keywords,
    courseIds: payload.courseIds,
  };

  const updated = await updateProduct(id, productPayload);
  return NextResponse.json(updated);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireAdmin();
  if (auth?.error) {
    return auth.error;
  }

  await deleteProduct(id);
  return NextResponse.json({ success: true });
}

