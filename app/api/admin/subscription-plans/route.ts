import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getAllPlans, createPlan } from '@/lib/data/subscriptions';

export async function GET() {
  const authResult = await requireAdmin();
  if ('error' in authResult) {
    return authResult.error;
  }

  try {
    const plans = await getAllPlans();
    return NextResponse.json(plans);
  } catch (error) {
    console.error('Error fetching plans:', error);
    return NextResponse.json(
      { error: 'خطا در دریافت پلن‌ها' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const authResult = await requireAdmin();
  if ('error' in authResult) {
    return authResult.error;
  }

  try {
    const body = await request.json();
    const plan = await createPlan(body);
    return NextResponse.json(plan);
  } catch (error) {
    console.error('Error creating plan:', error);
    return NextResponse.json(
      { error: 'خطا در ایجاد پلن' },
      { status: 500 },
    );
  }
}
