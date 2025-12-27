'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { adminApiClient, Product, Course, User, Transaction } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

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
      router.replace('/login');
      return;
    }

    if (user && user.role !== 'admin') {
      router.replace('/login');
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
          <Skeleton className="h-6 w-48 mx-auto mb-4" />
          <Skeleton className="h-4 w-32 mx-auto" />
        </div>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold mb-8">
        داشبورد مدیریت
      </h1>
      <p className="text-muted-foreground mb-8">
        خوش آمدید {user.first_name} {user.last_name}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">محصولات</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">{stats.products}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">دوره‌ها</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">{stats.courses}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">کاربران</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">{stats.users}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">تراکنش‌ها</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">{stats.transactions}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>دسترسی سریع</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <a href="/admin/products" className="block text-primary hover:underline">
                مدیریت محصولات
              </a>
              <a href="/admin/courses" className="block text-primary hover:underline">
                مدیریت دوره‌ها
              </a>
              <a href="/admin/users" className="block text-primary hover:underline">
                مدیریت کاربران
              </a>
              <a href="/admin/transactions" className="block text-primary hover:underline">
                مدیریت تراکنش‌ها
              </a>
              <a href="/admin/discounts" className="block text-primary hover:underline">
                مدیریت کدهای تخفیف
              </a>
              <a href="/admin/files" className="block text-primary hover:underline">
                مدیریت فایل‌ها
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

