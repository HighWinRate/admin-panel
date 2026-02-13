import { createAdminClient } from '../supabase/admin';
import type {
  SubscriptionPlan,
  UserSubscription,
  UserSubscriptionWithDetails,
  CreateSubscriptionData,
  User,
} from '../types';

// =============================
// Subscription Plans
// =============================

export async function getAllPlans(): Promise<SubscriptionPlan[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('subscription_plans')
    .select('*')
    .order('duration_days', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getPlanById(
  planId: string,
): Promise<SubscriptionPlan | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('id', planId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

export async function createPlan(
  planData: Omit<SubscriptionPlan, 'id' | 'created_at' | 'updated_at'>,
): Promise<SubscriptionPlan> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('subscription_plans')
    .insert(planData)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updatePlan(
  planId: string,
  planData: Partial<SubscriptionPlan>,
): Promise<SubscriptionPlan> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('subscription_plans')
    .update(planData)
    .eq('id', planId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deletePlan(planId: string): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('subscription_plans')
    .delete()
    .eq('id', planId);

  if (error) throw error;
}

// =============================
// User Subscriptions
// =============================

export async function getAllSubscriptions(): Promise<
  UserSubscriptionWithDetails[]
> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('user_subscriptions')
    .select(
      `
      *,
      plan:subscription_plans(*),
      user:users(id, email, first_name, last_name)
    `,
    )
    .order('created_at', { ascending: false });

  if (error) throw error;

  const now = new Date();

  return (
    data?.map((sub) => {
      const endDate = new Date(sub.end_date);
      const daysRemaining = Math.max(
        0,
        Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
      );

      return {
        ...sub,
        plan_name: sub.plan?.name || '',
        days_remaining: daysRemaining,
        is_expiring_soon: daysRemaining <= 7,
        is_expired: daysRemaining <= 0,
      };
    }) || []
  );
}

export async function getUserSubscriptions(
  userId: string,
): Promise<UserSubscriptionWithDetails[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('user_subscriptions')
    .select(
      `
      *,
      plan:subscription_plans(*),
      user:users(id, email, first_name, last_name)
    `,
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  const now = new Date();

  return (
    data?.map((sub) => {
      const endDate = new Date(sub.end_date);
      const daysRemaining = Math.max(
        0,
        Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
      );

      return {
        ...sub,
        plan_name: sub.plan?.name || '',
        days_remaining: daysRemaining,
        is_expiring_soon: daysRemaining <= 7,
        is_expired: daysRemaining <= 0,
      };
    }) || []
  );
}

export async function getSubscriptionById(
  subscriptionId: string,
): Promise<UserSubscriptionWithDetails | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('user_subscriptions')
    .select(
      `
      *,
      plan:subscription_plans(*),
      user:users(id, email, first_name, last_name)
    `,
    )
    .eq('id', subscriptionId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  const now = new Date();
  const endDate = new Date(data.end_date);
  const daysRemaining = Math.max(
    0,
    Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
  );

  return {
    ...data,
    plan_name: data.plan?.name || '',
    days_remaining: daysRemaining,
    is_expiring_soon: daysRemaining <= 7,
    is_expired: daysRemaining <= 0,
  };
}

export async function createSubscription(
  subscriptionData: CreateSubscriptionData,
): Promise<UserSubscription> {
  const supabase = createAdminClient();

  const { user_id, plan_id, transaction_id, start_date } = subscriptionData;

  // Get plan details
  const { data: plan, error: planError } = await supabase
    .from('subscription_plans')
    .select('duration_days')
    .eq('id', plan_id)
    .single();

  if (planError) throw planError;

  // Calculate dates
  const startDate = start_date ? new Date(start_date) : new Date();
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + plan.duration_days);

  // Create subscription
  const { data, error } = await supabase
    .from('user_subscriptions')
    .insert({
      user_id,
      plan_id,
      transaction_id,
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      status: 'active',
      auto_renew: false,
    })
    .select(
      `
      *,
      plan:subscription_plans(*)
    `,
    )
    .single();

  if (error) throw error;
  return data;
}

export async function updateSubscription(
  subscriptionId: string,
  subscriptionData: Partial<UserSubscription>,
): Promise<UserSubscription> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('user_subscriptions')
    .update(subscriptionData)
    .eq('id', subscriptionId)
    .select(
      `
      *,
      plan:subscription_plans(*)
    `,
    )
    .single();

  if (error) throw error;
  return data;
}

export async function deleteSubscription(subscriptionId: string): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('user_subscriptions')
    .delete()
    .eq('id', subscriptionId);

  if (error) throw error;
}

// =============================
// Admin Actions
// =============================

export async function getExpiringSubscriptions(
  daysBeforeExpiry: number = 7,
): Promise<UserSubscriptionWithDetails[]> {
  const supabase = createAdminClient();

  const now = new Date();
  const targetDate = new Date(now);
  targetDate.setDate(targetDate.getDate() + daysBeforeExpiry);

  const { data, error } = await supabase
    .from('user_subscriptions')
    .select(
      `
      *,
      plan:subscription_plans(*),
      user:users(id, email, first_name, last_name)
    `,
    )
    .eq('status', 'active')
    .gte('end_date', now.toISOString())
    .lte('end_date', targetDate.toISOString())
    .order('end_date', { ascending: true });

  if (error) throw error;

  return (
    data?.map((sub) => {
      const endDate = new Date(sub.end_date);
      const daysRemaining = Math.max(
        0,
        Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
      );

      return {
        ...sub,
        plan_name: sub.plan?.name || '',
        days_remaining: daysRemaining,
        is_expiring_soon: daysRemaining <= 7,
        is_expired: daysRemaining <= 0,
      };
    }) || []
  );
}

export async function expireSubscriptions(): Promise<number> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('user_subscriptions')
    .update({ status: 'expired' })
    .eq('status', 'active')
    .lt('end_date', new Date().toISOString())
    .select('id');

  if (error) throw error;
  return data?.length || 0;
}

// =============================
// Statistics
// =============================

export async function getSubscriptionStats() {
  const supabase = createAdminClient();

  // Total subscriptions
  const { count: totalCount } = await supabase
    .from('user_subscriptions')
    .select('*', { count: 'exact', head: true });

  // Active subscriptions
  const { count: activeCount } = await supabase
    .from('user_subscriptions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active')
    .gt('end_date', new Date().toISOString());

  // Expired subscriptions
  const { count: expiredCount } = await supabase
    .from('user_subscriptions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'expired');

  // Expiring soon (within 7 days)
  const expiringDate = new Date();
  expiringDate.setDate(expiringDate.getDate() + 7);

  const { count: expiringSoonCount } = await supabase
    .from('user_subscriptions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active')
    .gte('end_date', new Date().toISOString())
    .lte('end_date', expiringDate.toISOString());

  return {
    total: totalCount || 0,
    active: activeCount || 0,
    expired: expiredCount || 0,
    expiring_soon: expiringSoonCount || 0,
  };
}
