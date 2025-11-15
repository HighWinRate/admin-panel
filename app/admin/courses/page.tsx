'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { adminApiClient, Course } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function CoursesPage() {
  const router = useRouter();
  const { user, isAuthenticated, loading } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
      return;
    }

    if (user && user.role !== 'admin') {
      router.push('/login');
      return;
    }

    async function fetchCourses() {
      try {
        const data = await adminApiClient.getCourses();
        setCourses(data);
      } catch (error) {
        console.error('Error fetching courses:', error);
      } finally {
        setLoadingCourses(false);
      }
    }

    if (isAuthenticated) {
      fetchCourses();
    }
  }, [user, isAuthenticated, loading, router]);

  if (loading || loadingCourses) {
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
        <h1 className="text-3xl font-bold text-gray-900">مدیریت دوره‌ها</h1>
        <Button variant="primary">افزودن دوره جدید</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses.map((course) => (
          <Card key={course.id} className="p-6">
            <h3 className="text-xl font-semibold mb-2">{course.title}</h3>
            <p className="text-gray-600 text-sm mb-4">{course.description}</p>
            {course.duration_minutes && (
              <p className="text-xs text-gray-500 mb-4">
                مدت زمان: {course.duration_minutes} دقیقه
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

