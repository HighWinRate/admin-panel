import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import {
  getAllSubscriptions,
  getSubscriptionStats,
  expireSubscriptions,
} from '@/lib/data/subscriptions';

export async function GET(request: Request) {
  const authResult = await requireAdmin();
  if ('error' in authResult) {
    return authResult.error;
  }

  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'stats') {
      const stats = await getSubscriptionStats();
      return NextResponse.json(stats);
    }

    if (action === 'expire') {
      const expiredCount = await expireSubscriptions();
      return NextResponse.json({
        success: true,
        expired_count: expiredCount,
      });
    }

    const subscriptions = await getAllSubscriptions();
    return NextResponse.json(subscriptions);
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    return NextResponse.json(
      { error: 'خطا در دریافت اشتراک‌ها' },
      { status: 500 },
    );
  }
}
