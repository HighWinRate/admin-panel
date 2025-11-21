'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { adminApiClient, Course, File } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';

export default function CoursesPage() {
  const router = useRouter();
  const { user, isAuthenticated, loading } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    fileIds: [] as string[],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
      return;
    }

    if (user && user.role !== 'admin') {
      router.push('/login');
      return;
    }

    async function fetchData() {
      try {
        const [coursesData, filesData] = await Promise.all([
          adminApiClient.getCourses(),
          adminApiClient.getFiles(),
        ]);
        setCourses(coursesData);
        setFiles(filesData);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoadingCourses(false);
      }
    }

    if (isAuthenticated) {
      fetchData();
    }
  }, [user, isAuthenticated, loading, router]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleFileSelect = (fileId: string) => {
    setFormData((prev) => {
      const fileIds = prev.fileIds.includes(fileId)
        ? prev.fileIds.filter((id) => id !== fileId)
        : [...prev.fileIds, fileId];
      return { ...prev, fileIds };
    });
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'عنوان دوره الزامی است';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEdit = async (courseId: string) => {
    try {
      const course = await adminApiClient.getCourse(courseId);
      
      setFormData({
        title: course.title || '',
        description: course.description || '',
        fileIds: course.files?.map((f) => f.id) || [],
      });
      setEditingCourseId(courseId);
      setIsModalOpen(true);
    } catch (error: any) {
      console.error('Error fetching course:', error);
      alert(error.message || 'خطا در بارگذاری دوره');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const courseData = {
        title: formData.title,
        description: formData.description || undefined,
        fileIds: formData.fileIds.length > 0 ? formData.fileIds : undefined,
      };

      if (editingCourseId) {
        // Update existing course
        await adminApiClient.updateCourse(editingCourseId, courseData);
      } else {
        // Create new course
        await adminApiClient.createCourse(courseData);
      }
      
      // Refresh courses list
      const updatedCourses = await adminApiClient.getCourses();
      setCourses(updatedCourses);
      
      // Reset form and close modal
      setFormData({
        title: '',
        description: '',
        fileIds: [],
      });
      setEditingCourseId(null);
      setIsModalOpen(false);
      setErrors({});
    } catch (error: any) {
      console.error('Error saving course:', error);
      alert(error.message || 'خطا در ذخیره دوره');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('آیا از حذف این دوره اطمینان دارید؟')) {
      return;
    }

    try {
      await adminApiClient.deleteCourse(id);
      const updatedCourses = await adminApiClient.getCourses();
      setCourses(updatedCourses);
    } catch (error: any) {
      console.error('Error deleting course:', error);
      alert(error.message || 'خطا در حذف دوره');
    }
  };

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
        <Button variant="primary" onClick={() => setIsModalOpen(true)}>
          افزودن دوره جدید
        </Button>
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
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleEdit(course.id)}
              >
                ویرایش
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => handleDelete(course.id)}
              >
                حذف
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingCourseId(null);
          setFormData({
            title: '',
            description: '',
            fileIds: [],
          });
          setErrors({});
        }}
        title={editingCourseId ? 'ویرایش دوره' : 'افزودن دوره جدید'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="عنوان دوره *"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            error={errors.title}
            required
          />

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
            />
          </div>

          {files.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                فایل‌های مرتبط
              </label>
              <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-2">
                {files.map((file) => (
                  <label
                    key={file.id}
                    className="flex items-center space-x-2 space-x-reverse p-2 hover:bg-gray-50 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={formData.fileIds.includes(file.id)}
                      onChange={() => handleFileSelect(file.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">
                      {file.name} ({file.type})
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsModalOpen(false);
                setEditingCourseId(null);
                setFormData({
                  title: '',
                  description: '',
                  fileIds: [],
                });
                setErrors({});
              }}
            >
              انصراف
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              {editingCourseId ? 'ذخیره تغییرات' : 'ایجاد دوره'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

