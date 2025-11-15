'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from './ui/Button';

export function AdminNavbar() {
  const { user, logout, isAuthenticated } = useAuth();

  return (
    <nav className="bg-white shadow-md border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold text-blue-600">
              High Win Rate - پنل مدیریت
            </Link>
          </div>
          
          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <>
                <Link href="/dashboard" className="text-gray-700 hover:text-blue-600">
                  داشبورد
                </Link>
                <Link href="/admin/products" className="text-gray-700 hover:text-blue-600">
                  محصولات
                </Link>
                <Link href="/admin/courses" className="text-gray-700 hover:text-blue-600">
                  دوره‌ها
                </Link>
                <Link href="/admin/users" className="text-gray-700 hover:text-blue-600">
                  کاربران
                </Link>
                {user && (
                  <span className="text-gray-700">
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

