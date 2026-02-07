import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const TICKET_IMAGES_BUCKET = 'ticket-images';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

async function requireAuth() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) {
    return { error: new NextResponse('Authentication required', { status: 401 }) };
  }
  return { user: session.user };
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuth();
    if (auth?.error) {
      return auth.error;
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ message: 'فایلی انتخاب نشده است' }, { status: 400 });
    }

    // اعتبارسنجی نوع فایل
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { message: 'فرمت تصویر باید JPEG، PNG، GIF یا WebP باشد' },
        { status: 400 }
      );
    }

    // اعتبارسنجی حجم فایل
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { message: 'حجم تصویر نباید بیشتر از 10 مگابایت باشد' },
        { status: 400 }
      );
    }

    // تبدیل فایل به Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // ساخت نام یکتا برای فایل
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const fileName = `${timestamp}-${randomString}.${fileExtension}`;
    const storagePath = `admin/${auth.user.id}/${fileName}`;

    // آپلود به Supabase Storage
    const admin = createAdminClient();
    const { error: uploadError } = await admin.storage
      .from(TICKET_IMAGES_BUCKET)
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json(
        { message: 'خطا در آپلود تصویر: ' + uploadError.message },
        { status: 500 }
      );
    }

    // دریافت URL عمومی
    const {
      data: { publicUrl },
    } = admin.storage.from(TICKET_IMAGES_BUCKET).getPublicUrl(storagePath);

    // خواندن ابعاد تصویر (اگر در کلاینت ارسال شده باشد)
    const width = formData.get('width') ? parseInt(formData.get('width') as string) : undefined;
    const height = formData.get('height') ? parseInt(formData.get('height') as string) : undefined;

    return NextResponse.json({
      success: true,
      data: {
        url: publicUrl,
        path: storagePath,
        name: file.name,
        size: file.size,
        mimeType: file.type,
        width,
        height,
      },
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    return NextResponse.json(
      { message: 'خطای سرور در آپلود تصویر' },
      { status: 500 }
    );
  }
}
