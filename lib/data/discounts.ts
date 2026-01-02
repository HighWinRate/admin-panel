import { createAdminClient } from '@/lib/supabase/admin';
import { DiscountCode } from '@/lib/types';

type DiscountPayload = Partial<DiscountCode> & {
  max_uses?: number | null;
  minimum_amount?: number | null;
};

export async function listDiscountCodes(): Promise<DiscountCode[]> {
  const client = createAdminClient();
  const { data, error } = await client
    .from<DiscountCode>('discount_codes')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }
  return data || [];
}

export async function getDiscountCodeById(id: string): Promise<DiscountCode | null> {
  const client = createAdminClient();
  const { data, error } = await client
    .from<DiscountCode>('discount_codes')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw error;
  }
  return data || null;
}

export async function createDiscountCode(payload: DiscountPayload): Promise<DiscountCode> {
  const client = createAdminClient();
  const { data, error } = await client
    .from<DiscountCode>('discount_codes')
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    throw error;
  }
  if (!data) {
    throw new Error('Failed to create discount code');
  }
  return data;
}

export async function updateDiscountCode(id: string, payload: DiscountPayload): Promise<DiscountCode> {
  const client = createAdminClient();
  const { data, error } = await client
    .from<DiscountCode>('discount_codes')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    throw error;
  }
  if (!data) {
    throw new Error('Discount code not found after update');
  }
  return data;
}

export async function deleteDiscountCode(id: string): Promise<void> {
  const client = createAdminClient();
  const { error } = await client.from('discount_codes').delete().eq('id', id);
  if (error) {
    throw error;
  }
}

