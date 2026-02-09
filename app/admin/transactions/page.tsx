'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Transaction } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

async function fetchTransactionsList(): Promise<Transaction[]> {
  const response = await fetch('/api/admin/transactions', {
    cache: 'no-store',
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error('Failed to load transactions');
  }
  return response.json();
}

export default function TransactionsPage() {
  const router = useRouter();
  const { user, isAuthenticated, loading } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [gatewayFilter, setGatewayFilter] = useState<string>('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [formData, setFormData] = useState({
    status: '',
    amount: '',
    discount_amount: '',
    crypto_currency: '',
    crypto_amount: '',
    tx_hash: '',
    gateway: '',
    paid_at: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadTransactions = async () => {
    const data = await fetchTransactionsList();
    setTransactions(data);
  };

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace('/login');
      return;
    }

    if (user && user.role !== 'admin') {
      router.replace('/login');
      return;
    }

    async function fetchTransactions() {
      try {
        await loadTransactions();
      } catch (error) {
        console.error('Error fetching transactions:', error);
      } finally {
        setLoadingTransactions(false);
      }
    }

    if (isAuthenticated) {
      fetchTransactions();
    }
  }, [user, isAuthenticated, loading, router]);

  if (loading || loadingTransactions) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <p className="text-muted-foreground">در حال بارگذاری...</p>
        </div>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return null;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/20 text-green-400 border border-green-500/30';
      case 'pending':
        return 'bg-amber-500/20 text-amber-400 border border-amber-500/30';
      case 'failed':
        return 'bg-red-500/20 text-red-400 border border-red-500/30';
      case 'cancelled':
        return 'bg-muted text-muted-foreground border border-border';
      default:
        return 'bg-muted text-muted-foreground border border-border';
    }
  };

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setFormData({
      status: transaction.status || '',
      amount: transaction.amount?.toString() || '',
      discount_amount: (transaction as any).discount_amount?.toString() || '',
      crypto_currency: transaction.cryptoCurrency || '',
      crypto_amount: transaction.cryptoAmount?.toString() || '',
      tx_hash: (transaction as any).tx_hash || '',
      gateway: (transaction as any).gateway || '',
      paid_at: transaction.paid_at
        ? new Date(transaction.paid_at).toISOString().slice(0, 16)
        : '',
    });
    setErrors({});
    setIsEditModalOpen(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (formData.status && !['pending', 'completed', 'failed', 'cancelled'].includes(formData.status)) {
      newErrors.status = 'وضعیت نامعتبر است';
    }

    if (formData.amount && (isNaN(Number(formData.amount)) || Number(formData.amount) < 0)) {
      newErrors.amount = 'مبلغ باید یک عدد مثبت باشد';
    }

    if (formData.discount_amount && (isNaN(Number(formData.discount_amount)) || Number(formData.discount_amount) < 0)) {
      newErrors.discount_amount = 'مقدار تخفیف باید یک عدد مثبت باشد';
    }

    if (formData.crypto_amount && (isNaN(Number(formData.crypto_amount)) || Number(formData.crypto_amount) < 0)) {
      newErrors.crypto_amount = 'مقدار ارز دیجیتال باید یک عدد مثبت باشد';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (!editingTransaction) return;

    setIsSubmitting(true);

    try {
      const updateData: Record<string, unknown> = {};

      if (formData.status) updateData.status = formData.status;
      if (formData.amount) updateData.amount = Number(formData.amount);
      if (formData.discount_amount) updateData.discount_amount = Number(formData.discount_amount);
      if (formData.crypto_currency) updateData.crypto_currency = formData.crypto_currency;
      if (formData.crypto_amount) updateData.crypto_amount = Number(formData.crypto_amount);
      if (formData.tx_hash) updateData.tx_hash = formData.tx_hash;
      if (formData.gateway) updateData.gateway = formData.gateway;
      if (formData.paid_at) updateData.paid_at = new Date(formData.paid_at).toISOString();

      const response = await fetch(`/api/admin/transactions/${editingTransaction.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const message = await response.text().catch(() => 'خطا در به‌روزرسانی تراکنش');
        throw new Error(message);
      }

      await loadTransactions();

      setIsEditModalOpen(false);
      setEditingTransaction(null);
      setFormData({
        status: '',
        amount: '',
        discount_amount: '',
        crypto_currency: '',
        crypto_amount: '',
        tx_hash: '',
        gateway: '',
        paid_at: '',
      });
    } catch (error: any) {
      console.error('Error updating transaction:', error);
      setErrors({ submit: error.message || 'خطا در به‌روزرسانی تراکنش' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseModal = () => {
    setIsEditModalOpen(false);
    setEditingTransaction(null);
    setFormData({
      status: '',
      amount: '',
      discount_amount: '',
      crypto_currency: '',
      crypto_amount: '',
      tx_hash: '',
      gateway: '',
      paid_at: '',
    });
    setErrors({});
  };

  const filteredTransactions = gatewayFilter
    ? transactions.filter((t) => (t.gateway || '') === gatewayFilter)
    : transactions;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-wrap items-center gap-4 justify-between mb-8">
        <h1 className="text-3xl font-bold text-foreground">مدیریت تراکنش‌ها</h1>
        <select
          value={gatewayFilter}
          onChange={(e) => setGatewayFilter(e.target.value)}
          className="border border-input bg-background text-foreground rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">همه درگاه‌ها</option>
          <option value="manual">دستی (کارت بانکی)</option>
          <option value="crypto_mock">ارز دیجیتال (mock)</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                شناسه
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                کاربر
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                مبلغ
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                درگاه / بانک
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                وضعیت
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                تاریخ
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                عملیات
              </th>
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-border">
            {filteredTransactions.map((transaction) => (
              <tr key={transaction.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground font-mono">
                  {transaction.refId || (transaction as any).ref_id}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                  {transaction.user?.email || transaction.user_id}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                  {new Intl.NumberFormat('fa-IR').format(transaction.amount)} تومان
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                  {transaction.gateway === 'manual' && transaction.bank_account
                    ? transaction.bank_account.bank_name
                    : transaction.gateway || '—'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                      transaction.status
                    )}`}
                  >
                    {transaction.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                  {new Date(transaction.created_at).toLocaleDateString('fa-IR')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(transaction)}
                  >
                    ویرایش
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={(open) => { if (!open) handleCloseModal(); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>ویرایش تراکنش</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                وضعیت
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-input bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">انتخاب کنید</option>
                <option value="pending">در انتظار</option>
                <option value="completed">تکمیل شده</option>
                <option value="failed">ناموفق</option>
                <option value="cancelled">لغو شده</option>
              </select>
              {errors.status && (
                <p className="mt-1 text-sm text-red-600">{errors.status}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">مبلغ (تومان)</Label>
              <Input
                id="amount"
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleInputChange}
                min="0"
                step="0.01"
              />
              {errors.amount && (
                <p className="text-sm text-destructive">{errors.amount}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="discount_amount">مقدار تخفیف (تومان)</Label>
              <Input
                id="discount_amount"
                type="number"
                name="discount_amount"
                value={formData.discount_amount}
                onChange={handleInputChange}
                min="0"
                step="0.01"
              />
              {errors.discount_amount && (
                <p className="text-sm text-destructive">{errors.discount_amount}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="crypto_currency">ارز دیجیتال</Label>
              <Input
                id="crypto_currency"
                type="text"
                name="crypto_currency"
                value={formData.crypto_currency}
                onChange={handleInputChange}
                placeholder="مثال: BTC, ETH"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="crypto_amount">مقدار ارز دیجیتال</Label>
              <Input
                id="crypto_amount"
                type="number"
                name="crypto_amount"
                value={formData.crypto_amount}
                onChange={handleInputChange}
                min="0"
                step="0.00000001"
              />
              {errors.crypto_amount && (
                <p className="text-sm text-destructive">{errors.crypto_amount}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="tx_hash">Hash تراکنش</Label>
              <Input
                id="tx_hash"
                type="text"
                name="tx_hash"
                value={formData.tx_hash}
                onChange={handleInputChange}
                placeholder="blockchain hash"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gateway">درگاه پرداخت</Label>
              <Input
                id="gateway"
                type="text"
                name="gateway"
                value={formData.gateway}
                onChange={handleInputChange}
                placeholder="مثال: crypto_mock"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="paid_at">تاریخ پرداخت</Label>
              <Input
                id="paid_at"
                type="datetime-local"
                name="paid_at"
                value={formData.paid_at}
                onChange={handleInputChange}
              />
            </div>
          </div>

          {formData.status === 'completed' && (
            <p className="text-sm text-amber-400 bg-amber-500/20 border border-amber-500/30 rounded-lg p-3">
              در صورت پرداخت دستی، اطمینان حاصل کنید کاربر تیکت و رسید ارسال کرده است.
            </p>
          )}

          {errors.submit && (
            <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
              <p className="text-sm text-red-400">{errors.submit}</p>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseModal}
              disabled={isSubmitting}
            >
              انصراف
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
            </Button>
          </DialogFooter>
        </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

