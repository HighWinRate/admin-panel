'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { adminApiClient, Product, Course, User, Transaction } from '@/lib/api';
import { Card } from '@/components/ui/Card';

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, loading } = useAuth();
  const [stats, setStats] = useState({
    products: 0,
    courses: 0,
    users: 0,
    transactions: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
      return;
    }

    if (user && user.role !== 'admin') {
      router.push('/login');
      return;
    }

    async function fetchStats() {
      try {
        const [products, courses, users, transactions] = await Promise.all([
          adminApiClient.getProducts(),
          adminApiClient.getCourses(),
          adminApiClient.getUsers(),
          adminApiClient.getTransactions().catch((err) => {
            console.error('Error fetching transactions:', err);
            return []; // Return empty array on error
          }),
        ]);

        setStats({
          products: products.length,
          courses: courses.length,
          users: users.length,
          transactions: transactions.length,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
        // Set stats to 0 on error to avoid breaking the UI
        setStats({
          products: 0,
          courses: 0,
          users: 0,
          transactions: 0,
        });
      } finally {
        setLoadingStats(false);
      }
    }

    if (isAuthenticated) {
      fetchStats();
    }
  }, [user, isAuthenticated, loading, router]);

  if (loading || loadingStats) {
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
      <h1 className="text-3xl font-bold text-gray-900 mb-8">
        داشبورد مدیریت
      </h1>
      <p className="text-gray-600 mb-8">
        خوش آمدید {user.first_name} {user.last_name}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">محصولات</h3>
          <p className="text-3xl font-bold text-blue-600">{stats.products}</p>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">دوره‌ها</h3>
          <p className="text-3xl font-bold text-green-600">{stats.courses}</p>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">کاربران</h3>
          <p className="text-3xl font-bold text-purple-600">{stats.users}</p>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">تراکنش‌ها</h3>
          <p className="text-3xl font-bold text-orange-600">{stats.transactions}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">دسترسی سریع</h2>
          <div className="space-y-2">
            <a href="/admin/products" className="block text-blue-600 hover:underline">
              مدیریت محصولات
            </a>
            <a href="/admin/courses" className="block text-blue-600 hover:underline">
              مدیریت دوره‌ها
            </a>
            <a href="/admin/users" className="block text-blue-600 hover:underline">
              مدیریت کاربران
            </a>
            <a href="/admin/transactions" className="block text-blue-600 hover:underline">
              مدیریت تراکنش‌ها
            </a>
            <a href="/admin/discounts" className="block text-blue-600 hover:underline">
              مدیریت کدهای تخفیف
            </a>
            <a href="/admin/files" className="block text-blue-600 hover:underline">
              مدیریت فایل‌ها
            </a>
          </div>
        </Card>
      </div>
    </div>
  );
}

