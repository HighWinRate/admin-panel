import { Buffer } from 'buffer';
import { NextResponse } from 'next/server';
import { createFile, uploadFileToStorage } from '@/lib/data/files';
import { requireAdmin } from '@/lib/auth';

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth?.error) {
    return auth.error;
  }

  const formData = await request.formData();
  const file = formData.get('file');
  if (!file || !(file instanceof File)) {
    return new NextResponse('File is required', { status: 400 });
  }

  const name = (formData.get('name') as string) || file.name;
  const type = (formData.get('type') as string) || 'pdf';
  const isFree = formData.get('isFree') === 'true';
  const productIds = formData.getAll('productIds').map((value) => String(value));
  const courseIds = formData.getAll('courseIds').map((value) => String(value));

  const buffer = Buffer.from(await file.arrayBuffer());
  const path = await uploadFileToStorage(name, buffer, file.type);

  const created = await createFile({
    name,
    type: type as 'video' | 'pdf' | 'docx' | 'zip',
    isFree,
    path,
    size: file.size,
    mimetype: file.type,
    productIds: productIds.length > 0 ? productIds : undefined,
    courseIds: courseIds.length > 0 ? courseIds : undefined,
  });

  return NextResponse.json(created);
}

