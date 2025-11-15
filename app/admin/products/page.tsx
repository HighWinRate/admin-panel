'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { adminApiClient, Product } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function ProductsPage() {
  const router = useRouter();
  const { user, isAuthenticated, loading } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
      return;
    }

    if (user && user.role !== 'admin') {
      router.push('/login');
      return;
    }

    async function fetchProducts() {
      try {
        const data = await adminApiClient.getProducts();
        setProducts(data);
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoadingProducts(false);
      }
    }

    if (isAuthenticated) {
      fetchProducts();
    }
  }, [user, isAuthenticated, loading, router]);

  if (loading || loadingProducts) {
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
        <h1 className="text-3xl font-bold text-gray-900">مدیریت محصولات</h1>
        <Button variant="primary">افزودن محصول جدید</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => (
          <Card key={product.id} className="p-6">
            <h3 className="text-xl font-semibold mb-2">{product.title}</h3>
            <p className="text-gray-600 text-sm mb-4">{product.description}</p>
            <div className="flex justify-between items-center mb-4">
              <span className="text-blue-600 font-semibold">${product.price}</span>
              <span className="text-green-600">نرخ برد: {product.winrate}%</span>
            </div>
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

