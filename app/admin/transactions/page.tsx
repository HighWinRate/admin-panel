'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { adminApiClient, Transaction } from '@/lib/api';
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

export default function TransactionsPage() {
  const router = useRouter();
  const { user, isAuthenticated, loading } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
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
        const data = await adminApiClient.getTransactions();
        setTransactions(data);
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
          <p className="text-gray-600">در حال بارگذاری...</p>
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
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
      const updateData: any = {};

      if (formData.status) updateData.status = formData.status;
      if (formData.amount) updateData.amount = Number(formData.amount);
      if (formData.discount_amount) updateData.discount_amount = Number(formData.discount_amount);
      if (formData.crypto_currency) updateData.crypto_currency = formData.crypto_currency;
      if (formData.crypto_amount) updateData.crypto_amount = Number(formData.crypto_amount);
      if (formData.tx_hash) updateData.tx_hash = formData.tx_hash;
      if (formData.gateway) updateData.gateway = formData.gateway;
      if (formData.paid_at) updateData.paid_at = new Date(formData.paid_at).toISOString();

      await adminApiClient.updateTransaction(editingTransaction.id, updateData);

      // Refresh transactions list
      const updatedTransactions = await adminApiClient.getTransactions();
      setTransactions(updatedTransactions);

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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">مدیریت تراکنش‌ها</h1>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white rounded-lg shadow-md">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                شناسه
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                کاربر
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                مبلغ
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                وضعیت
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                تاریخ
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                عملیات
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {transactions.map((transaction) => (
              <tr key={transaction.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {transaction.refId}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {transaction.user?.email || transaction.user_id}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  ${transaction.amount}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                      transaction.status
                    )}`}
                  >
                    {transaction.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
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
      <Modal
        isOpen={isEditModalOpen}
        onClose={handleCloseModal}
        title="ویرایش تراکنش"
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                وضعیت
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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

            <Input
              label="مبلغ (USD)"
              type="number"
              name="amount"
              value={formData.amount}
              onChange={handleInputChange}
              error={errors.amount}
              min="0"
              step="0.01"
            />

            <Input
              label="مقدار تخفیف (USD)"
              type="number"
              name="discount_amount"
              value={formData.discount_amount}
              onChange={handleInputChange}
              error={errors.discount_amount}
              min="0"
              step="0.01"
            />

            <Input
              label="ارز دیجیتال"
              type="text"
              name="crypto_currency"
              value={formData.crypto_currency}
              onChange={handleInputChange}
              placeholder="مثال: BTC, ETH"
            />

            <Input
              label="مقدار ارز دیجیتال"
              type="number"
              name="crypto_amount"
              value={formData.crypto_amount}
              onChange={handleInputChange}
              error={errors.crypto_amount}
              min="0"
              step="0.00000001"
            />

            <Input
              label="Hash تراکنش"
              type="text"
              name="tx_hash"
              value={formData.tx_hash}
              onChange={handleInputChange}
              placeholder="blockchain hash"
            />

            <Input
              label="درگاه پرداخت"
              type="text"
              name="gateway"
              value={formData.gateway}
              onChange={handleInputChange}
              placeholder="مثال: crypto_mock"
            />

            <Input
              label="تاریخ پرداخت"
              type="datetime-local"
              name="paid_at"
              value={formData.paid_at}
              onChange={handleInputChange}
            />
          </div>

          {errors.submit && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{errors.submit}</p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseModal}
              disabled={isSubmitting}
            >
              انصراف
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              ذخیره تغییرات
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

