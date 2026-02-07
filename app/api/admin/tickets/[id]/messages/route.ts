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
    .from('ticket_messages')
    .select('*, user:users!user_id(*)')
    .eq('ticket_id', id)
    .order('created_at', { ascending: true });

  if (error) {
    return new NextResponse(error.message, { status: 500 });
  }

  return NextResponse.json(data || []);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireAdmin({ allowSupport: true });
  if (auth?.error) {
    return auth.error;
  }

  const body = await request.json();
  if (!body.content) {
    return new NextResponse('Content is required', { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('ticket_messages')
    .insert({
      ticket_id: id,
      user_id: auth.user.id,
      content: body.content,
      type: body.type || 'support',
      is_internal: body.is_internal ?? false,
      attachments: body.attachments || [],
    })
    .select('*, user:users!user_id(*)')
    .single();

  if (error) {
    return new NextResponse(error.message, { status: 500 });
  }

  return NextResponse.json(data);
}

