'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { adminApiClient, Category } from '@/lib/api';
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

export default function CategoriesPage() {
  const router = useRouter();
  const { user, isAuthenticated, loading } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    slug: '',
    icon: '',
    sort_order: '0',
    is_active: true,
    parent_id: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace('/login');
      return;
    }

    if (user && user.role !== 'admin') {
      router.replace('/login');
      return;
    }

    async function fetchCategories() {
      try {
        const categoriesData = await adminApiClient.getCategories();
        setCategories(categoriesData);
      } catch (error) {
        console.error('Error fetching categories:', error);
      } finally {
        setLoadingCategories(false);
      }
    }

    if (isAuthenticated) {
      fetchCategories();
    }
  }, [user, isAuthenticated, loading, router]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'نام دسته‌بندی الزامی است';
    }

    if (formData.slug && !/^[a-z0-9-]+$/.test(formData.slug)) {
      newErrors.slug = 'Slug باید فقط شامل حروف کوچک، اعداد و خط تیره باشد';
    }

    if (formData.sort_order && (isNaN(Number(formData.sort_order)) || Number(formData.sort_order) < 0)) {
      newErrors.sort_order = 'ترتیب نمایش باید یک عدد مثبت باشد';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEdit = async (categoryId: string) => {
    try {
      const categoryToEdit = await adminApiClient.getCategory(categoryId);

      setFormData({
        name: categoryToEdit.name || '',
        description: categoryToEdit.description || '',
        slug: categoryToEdit.slug || '',
        icon: categoryToEdit.icon || '',
        sort_order: categoryToEdit.sort_order?.toString() || '0',
        is_active: categoryToEdit.is_active ?? true,
        parent_id: categoryToEdit.parent_id || '',
      });
      setEditingCategoryId(categoryId);
      setIsModalOpen(true);
    } catch (error: any) {
      console.error('Error fetching category:', error);
      alert(error.message || 'خطا در بارگذاری دسته‌بندی');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const categoryData: Partial<Category> = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        slug: formData.slug.trim() || undefined,
        icon: formData.icon.trim() || undefined,
        sort_order: formData.sort_order ? parseInt(formData.sort_order) : undefined,
        is_active: formData.is_active,
        parent_id: formData.parent_id || undefined,
      };

      if (editingCategoryId) {
        // Update existing category
        await adminApiClient.updateCategory(editingCategoryId, categoryData);
      } else {
        // Create new category
        await adminApiClient.createCategory(categoryData);
      }
      
      // Refresh categories list
      const updatedCategories = await adminApiClient.getCategories();
      setCategories(updatedCategories);
      
      // Reset form and close modal
      resetForm();
    } catch (error: any) {
      console.error('Error saving category:', error);
      alert(error.message || 'خطا در ذخیره دسته‌بندی');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('آیا از حذف این دسته‌بندی اطمینان دارید؟')) {
      return;
    }

    try {
      await adminApiClient.deleteCategory(id);
      const updatedCategories = await adminApiClient.getCategories();
      setCategories(updatedCategories);
    } catch (error: any) {
      console.error('Error deleting category:', error);
      alert(error.message || 'خطا در حذف دسته‌بندی');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      slug: '',
      icon: '',
      sort_order: '0',
      is_active: true,
      parent_id: '',
    });
    setEditingCategoryId(null);
    setIsModalOpen(false);
    setErrors({});
  };

  if (loading || loadingCategories) {
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

  // Filter out the category being edited from parent options
  const availableParentCategories = categories.filter(
    (cat) => cat.id !== editingCategoryId
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">مدیریت دسته‌بندی‌ها</h1>
        <Button onClick={() => setIsModalOpen(true)}>
          افزودن دسته‌بندی جدید
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((category) => (
          <Card key={category.id}>
            <CardHeader>
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {category.icon && (
                    <span className="text-2xl">{category.icon}</span>
                  )}
                  <CardTitle className="text-xl">{category.name}</CardTitle>
                </div>
                <Badge variant={category.is_active ? 'default' : 'secondary'}>
                  {category.is_active ? 'فعال' : 'غیرفعال'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {category.description && (
                <p className="text-muted-foreground text-sm mb-3">{category.description}</p>
              )}
              <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                {category.slug && (
                  <span>Slug: {category.slug}</span>
                )}
                {category.sort_order !== undefined && (
                  <span>ترتیب: {category.sort_order}</span>
                )}
              </div>
              {category.parent_id && (
                <p className="text-xs text-muted-foreground mb-4">
                  والد: {categories.find((c) => c.id === category.parent_id)?.name || 'نامشخص'}
                </p>
              )}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(category.id)}
                >
                  ویرایش
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(category.id)}
                >
                  حذف
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {categories.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">هنوز دسته‌بندی‌ای ایجاد نشده است</p>
        </div>
      )}

      <Dialog open={isModalOpen} onOpenChange={(open) => {
          if (!open) resetForm();
        }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategoryId ? 'ویرایش دسته‌بندی' : 'افزودن دسته‌بندی جدید'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">نام دسته‌بندی *</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name}</p>
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  name="slug"
                  placeholder="forex-strategies"
                  value={formData.slug}
                  onChange={handleInputChange}
                />
                {errors.slug && (
                  <p className="text-sm text-destructive">{errors.slug}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="icon">آیکون</Label>
                <Input
                  id="icon"
                  name="icon"
                  placeholder="📈"
                  value={formData.icon}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
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
                {errors.sort_order && (
                  <p className="text-sm text-destructive">{errors.sort_order}</p>
                )}
              </div>

              {availableParentCategories.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="parent_id">دسته‌بندی والد</Label>
                  <select
                    id="parent_id"
                    name="parent_id"
                    value={formData.parent_id}
                    onChange={handleInputChange}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="">بدون والد (دسته اصلی)</option>
                    {availableParentCategories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                name="is_active"
                id="is_active"
                checked={formData.is_active}
                onChange={handleInputChange}
                className="rounded border-input text-primary focus:ring-ring"
              />
              <Label htmlFor="is_active" className="mr-2 text-sm">
                دسته‌بندی فعال است
              </Label>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={resetForm}
              >
                انصراف
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'در حال ذخیره...' : editingCategoryId ? 'ذخیره تغییرات' : 'ایجاد دسته‌بندی'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

