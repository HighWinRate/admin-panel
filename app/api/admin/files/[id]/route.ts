import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { deleteFile, deleteFileFromStorage, getFileById, updateFileRecord } from '@/lib/data/files';

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

  const file = await getFileById(params.id);
  if (!file) {
    return new NextResponse('File not found', { status: 404 });
  }
  return NextResponse.json(file);
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (auth?.error) {
    return auth.error;
  }

  const payload = await request.json();
  const updated = await updateFileRecord(params.id, {
    name: payload.name,
    type: payload.type,
    isFree: payload.isFree,
    productIds: payload.productIds,
    courseIds: payload.courseIds,
  });

  return NextResponse.json(updated);
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (auth?.error) {
    return auth.error;
  }

  const file = await getFileById(params.id);
  if (file?.path) {
    await deleteFileFromStorage(file.path);
  }
  await deleteFile(params.id);
  return NextResponse.json({ success: true });
}

