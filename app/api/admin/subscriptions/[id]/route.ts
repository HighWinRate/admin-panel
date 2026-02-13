import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import {
  getSubscriptionById,
  updateSubscription,
  deleteSubscription,
} from '@/lib/data/subscriptions';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireAdmin();
  if ('error' in authResult) {
    return authResult.error;
  }

  try {
    const { id } = await params;
    const subscription = await getSubscriptionById(id);

    if (!subscription) {
      return NextResponse.json(
        { error: 'اشتراک یافت نشد' },
        { status: 404 },
      );
    }

    return NextResponse.json(subscription);
  } catch (error) {
    console.error('Error fetching subscription:', error);
    return NextResponse.json(
      { error: 'خطا در دریافت اشتراک' },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireAdmin();
  if ('error' in authResult) {
    return authResult.error;
  }

  try {
    const { id } = await params;
    const body = await request.json();

    const subscription = await updateSubscription(id, body);
    return NextResponse.json(subscription);
  } catch (error) {
    console.error('Error updating subscription:', error);
    return NextResponse.json(
      { error: 'خطا در ویرایش اشتراک' },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireAdmin();
  if ('error' in authResult) {
    return authResult.error;
  }

  try {
    const { id } = await params;
    await deleteSubscription(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting subscription:', error);
    return NextResponse.json(
      { error: 'خطا در حذف اشتراک' },
      { status: 500 },
    );
  }
}
