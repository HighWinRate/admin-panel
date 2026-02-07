'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Course, File as FileType, Category } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { buildCourseThumbnailUrl } from '@/lib/data/courses';

async function fetchCoursesList(): Promise<Course[]> {
  const response = await fetch('/api/admin/courses', {
    cache: 'no-store',
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error('Failed to load courses');
  }
  return response.json();
}

async function fetchCourseDetails(courseId: string): Promise<Course> {
  const response = await fetch(`/api/admin/courses/${courseId}`, {
    cache: 'no-store',
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error('Failed to load course');
  }
  return response.json();
}

async function fetchAdminCategories(): Promise<Category[]> {
  const response = await fetch('/api/admin/categories', {
    cache: 'no-store',
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error('Failed to load categories');
  }
  return response.json();
}

async function fetchFilesList(): Promise<FileType[]> {
  const response = await fetch('/api/admin/files', {
    cache: 'no-store',
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error('Failed to fetch files');
  }
  return response.json();
}

export default function CoursesPage() {
  const router = useRouter();
  const { user, isAuthenticated, loading } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [files, setFiles] = useState<FileType[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    markdown_description: '',
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
  const [thumbnailFile, setThumbnailFile] = useState<globalThis.File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);

  const loadCourses = async () => {
    const data = await fetchCoursesList();
    setCourses(data);
  };

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace('/login');
      return;
    }

    if (user && user.role !== 'admin') {
      router.replace('/login');
      return;
    }

    async function fetchData() {
      try {
        const [filesData, categoriesData] = await Promise.all([
          fetchFilesList(),
          fetchAdminCategories(),
        ]);
        await loadCourses();
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

  const handleThumbnailUpload = async (courseId: string) => {
    if (!thumbnailFile) {
      return;
    }

    const formData = new FormData();
    formData.append('thumbnail', thumbnailFile);

    const response = await fetch(`/api/admin/courses/${courseId}/thumbnail`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });

    if (!response.ok) {
      const message = await response.text().catch(() => 'خطا در بارگذاری تصویر');
      throw new Error(message);
    }

    const result = await response.json();
    setThumbnailPreview(result.thumbnailUrl || buildCourseThumbnailUrl(result.thumbnail));
  };

  const handleEdit = async (courseId: string) => {
    try {
      const course = await fetchCourseDetails(courseId);
      
      setFormData({
        title: course.title || '',
        description: course.description || '',
        markdown_description: (course as any).markdown_description || '',
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
        setThumbnailPreview(buildCourseThumbnailUrl(course.thumbnail));
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
        markdown_description: formData.markdown_description || undefined,
        markdown_content: formData.markdown_content || undefined,
        keywords: formData.keywords.length > 0 ? formData.keywords : undefined,
        is_active: formData.is_active,
        sort_order: parseInt(formData.sort_order) || 0,
        duration_minutes: parseInt(formData.duration_minutes) || 0,
        categoryId: formData.categoryId || undefined,
        fileIds: formData.fileIds,
      };

      const endpoint = editingCourseId
        ? `/api/admin/courses/${editingCourseId}`
        : '/api/admin/courses';
      const method = editingCourseId ? 'PATCH' : 'POST';

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(courseData),
      });

      if (!response.ok) {
        const message = await response.text().catch(() => 'خطا در ذخیره دوره');
        throw new Error(message);
      }

      const savedCourse: Course = await response.json();
      if (thumbnailFile) {
        await handleThumbnailUpload(savedCourse.id);
      }

      await loadCourses();

      // Reset form and close modal
      setFormData({
        title: '',
        description: '',
        markdown_description: '',
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
      const response = await fetch(`/api/admin/courses/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) {
        const message = await response.text().catch(() => 'خطا در حذف دوره');
        throw new Error(message);
      }
      await loadCourses();
    } catch (error: any) {
      console.error('Error deleting course:', error);
      alert(error.message || 'خطا در حذف دوره');
    }
  };

  if (loading || loadingCourses) {
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
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">مدیریت دوره‌ها</h1>
        <Button onClick={() => setIsModalOpen(true)}>
          افزودن دوره جدید
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses.map((course) => (
          <Card key={course.id}>
            <CardHeader>
              {course.thumbnail && (
                <div className="mb-4 h-48 bg-muted rounded-lg overflow-hidden">
                  <img
                    src={buildCourseThumbnailUrl(course.thumbnail) ?? undefined}
                    alt={course.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
              <CardTitle className="text-xl mb-2">{course.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm mb-4">{course.description}</p>
              {course.duration_minutes && (
                <p className="text-xs text-muted-foreground mb-4">
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
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(course.id)}
                >
                  حذف
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={isModalOpen} onOpenChange={(open) => {
          if (!open) {
            setIsModalOpen(false);
            setEditingCourseId(null);
            setFormData({
              title: '',
              description: '',
              markdown_description: '',
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
          }
        }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{editingCourseId ? 'ویرایش دوره' : 'افزودن دوره جدید'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">عنوان دوره *</Label>
              <Input
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                required
              />
              {errors.title && (
                <p className="text-sm text-destructive">{errors.title}</p>
              )}
            </div>

          <div className="space-y-2">
            <Label htmlFor="description">توضیحات</Label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={3}
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="markdown_description">توضیحات Markdown</Label>
            <textarea
              id="markdown_description"
              name="markdown_description"
              value={formData.markdown_description}
              onChange={handleInputChange}
              rows={5}
              placeholder="# توضیحات دوره\n\nتوضیحات کامل به صورت Markdown..."
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-mono"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="markdown_content">محتوای Markdown</Label>
            <textarea
              id="markdown_content"
              name="markdown_content"
              value={formData.markdown_content}
              onChange={handleInputChange}
              rows={5}
              placeholder="# عنوان دوره\n\nمحتوای کامل..."
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-mono"
            />
          </div>

          <div>
            <div className="space-y-2">
              <Label htmlFor="keywordInput">کلمات کلیدی</Label>
              <div className="flex gap-2 mb-2">
                <Input
                  id="keywordInput"
                  placeholder="کلمه کلیدی را وارد کنید و Enter بزنید"
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyPress={handleKeywordInputKeyPress}
                />
              <Button type="button" variant="outline" onClick={handleAddKeyword}>
                افزودن
              </Button>
              </div>
            </div>
            {formData.keywords.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.keywords.map((keyword, idx) => (
                  <Badge key={idx} variant="secondary" className="gap-1">
                    {keyword}
                    <button
                      type="button"
                      onClick={() => handleRemoveKeyword(keyword)}
                      className="hover:text-destructive font-bold"
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="duration_minutes">مدت زمان (دقیقه)</Label>
              <Input
                id="duration_minutes"
                name="duration_minutes"
                type="number"
                min="0"
                value={formData.duration_minutes}
                onChange={handleInputChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sort_order">ترتیب نمایش</Label>
              <Input
                id="sort_order"
                name="sort_order"
                type="number"
                min="0"
                value={formData.sort_order}
                onChange={handleInputChange}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="thumbnail">تصویر شاخص</Label>
            <input
              id="thumbnail"
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
              className="block w-full text-sm text-muted-foreground
                file:mr-4 file:py-2 file:px-4
                file:rounded-lg file:border-0
                file:text-sm file:font-semibold
                file:bg-primary/10 file:text-primary
                hover:file:bg-primary/20
                cursor-pointer"
            />
            {thumbnailPreview && (
              <div className="mt-4">
                <p className="text-sm text-muted-foreground mb-2">پیش‌نمایش:</p>
                <img
                  src={thumbnailPreview}
                  alt="Thumbnail preview"
                  className="w-full h-48 object-cover rounded-lg border"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                onClick={() => {
                  setThumbnailFile(null);
                  setThumbnailPreview(null);
                  if (editingCourseId && formData.thumbnail) {
                    setThumbnailPreview(buildCourseThumbnailUrl(formData.thumbnail));
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
                <p className="text-sm text-muted-foreground mb-2">تصویر فعلی:</p>
              <img
                src={buildCourseThumbnailUrl(formData.thumbnail) ?? undefined}
                  alt="Current thumbnail"
                  className="w-full h-48 object-cover rounded-lg border"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}
          </div>

          {categories.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="categoryId">دسته‌بندی دوره</Label>
              <select
                id="categoryId"
                name="categoryId"
                value={formData.categoryId}
                onChange={handleInputChange}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
                className="mr-2 rounded border-input text-primary focus:ring-ring"
              />
              <span className="text-sm font-medium">دوره فعال است</span>
            </label>
          </div>

          {files.length > 0 && (
            <div className="space-y-2">
              <Label>فایل‌های مرتبط</Label>
              <div className="max-h-40 overflow-y-auto border rounded-lg p-2 bg-muted/50">
                {files.map((file) => (
                  <label
                    key={file.id}
                    className="flex items-center space-x-2 space-x-reverse p-2 hover:bg-muted rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={formData.fileIds.includes(file.id)}
                      onChange={() => handleFileSelect(file.id)}
                      className="rounded border-input text-primary focus:ring-ring"
                    />
                    <span className="text-sm">
                      {file.name} ({file.type})
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsModalOpen(false);
                setEditingCourseId(null);
                setFormData({
                  title: '',
                  description: '',
                  markdown_description: '',
                  markdown_content: '',
                  keywords: [],
                  thumbnail: '',
                  is_active: true,
                  sort_order: '0',
                  duration_minutes: '0',
                  categoryId: '',
                  fileIds: [],
                });
                setErrors({});
              }}
            >
              انصراف
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'در حال ذخیره...' : editingCourseId ? 'ذخیره تغییرات' : 'ایجاد دوره'}
            </Button>
          </DialogFooter>
          </form></DialogContent></Dialog></div>
  );
}

