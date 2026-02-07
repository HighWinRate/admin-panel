import { NextResponse } from 'next/server';
import { deleteFile, deleteFileFromStorage, getFileById, updateFileRecord } from '@/lib/data/files';
import { requireAdmin } from '@/lib/auth';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireAdmin();
  if (auth?.error) {
    return auth.error;
  }

  const file = await getFileById(id);
  if (!file) {
    return new NextResponse('File not found', { status: 404 });
  }
  return NextResponse.json(file);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireAdmin();
  if (auth?.error) {
    return auth.error;
  }

  const payload = await request.json();
  const updated = await updateFileRecord(id, {
    name: payload.name,
    type: payload.type,
    isFree: payload.isFree,
    productIds: payload.productIds,
    courseIds: payload.courseIds,
  });

  return NextResponse.json(updated);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireAdmin();
  if (auth?.error) {
    return auth.error;
  }

  const file = await getFileById(id);
  if (file?.path) {
    await deleteFileFromStorage(file.path);
  }
  await deleteFile(id);
  return NextResponse.json({ success: true });
}

