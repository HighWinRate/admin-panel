'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { adminApiClient, File } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function FilesPage() {
  const router = useRouter();
  const { user, isAuthenticated, loading } = useAuth();
  const [files, setFiles] = useState<File[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(true);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
      return;
    }

    if (user && user.role !== 'admin') {
      router.push('/login');
      return;
    }

    async function fetchFiles() {
      try {
        const data = await adminApiClient.getFiles();
        setFiles(data);
      } catch (error) {
        console.error('Error fetching files:', error);
      } finally {
        setLoadingFiles(false);
      }
    }

    if (isAuthenticated) {
      fetchFiles();
    }
  }, [user, isAuthenticated, loading, router]);

  if (loading || loadingFiles) {
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
        <h1 className="text-3xl font-bold text-gray-900">مدیریت فایل‌ها</h1>
        <Button variant="primary">آپلود فایل جدید</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {files.map((file) => (
          <Card key={file.id} className="p-6">
            <h3 className="text-xl font-semibold mb-2">{file.name}</h3>
            <p className="text-gray-600 text-sm mb-4">
              نوع: {file.type} | حجم: {(file.size / 1024 / 1024).toFixed(2)} MB
            </p>
            <div className="flex justify-between items-center mb-4">
              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                file.isFree ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
              }`}>
                {file.isFree ? 'رایگان' : 'پولی'}
              </span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">دانلود</Button>
              <Button variant="danger" size="sm">حذف</Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

