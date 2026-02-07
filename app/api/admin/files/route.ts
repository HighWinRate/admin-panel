import { NextResponse } from 'next/server';
import { listFiles } from '@/lib/data/files';
import { requireAdmin } from '@/lib/auth';

export async function GET() {
  const auth = await requireAdmin();
  if (auth?.error) {
    return auth.error;
  }

  const files = await listFiles();
  return NextResponse.json(files);
}

