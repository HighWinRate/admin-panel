'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from './ui/button';

export function AdminNavbar() {
  const { user, logout, isAuthenticated } = useAuth();

  return (
    <nav className="border-b shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold text-primary">
              High Win Rate - پنل مدیریت
            </Link>
          </div>
          
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <Link href="/dashboard" className="text-foreground hover:text-primary transition-colors">
                  داشبورد
                </Link>
                <Link href="/admin/products" className="text-foreground hover:text-primary transition-colors">
                  محصولات
                </Link>
                <Link href="/admin/courses" className="text-foreground hover:text-primary transition-colors">
                  دوره‌ها
                </Link>
                <Link href="/admin/categories" className="text-foreground hover:text-primary transition-colors">
                  دسته‌بندی‌ها
                </Link>
                <Link href="/admin/users" className="text-foreground hover:text-primary transition-colors">
                  کاربران
                </Link>
                <Link href="/admin/transactions" className="text-foreground hover:text-primary transition-colors">
                  تراکنش‌ها
                </Link>
                <Link href="/admin/subscriptions" className="text-foreground hover:text-primary transition-colors">
                  اشتراک‌ها
                </Link>
                <Link href="/admin/subscription-plans" className="text-foreground hover:text-primary transition-colors">
                  پلن‌های اشتراک
                </Link>
                <Link href="/admin/bank-accounts" className="text-foreground hover:text-primary transition-colors">
                  حساب‌های بانکی
                </Link>
                <Link href="/admin/tickets" className="text-foreground hover:text-primary transition-colors">
                  تیکت‌ها
                </Link>
                {user && (
                  <span className="text-foreground">
                    {user.first_name} {user.last_name}
                  </span>
                )}
                <Button variant="outline" size="sm" onClick={logout}>
                  خروج
                </Button>
              </>
            ) : (
              <Button asChild size="sm">
                <Link href="/login">ورود</Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

