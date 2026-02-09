import { createAdminClient } from '@/lib/supabase/admin';
import { BankAccount } from '@/lib/types';

export async function listBankAccounts(): Promise<BankAccount[]> {
  const client = createAdminClient();
  const { data, error } = await client
    .from('bank_accounts')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getBankAccountById(id: string): Promise<BankAccount | null> {
  const client = createAdminClient();
  const { data, error } = await client
    .from('bank_accounts')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

export async function createBankAccount(
  payload: Omit<BankAccount, 'id' | 'created_at' | 'updated_at'>
): Promise<BankAccount> {
  const client = createAdminClient();
  const { data, error } = await client
    .from('bank_accounts')
    .insert({
      card_number: payload.card_number,
      account_holder: payload.account_holder,
      bank_name: payload.bank_name,
      iban: payload.iban || null,
      is_active: payload.is_active ?? true,
      updated_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (error) throw error;
  if (!data) throw new Error('Failed to create bank account');
  return data;
}

export async function updateBankAccountById(
  id: string,
  payload: Partial<Pick<BankAccount, 'card_number' | 'account_holder' | 'bank_name' | 'iban' | 'is_active'>>
): Promise<BankAccount> {
  const client = createAdminClient();
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (payload.card_number !== undefined) update.card_number = payload.card_number;
  if (payload.account_holder !== undefined) update.account_holder = payload.account_holder;
  if (payload.bank_name !== undefined) update.bank_name = payload.bank_name;
  if (payload.iban !== undefined) update.iban = payload.iban;
  if (payload.is_active !== undefined) update.is_active = payload.is_active;

  const { data, error } = await client
    .from('bank_accounts')
    .update(update)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  if (!data) throw new Error('Bank account not found after update');
  return data;
}

export async function deleteBankAccountById(id: string): Promise<void> {
  const client = createAdminClient();
  const { error } = await client.from('bank_accounts').delete().eq('id', id);
  if (error) throw error;
}
