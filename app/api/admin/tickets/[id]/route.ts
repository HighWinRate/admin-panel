import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireAdmin({ allowSupport: true });
  if (auth?.error) {
    return auth.error;
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('tickets')
    .select('*, user:users!user_id(*), assigned_to_user:users!assigned_to(*)')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return new NextResponse('Ticket not found', { status: 404 });
    }
    return new NextResponse(error.message, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireAdmin({ allowSupport: true });
  if (auth?.error) {
    return auth.error;
  }

  const body = await request.json();
  const payload: Record<string, unknown> = {};

  if (body.status) payload.status = body.status;
  if (body.assigned_to) payload.assigned_to = body.assigned_to;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('tickets')
    .update(payload)
    .eq('id', id)
    .select('*, user:users!user_id(*), assigned_to_user:users!assigned_to(*)')
    .single();

  if (error) {
    return new NextResponse(error.message, { status: 500 });
  }

  return NextResponse.json(data);
}

