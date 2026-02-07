import { Buffer } from 'buffer';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { buildThumbnailUrl, updateProductThumbnail } from '@/lib/data/products';

const BUCKET = 'thumbnails';

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

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const auth = await requireAdmin();
  if (auth?.error) {
    return auth.error;
  }

  const formData = await request.formData();
  const file = formData.get('thumbnail');
  if (!file || !(file instanceof File)) {
    return new NextResponse('Thumbnail is required', { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const filename = `${id}/${Date.now()}-${file.name}`.replace(/\s+/g, '_');

  const admin = createAdminClient();
  const { data: uploadResult, error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(filename, buffer, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) {
    return new NextResponse(`Upload failed: ${uploadError.message}`, { status: 500 });
  }

  const updatedProduct = await updateProductThumbnail(id, filename);
  return NextResponse.json({
    ...updatedProduct,
    thumbnailUrl: buildThumbnailUrl(updatedProduct.thumbnail),
  });
}

