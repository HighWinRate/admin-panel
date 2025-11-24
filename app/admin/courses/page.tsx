'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { adminApiClient, Course, File, Category } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function CoursesPage() {
  const router = useRouter();
  const { user, isAuthenticated, loading } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    markdown_content: '',
    keywords: [] as string[],
    thumbnail: '',
    is_active: true,
    sort_order: '0',
    duration_minutes: '0',
    categoryId: '',
    fileIds: [] as string[],
  });
  const [keywordInput, setKeywordInput] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);

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
        const [coursesData, filesData, categoriesData] = await Promise.all([
          adminApiClient.getCourses(),
          adminApiClient.getFiles(),
          adminApiClient.getCategories(),
        ]);
        setCourses(coursesData);
        setFiles(filesData);
        setCategories(categoriesData);
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
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleAddKeyword = () => {
    if (keywordInput.trim() && !formData.keywords.includes(keywordInput.trim())) {
      setFormData((prev) => ({
        ...prev,
        keywords: [...prev.keywords, keywordInput.trim()],
      }));
      setKeywordInput('');
    }
  };

  const handleRemoveKeyword = (keyword: string) => {
    setFormData((prev) => ({
      ...prev,
      keywords: prev.keywords.filter((k) => k !== keyword),
    }));
  };

  const handleKeywordInputKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddKeyword();
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
        markdown_content: course.markdown_content || '',
        keywords: course.keywords || [],
        thumbnail: course.thumbnail || '',
        is_active: course.is_active ?? true,
        sort_order: course.sort_order?.toString() || '0',
        duration_minutes: course.duration_minutes?.toString() || '0',
        categoryId: course.category?.id || '',
        fileIds: course.files?.map((f) => f.id) || [],
      });
      // Set thumbnail preview if exists
      if (course.thumbnail) {
        setThumbnailPreview(`${API_URL}/course/${courseId}/thumbnail`);
      } else {
        setThumbnailPreview(null);
      }
      setThumbnailFile(null);
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
        markdown_content: formData.markdown_content || undefined,
        keywords: formData.keywords.length > 0 ? formData.keywords : undefined,
        thumbnail: formData.thumbnail || undefined,
        is_active: formData.is_active,
        sort_order: parseInt(formData.sort_order) || 0,
        duration_minutes: parseInt(formData.duration_minutes) || 0,
        categoryId: formData.categoryId || undefined,
        fileIds: formData.fileIds.length > 0 ? formData.fileIds : undefined,
      };

      let createdOrUpdatedCourse: Course;
      if (editingCourseId) {
        // Update existing course
        createdOrUpdatedCourse = await adminApiClient.updateCourse(editingCourseId, courseData);
        
        // Upload thumbnail if selected
        if (thumbnailFile) {
          await adminApiClient.uploadCourseThumbnail(editingCourseId, thumbnailFile);
        }
      } else {
        // Create new course
        createdOrUpdatedCourse = await adminApiClient.createCourse(courseData);
        
        // Upload thumbnail if selected
        if (thumbnailFile && createdOrUpdatedCourse.id) {
          await adminApiClient.uploadCourseThumbnail(createdOrUpdatedCourse.id, thumbnailFile);
        }
      }
      
      // Refresh courses list
      const updatedCourses = await adminApiClient.getCourses();
      setCourses(updatedCourses);
      
      // Reset form and close modal
      setFormData({
        title: '',
        description: '',
        markdown_content: '',
        keywords: [],
        thumbnail: '',
        is_active: true,
        sort_order: '0',
        duration_minutes: '0',
        categoryId: '',
        fileIds: [],
      });
      setKeywordInput('');
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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">مدیریت دوره‌ها</h1>
        <Button variant="primary" onClick={() => setIsModalOpen(true)}>
          افزودن دوره جدید
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses.map((course) => (
          <Card key={course.id} className="p-6">
            {course.thumbnail && (
              <div className="mb-4 h-48 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
                <img
                  src={`${API_URL}/course/${course.id}/thumbnail`}
                  alt={course.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}
            <h3 className="text-xl font-semibold mb-2">{course.title}</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">{course.description}</p>
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
            markdown_content: '',
            keywords: [],
            thumbnail: '',
            is_active: true,
            sort_order: '0',
            duration_minutes: '0',
            categoryId: '',
            fileIds: [],
          });
          setThumbnailFile(null);
          setThumbnailPreview(null);
          setKeywordInput('');
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              توضیحات
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              محتوای Markdown
            </label>
            <textarea
              name="markdown_content"
              value={formData.markdown_content}
              onChange={handleInputChange}
              rows={5}
              placeholder="# عنوان دوره\n\nمحتوای کامل..."
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 font-mono text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              کلمات کلیدی
            </label>
            <div className="flex gap-2 mb-2">
              <Input
                placeholder="کلمه کلیدی را وارد کنید و Enter بزنید"
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyPress={handleKeywordInputKeyPress}
              />
              <Button type="button" variant="outline" onClick={handleAddKeyword}>
                افزودن
              </Button>
            </div>
            {formData.keywords.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.keywords.map((keyword, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-sm rounded-full"
                  >
                    {keyword}
                    <button
                      type="button"
                      onClick={() => handleRemoveKeyword(keyword)}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-bold"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="مدت زمان (دقیقه)"
              name="duration_minutes"
              type="number"
              min="0"
              value={formData.duration_minutes}
              onChange={handleInputChange}
            />

            <Input
              label="ترتیب نمایش"
              name="sort_order"
              type="number"
              min="0"
              value={formData.sort_order}
              onChange={handleInputChange}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              تصویر شاخص
            </label>
            <input
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setThumbnailFile(file);
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    setThumbnailPreview(reader.result as string);
                  };
                  reader.readAsDataURL(file);
                }
              }}
              className="block w-full text-sm text-gray-500 dark:text-gray-400
                file:mr-4 file:py-2 file:px-4
                file:rounded-lg file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100
                dark:file:bg-blue-900 dark:file:text-blue-300
                dark:hover:file:bg-blue-800
                cursor-pointer"
            />
            {thumbnailPreview && (
              <div className="mt-4">
                <img
                  src={thumbnailPreview}
                  alt="Thumbnail preview"
                  className="w-full h-48 object-cover rounded-lg border border-gray-300 dark:border-gray-600"
                />
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    setThumbnailFile(null);
                    setThumbnailPreview(null);
                    if (editingCourseId && formData.thumbnail) {
                      // Keep existing thumbnail preview
                      setThumbnailPreview(`${API_URL}/course/${editingCourseId}/thumbnail`);
                    }
                  }}
                  className="mt-2"
                >
                  حذف تصویر
                </Button>
              </div>
            )}
            {!thumbnailPreview && editingCourseId && formData.thumbnail && (
              <div className="mt-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">تصویر فعلی:</p>
                <img
                  src={`${API_URL}/course/${editingCourseId}/thumbnail`}
                  alt="Current thumbnail"
                  className="w-full h-48 object-cover rounded-lg border border-gray-300 dark:border-gray-600"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}
          </div>

          {categories.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                دسته‌بندی دوره
              </label>
              <select
                name="categoryId"
                value={formData.categoryId}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              >
                <option value="">بدون دسته‌بندی</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                name="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData((prev) => ({ ...prev, is_active: e.target.checked }))}
                className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">دوره فعال است</span>
            </label>
          </div>

          {files.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                فایل‌های مرتبط
              </label>
              <div className="max-h-40 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg p-2 bg-white dark:bg-gray-800">
                {files.map((file) => (
                  <label
                    key={file.id}
                    className="flex items-center space-x-2 space-x-reverse p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={formData.fileIds.includes(file.id)}
                      onChange={() => handleFileSelect(file.id)}
                      className="rounded border-gray-300 dark:border-gray-600 text-blue-600 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-800"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
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

