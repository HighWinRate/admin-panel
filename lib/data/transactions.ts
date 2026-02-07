import { createAdminClient } from '@/lib/supabase/admin';
import { Transaction } from '@/lib/types';

export async function listTransactions(): Promise<Transaction[]> {
  const client = createAdminClient();
  const { data, error } = await client
    .from('transactions')
    .select(
      `
      *,
      user:users (
        id,
        email,
        first_name,
        last_name
      ),
      product:products (
        id,
        title
      )
    `,
    )
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }
  return data || [];
}

export async function updateTransactionById(
  transactionId: string,
  payload: Partial<Transaction>,
): Promise<Transaction> {
  const client = createAdminClient();
  const { data, error } = await client
    .from('transactions')
    .update(payload)
    .eq('id', transactionId)
    .select('*')
    .single();

  if (error) {
    throw error;
  }
  if (!data) {
    throw new Error('Transaction not found after update');
  }
  return data;
}

