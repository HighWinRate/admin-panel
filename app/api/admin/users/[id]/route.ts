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

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (auth?.error) {
    return auth.error;
  }

  const admin = createAdminClient();
  const { data, error } = await admin.from('users').select('*').eq('id', params.id).single();
  if (error) {
    if (error.code === 'PGRST116') {
      return new NextResponse('User not found', { status: 404 });
    }
    return new NextResponse(error.message, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (auth?.error) {
    return auth.error;
  }

  const body = await request.json();
  const admin = createAdminClient();
  const updates: Record<string, unknown> = {};

  const authUpdates: Record<string, string> = {};
  if (body.email) {
    authUpdates.email = body.email;
    updates.email = body.email;
  }
  if (body.password) {
    authUpdates.password = body.password;
  }

  if (Object.keys(authUpdates).length > 0) {
    const { error } = await admin.auth.admin.updateUserById(params.id, authUpdates);
    if (error) {
      return new NextResponse(error.message, { status: 500 });
    }
  }

  if (body.first_name) updates.first_name = body.first_name;
  if (body.last_name) updates.last_name = body.last_name;
  if (body.role) updates.role = body.role;

  if (Object.keys(updates).length > 0) {
    const { data, error } = await admin
      .from('users')
      .update(updates)
      .eq('id', params.id)
      .select('*')
      .single();

    if (error) {
      return new NextResponse(error.message, { status: 500 });
    }

    return NextResponse.json(data);
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (auth?.error) {
    return auth.error;
  }

  const admin = createAdminClient();
  const { error: deleteAuthError } = await admin.auth.admin.deleteUser(params.id);
  if (deleteAuthError) {
    return new NextResponse(deleteAuthError.message, { status: 500 });
  }

  const { error: deleteProfileError } = await admin.from('users').delete().eq('id', params.id);
  if (deleteProfileError) {
    return new NextResponse(deleteProfileError.message, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

