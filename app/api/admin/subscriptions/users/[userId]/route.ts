import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import {
  getUserSubscriptions,
  createSubscription,
} from '@/lib/data/subscriptions';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const authResult = await requireAdmin();
  if ('error' in authResult) {
    return authResult.error;
  }

  try {
    const { userId } = await params;
    const subscriptions = await getUserSubscriptions(userId);
    return NextResponse.json(subscriptions);
  } catch (error) {
    console.error('Error fetching user subscriptions:', error);
    return NextResponse.json(
      { error: 'خطا در دریافت اشتراک‌های کاربر' },
      { status: 500 },
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const authResult = await requireAdmin();
  if ('error' in authResult) {
    return authResult.error;
  }

  try {
    const { userId } = await params;
    const body = await request.json();

    const subscription = await createSubscription({
      user_id: userId,
      ...body,
    });

    return NextResponse.json(subscription);
  } catch (error) {
    console.error('Error creating subscription:', error);
    return NextResponse.json(
      { error: 'خطا در ایجاد اشتراک' },
      { status: 500 },
    );
  }
}
