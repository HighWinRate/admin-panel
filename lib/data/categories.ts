import { createAdminClient } from '@/lib/supabase/admin';
import { Category } from '@/lib/types';

export async function listCategories(): Promise<Category[]> {
  const client = createAdminClient();
  const { data, error } = await client
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) {
    throw error;
  }
  return data || [];
}

export async function getCategory(categoryId: string): Promise<Category | null> {
  const client = createAdminClient();
  const { data, error } = await client
    .from('categories')
    .select('*')
    .eq('id', categoryId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw error;
  }
  return data || null;
}

export async function createCategory(payload: Partial<Category>): Promise<Category> {
  const client = createAdminClient();
  const { data, error } = await client
    .from('categories')
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    throw error;
  }
  if (!data) {
    throw new Error('Failed to create category');
  }
  return data;
}

export async function updateCategory(categoryId: string, payload: Partial<Category>): Promise<Category> {
  const client = createAdminClient();
  const { data, error } = await client
    .from('categories')
    .update(payload)
    .eq('id', categoryId)
    .select('*')
    .single();

  if (error) {
    throw error;
  }
  if (!data) {
    throw new Error('Category not found after update');
  }
  return data;
}

export async function deleteCategory(categoryId: string): Promise<void> {
  const client = createAdminClient();
  const { error } = await client.from('categories').delete().eq('id', categoryId);
  if (error) {
    throw error;
  }
}

