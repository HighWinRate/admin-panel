import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export type RequireAdminOptions = {
  allowSupport?: boolean;
};

/**
 * Requires admin authentication for API routes.
 * Checks the role from public.users table (with fallback to user_metadata).
 * 
 * @param options.allowSupport - If true, allows 'support' role in addition to 'admin'
 * @returns Object with either { error } or { user, role }
 */
export async function requireAdmin(options: RequireAdminOptions = {}) {
  const { allowSupport = false } = options;
  
  // 1. Check if user is authenticated
  const supabase = await createServerSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  
  if (!session?.user) {
    return { error: new NextResponse('Authentication required', { status: 401 }) };
  }

  // 2. Get role from public.users table
  const admin = createAdminClient();
  const { data: userProfile } = await admin
    .from('users')
    .select('role')
    .eq('id', session.user.id)
    .single();

  // 3. Determine role (with fallback to user_metadata)
  const role = userProfile?.role 
    || (session.user.user_metadata?.role as string) 
    || 'user';

  // 4. Check if user has required role
  const allowedRoles = ['admin'];
  if (allowSupport) {
    allowedRoles.push('support');
  }

  if (!allowedRoles.includes(role)) {
    return { error: new NextResponse('Forbidden', { status: 403 }) };
  }

  return { 
    user: session.user,
    role 
  };
}
