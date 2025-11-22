'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from './ui/Button';

export function AdminNavbar() {
  const { user, logout, isAuthenticated } = useAuth();

  return (
    <nav className="bg-white dark:bg-gray-800 shadow-md dark:shadow-gray-900/50 border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold text-blue-600 dark:text-blue-400">
              High Win Rate - پنل مدیریت
            </Link>
          </div>
          
          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <>
                <Link href="/dashboard" className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  داشبورد
                </Link>
                <Link href="/admin/products" className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  محصولات
                </Link>
                <Link href="/admin/courses" className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  دوره‌ها
                </Link>
                <Link href="/admin/categories" className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  دسته‌بندی‌ها
                </Link>
                <Link href="/admin/users" className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  کاربران
                </Link>
                {user && (
                  <span className="text-gray-700 dark:text-gray-300">
                    {user.first_name} {user.last_name}
                  </span>
                )}
                <Button variant="outline" size="sm" onClick={logout}>
                  خروج
                </Button>
              </>
            ) : (
              <Link href="/login">
                <Button variant="primary" size="sm">ورود</Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

