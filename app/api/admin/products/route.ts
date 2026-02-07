import { NextResponse } from 'next/server';
import { createProduct, listProducts } from '@/lib/data/products';
import { requireAdmin } from '@/lib/auth';

export async function GET() {
  const auth = await requireAdmin();
  if (auth?.error) {
    return auth.error;
  }

  const data = await listProducts();
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth?.error) {
    return auth.error;
  }

  const payload = await request.json();
  if (!payload.title || payload.price == null || payload.winrate == null) {
    return new NextResponse('Missing required fields', { status: 400 });
  }

  const productPayload = {
    title: payload.title,
    description: payload.description ?? '',
    price: Number(payload.price),
    winrate: Number(payload.winrate),
    discountedPrice: payload.discountedPrice ? Number(payload.discountedPrice) : undefined,
    discountExpiresAt: payload.discountExpiresAt || null,
    backtest_trades_count: payload.backtest_trades_count
      ? Number(payload.backtest_trades_count)
      : undefined,
    category_id: payload.categoryId || null,
    trading_style: payload.trading_style || null,
    trading_session: payload.trading_session || null,
    markdown_description: payload.markdown_description || null,
    backtest_results: payload.backtest_results || null,
    sort_order: payload.sort_order ? Number(payload.sort_order) : 0,
    is_active: payload.is_active ?? true,
    keywords: payload.keywords || [],
    courseIds: payload.courseIds,
  };

  const product = await createProduct(productPayload);
  return NextResponse.json(product);
}

