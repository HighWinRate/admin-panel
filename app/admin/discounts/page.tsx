'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { adminApiClient, DiscountCode } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function DiscountsPage() {
  const router = useRouter();
  const { user, isAuthenticated, loading } = useAuth();
  const [discounts, setDiscounts] = useState<DiscountCode[]>([]);
  const [loadingDiscounts, setLoadingDiscounts] = useState(true);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
      return;
    }

    if (user && user.role !== 'admin') {
      router.push('/login');
      return;
    }

    async function fetchDiscounts() {
      try {
        const data = await adminApiClient.getDiscountCodes();
        setDiscounts(data);
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
        <Button variant="primary">افزودن کد تخفیف جدید</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {discounts.map((discount) => (
          <Card key={discount.id} className="p-6">
            <h3 className="text-xl font-semibold mb-2">{discount.code}</h3>
            <p className="text-gray-600 text-sm mb-4">{discount.description}</p>
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
            <div className="flex gap-2">
              <Button variant="outline" size="sm">ویرایش</Button>
              <Button variant="danger" size="sm">حذف</Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

