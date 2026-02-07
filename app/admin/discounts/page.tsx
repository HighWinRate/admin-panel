'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { DiscountCode } from '@/lib/types';
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

async function fetchDiscountsList(): Promise<DiscountCode[]> {
  const response = await fetch('/api/admin/discounts', {
    cache: 'no-store',
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error('Failed to load discounts');
  }
  return response.json();
}

async function fetchDiscountDetails(discountId: string): Promise<DiscountCode> {
  const response = await fetch(`/api/admin/discounts/${discountId}`, {
    cache: 'no-store',
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error('Failed to load discount');
  }
  return response.json();
}

export default function DiscountsPage() {
  const router = useRouter();
  const { user, isAuthenticated, loading } = useAuth();
  const [discounts, setDiscounts] = useState<DiscountCode[]>([]);
  const [loadingDiscounts, setLoadingDiscounts] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDiscountId, setEditingDiscountId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    amount: '',
    type: 'percentage' as 'percentage' | 'fixed',
    is_active: true,
    max_uses: '',
    start_date: '',
    end_date: '',
    description: '',
    minimum_amount: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const loadDiscounts = async () => {
    const data = await fetchDiscountsList();
    setDiscounts(data);
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

    async function fetchDiscounts() {
      try {
        await loadDiscounts();
      } catch (error) {
        console.error('Error fetching discounts:', error);
      } finally {
        setLoadingDiscounts(false);
      }
    }

    if (isAuthenticated) {
      fetchDiscounts();
    }
  }, [user, isAuthenticated, loading, router]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.code.trim()) {
      newErrors.code = 'کد تخفیف الزامی است';
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'مقدار تخفیف باید بیشتر از صفر باشد';
    }
    if (formData.type === 'percentage' && parseFloat(formData.amount) > 100) {
      newErrors.amount = 'درصد تخفیف نمی‌تواند بیشتر از 100 باشد';
    }
    if (formData.max_uses && parseFloat(formData.max_uses) <= 0) {
      newErrors.max_uses = 'حداکثر استفاده باید بیشتر از صفر باشد';
    }
    if (formData.minimum_amount && parseFloat(formData.minimum_amount) < 0) {
      newErrors.minimum_amount = 'حداقل مبلغ نمی‌تواند منفی باشد';
    }
    if (formData.start_date && formData.end_date) {
      if (new Date(formData.start_date) > new Date(formData.end_date)) {
        newErrors.end_date = 'تاریخ پایان باید بعد از تاریخ شروع باشد';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEdit = async (discountId: string) => {
    try {
      const discount = await fetchDiscountDetails(discountId);
      
      // Format dates if they exist
      let startDate = '';
      let endDate = '';
      if (discount.start_date) {
        const start = new Date(discount.start_date);
        startDate = start.toISOString().slice(0, 16);
      }
      if (discount.end_date) {
        const end = new Date(discount.end_date);
        endDate = end.toISOString().slice(0, 16);
      }

      setFormData({
        code: discount.code || '',
        amount: discount.amount?.toString() || '',
        type: discount.type || 'percentage',
        is_active: discount.is_active ?? true,
        max_uses: discount.max_uses?.toString() || '',
        start_date: startDate,
        end_date: endDate,
        description: discount.description || '',
        minimum_amount: discount.minimum_amount?.toString() || '',
      });
      setEditingDiscountId(discountId);
      setIsModalOpen(true);
    } catch (error: any) {
      console.error('Error fetching discount:', error);
      alert(error.message || 'خطا در بارگذاری کد تخفیف');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const discountData = {
        code: formData.code,
        amount: parseFloat(formData.amount),
        type: formData.type,
        is_active: formData.is_active,
        max_uses: formData.max_uses ? parseInt(formData.max_uses) : undefined,
        start_date: formData.start_date ? new Date(formData.start_date).toISOString() : undefined,
        end_date: formData.end_date ? new Date(formData.end_date).toISOString() : undefined,
        description: formData.description || undefined,
        minimum_amount: formData.minimum_amount ? parseFloat(formData.minimum_amount) : undefined,
      };

      const endpoint = editingDiscountId
        ? `/api/admin/discounts/${editingDiscountId}`
        : '/api/admin/discounts';
      const method = editingDiscountId ? 'PATCH' : 'POST';

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(discountData),
      });

      if (!response.ok) {
        const message = await response.text().catch(() => 'خطا در ذخیره کد تخفیف');
        throw new Error(message);
      }

      await loadDiscounts();

      setFormData({
        code: '',
        amount: '',
        type: 'percentage',
        is_active: true,
        max_uses: '',
        start_date: '',
        end_date: '',
        description: '',
        minimum_amount: '',
      });
      setEditingDiscountId(null);
      setIsModalOpen(false);
      setErrors({});
    } catch (error: any) {
      console.error('Error saving discount:', error);
      alert(error.message || 'خطا در ذخیره کد تخفیف');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('آیا از حذف این کد تخفیف اطمینان دارید؟')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/discounts/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const message = await response.text().catch(() => 'خطا در حذف کد تخفیف');
        throw new Error(message);
      }

      await loadDiscounts();
    } catch (error: any) {
      console.error('Error deleting discount:', error);
      alert(error.message || 'خطا در حذف کد تخفیف');
    }
  };

  if (loading || loadingDiscounts) {
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">مدیریت کدهای تخفیف</h1>
        <Button variant="default" onClick={() => setIsModalOpen(true)}>
          افزودن کد تخفیف جدید
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {discounts.map((discount) => (
          <Card key={discount.id} className="p-6">
            <h3 className="text-xl font-semibold mb-2">{discount.code}</h3>
            <p className="text-gray-600 text-sm mb-4">{discount.description || 'بدون توضیحات'}</p>
            <div className="flex justify-between items-center mb-4">
              <span className="text-blue-600 font-semibold">
                {discount.type === 'percentage' ? `${discount.amount}%` : `$${discount.amount}`}
              </span>
              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                discount.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {discount.is_active ? 'فعال' : 'غیرفعال'}
              </span>
            </div>
            {discount.max_uses && (
              <p className="text-xs text-gray-500 mb-4">
                استفاده: {discount.current_uses || 0} / {discount.max_uses}
              </p>
            )}
            {discount.minimum_amount && (
              <p className="text-xs text-gray-500 mb-4">
                حداقل مبلغ: ${discount.minimum_amount}
              </p>
            )}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleEdit(discount.id)}
              >
                ویرایش
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleDelete(discount.id)}
              >
                حذف
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={isModalOpen} onOpenChange={(open) => {
        if (!open) {
          setIsModalOpen(false);
          setEditingDiscountId(null);
          setFormData({
            code: '',
            amount: '',
            type: 'percentage',
            is_active: true,
            max_uses: '',
            start_date: '',
            end_date: '',
            description: '',
            minimum_amount: '',
          });
          setErrors({});
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingDiscountId ? 'ویرایش کد تخفیف' : 'افزودن کد تخفیف جدید'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">کد تخفیف *</Label>
              <Input
                id="code"
                name="code"
                value={formData.code}
                onChange={handleInputChange}
                required
                placeholder="مثال: SAVE20"
              />
              {errors.code && (
                <p className="text-sm text-destructive">{errors.code}</p>
              )}
            </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">مقدار تخفیف *</Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                step="0.01"
                min="0"
                max={formData.type === 'percentage' ? '100' : undefined}
                value={formData.amount}
                onChange={handleInputChange}
                required
              />
              {errors.amount && (
                <p className="text-sm text-destructive">{errors.amount}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                نوع تخفیف *
              </label>
              <select
                name="type"
                value={formData.type}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="percentage">درصدی (%)</option>
                <option value="fixed">مبلغ ثابت ($)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="flex items-center space-x-2 space-x-reverse cursor-pointer">
              <input
                type="checkbox"
                name="is_active"
                checked={formData.is_active}
                onChange={handleInputChange}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">کد تخفیف فعال است</span>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="max_uses">حداکثر تعداد استفاده</Label>
              <Input
                id="max_uses"
                name="max_uses"
                type="number"
                min="1"
                value={formData.max_uses}
                onChange={handleInputChange}
                placeholder="خالی = نامحدود"
              />
              {errors.max_uses && (
                <p className="text-sm text-destructive">{errors.max_uses}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="minimum_amount">حداقل مبلغ سفارش ($)</Label>
              <Input
                id="minimum_amount"
                name="minimum_amount"
                type="number"
                step="0.01"
                min="0"
                value={formData.minimum_amount}
                onChange={handleInputChange}
                placeholder="خالی = بدون محدودیت"
              />
              {errors.minimum_amount && (
                <p className="text-sm text-destructive">{errors.minimum_amount}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">تاریخ شروع</Label>
              <Input
                id="start_date"
                name="start_date"
                type="datetime-local"
                value={formData.start_date}
                onChange={handleInputChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_date">تاریخ پایان</Label>
              <Input
                id="end_date"
                name="end_date"
                type="datetime-local"
                value={formData.end_date}
                onChange={handleInputChange}
              />
              {errors.end_date && (
                <p className="text-sm text-destructive">{errors.end_date}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              توضیحات
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="توضیحات کد تخفیف (اختیاری)"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsModalOpen(false);
                setEditingDiscountId(null);
                setFormData({
                  code: '',
                  amount: '',
                  type: 'percentage',
                  is_active: true,
                  max_uses: '',
                  start_date: '',
                  end_date: '',
                  description: '',
                  minimum_amount: '',
                });
                setErrors({});
              }}
            >
              انصراف
            </Button>
            <Button type="submit" variant="default" disabled={isSubmitting}>
              {isSubmitting ? 'در حال ذخیره...' : editingDiscountId ? 'ذخیره تغییرات' : 'ایجاد کد تخفیف'}
            </Button>
          </DialogFooter>
        </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

