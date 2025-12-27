'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { adminApiClient, Product, Course, Category } from '@/lib/api';
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
import { API_URL } from '@/lib/constants';

export default function ProductsPage() {
  const router = useRouter();
  const { user, isAuthenticated, loading } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    winrate: '',
    discountedPrice: '',
    discountExpiresAt: '',
    courseIds: [] as string[],
    keywords: [] as string[],
    trading_style: '',
    trading_session: '',
    categoryId: '',
    backtest_trades_count: '',
    markdown_description: '',
    backtest_results: '',
    thumbnail: '',
    is_active: true,
    sort_order: '0',
  });
  const [keywordInput, setKeywordInput] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);

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
        const [productsData, coursesData, categoriesData] = await Promise.all([
          adminApiClient.getProducts(),
          adminApiClient.getCourses(),
          adminApiClient.getCategories(),
        ]);
        setProducts(productsData);
        setCourses(coursesData);
        setCategories(categoriesData);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoadingProducts(false);
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

  const handleCourseSelect = (courseId: string) => {
    setFormData((prev) => {
      const courseIds = prev.courseIds.includes(courseId)
        ? prev.courseIds.filter((id) => id !== courseId)
        : [...prev.courseIds, courseId];
      return { ...prev, courseIds };
    });
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

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'عنوان محصول الزامی است';
    }
    if (!formData.price || parseFloat(formData.price) <= 0) {
      newErrors.price = 'قیمت باید بیشتر از صفر باشد';
    }
    if (!formData.winrate || parseFloat(formData.winrate) < 0 || parseFloat(formData.winrate) > 100) {
      newErrors.winrate = 'نرخ برد باید بین 0 تا 100 باشد';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEdit = async (productId: string) => {
    try {
      const product = await adminApiClient.getProduct(productId);
      
      // Format discount expiration date if exists
      let discountExpiresAt = '';
      if (product.discountedPrice && product.discountExpiresAt) {
        const date = new Date(product.discountExpiresAt);
        discountExpiresAt = date.toISOString().slice(0, 16);
      }

      setFormData({
        title: product.title || '',
        description: product.description || '',
        price: product.price?.toString() || '',
        winrate: product.winrate?.toString() || '',
        discountedPrice: product.discountedPrice?.toString() || '',
        discountExpiresAt: discountExpiresAt,
        courseIds: product.courses?.map((c) => c.id) || [],
        keywords: product.keywords || [],
        trading_style: product.trading_style || '',
        trading_session: product.trading_session || '',
        categoryId: product.category?.id || '',
        backtest_trades_count: product.backtest_trades_count?.toString() || '',
        markdown_description: product.markdown_description || '',
        backtest_results: product.backtest_results ? JSON.stringify(product.backtest_results, null, 2) : '',
        thumbnail: product.thumbnail || '',
        is_active: product.is_active ?? true,
        sort_order: product.sort_order?.toString() || '0',
      });
      // Set thumbnail preview if exists
      if (product.thumbnail) {
        setThumbnailPreview(`${API_URL}/product/${productId}/thumbnail`);
      } else {
        setThumbnailPreview(null);
      }
      setThumbnailFile(null);
      setEditingProductId(productId);
      setIsModalOpen(true);
    } catch (error: any) {
      console.error('Error fetching product:', error);
      alert(error.message || 'خطا در بارگذاری محصول');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const productData = {
        title: formData.title,
        description: formData.description || undefined,
        price: parseFloat(formData.price),
        winrate: parseFloat(formData.winrate),
        discountedPrice: formData.discountedPrice
          ? parseFloat(formData.discountedPrice)
          : undefined,
        discountExpiresAt: formData.discountExpiresAt
          ? new Date(formData.discountExpiresAt).toISOString()
          : undefined,
        courseIds: formData.courseIds.length > 0 ? formData.courseIds : undefined,
        keywords: formData.keywords.length > 0 ? formData.keywords : undefined,
        trading_style: formData.trading_style || undefined,
        trading_session: formData.trading_session || undefined,
        categoryId: formData.categoryId || undefined,
        backtest_trades_count: formData.backtest_trades_count
          ? parseInt(formData.backtest_trades_count)
          : undefined,
        markdown_description: formData.markdown_description || undefined,
        backtest_results: formData.backtest_results
          ? (() => {
              try {
                return JSON.parse(formData.backtest_results);
              } catch {
                return undefined;
              }
            })()
          : undefined,
        thumbnail: formData.thumbnail || undefined,
        is_active: formData.is_active,
        sort_order: parseInt(formData.sort_order) || 0,
      };

      let createdOrUpdatedProduct: Product;
      if (editingProductId) {
        // Update existing product
        createdOrUpdatedProduct = await adminApiClient.updateProduct(editingProductId, productData);
        
        // Upload thumbnail if selected
        if (thumbnailFile) {
          await adminApiClient.uploadProductThumbnail(editingProductId, thumbnailFile);
        }
      } else {
        // Create new product
        createdOrUpdatedProduct = await adminApiClient.createProduct(productData);
        
        // Upload thumbnail if selected
        if (thumbnailFile && createdOrUpdatedProduct.id) {
          await adminApiClient.uploadProductThumbnail(createdOrUpdatedProduct.id, thumbnailFile);
        }
      }
      
      // Refresh products list
      const updatedProducts = await adminApiClient.getProducts();
      setProducts(updatedProducts);
      
      // Reset form and close modal
      setFormData({
        title: '',
        description: '',
        price: '',
        winrate: '',
        discountedPrice: '',
        discountExpiresAt: '',
        courseIds: [],
        keywords: [],
        trading_style: '',
        trading_session: '',
        categoryId: '',
        backtest_trades_count: '',
        markdown_description: '',
        backtest_results: '',
        thumbnail: '',
        is_active: true,
        sort_order: '0',
      });
      setThumbnailFile(null);
      setThumbnailPreview(null);
      setKeywordInput('');
      setEditingProductId(null);
      setIsModalOpen(false);
      setErrors({});
    } catch (error: any) {
      console.error('Error saving product:', error);
      alert(error.message || 'خطا در ذخیره محصول');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('آیا از حذف این محصول اطمینان دارید؟')) {
      return;
    }

    try {
      await adminApiClient.deleteProduct(id);
      const updatedProducts = await adminApiClient.getProducts();
      setProducts(updatedProducts);
    } catch (error: any) {
      console.error('Error deleting product:', error);
      alert(error.message || 'خطا در حذف محصول');
    }
  };

  if (loading || loadingProducts) {
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
        <h1 className="text-3xl font-bold">مدیریت محصولات</h1>
        <Button onClick={() => setIsModalOpen(true)}>
          افزودن محصول جدید
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => (
          <Card key={product.id}>
            <CardHeader>
              {product.thumbnail && (
                <div className="mb-4 h-48 bg-muted rounded-lg overflow-hidden">
                  <img
                    src={`${API_URL}/product/${product.id}/thumbnail`}
                    alt={product.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
              <CardTitle className="text-xl mb-2">{product.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm mb-4">{product.description}</p>
              <div className="flex justify-between items-center mb-4">
                <span className="text-primary font-semibold">${product.price}</span>
                <Badge variant="secondary">نرخ برد: {product.winrate}%</Badge>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(product.id)}
                >
                ویرایش
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleDelete(product.id)}
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
            setEditingProductId(null);
            setFormData({
              title: '',
              description: '',
              price: '',
              winrate: '',
              discountedPrice: '',
              discountExpiresAt: '',
              courseIds: [],
              keywords: [],
              trading_style: '',
              trading_session: '',
              categoryId: '',
              backtest_trades_count: '',
              markdown_description: '',
              backtest_results: '',
              thumbnail: '',
              is_active: true,
              sort_order: '0',
            });
            setKeywordInput('');
            setErrors({});
          }
        }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProductId ? 'ویرایش محصول' : 'افزودن محصول جدید'}</DialogTitle>
          </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">عنوان محصول *</Label>
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">قیمت (USD) *</Label>
              <Input
                id="price"
                name="price"
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={handleInputChange}
                required
              />
              {errors.price && (
                <p className="text-sm text-destructive">{errors.price}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="winrate">نرخ برد (%) *</Label>
              <Input
                id="winrate"
                name="winrate"
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={formData.winrate}
                onChange={handleInputChange}
                required
              />
              {errors.winrate && (
                <p className="text-sm text-destructive">{errors.winrate}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="discountedPrice">قیمت تخفیف (USD)</Label>
              <Input
                id="discountedPrice"
                name="discountedPrice"
                type="number"
                step="0.01"
                min="0"
                value={formData.discountedPrice}
                onChange={handleInputChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="discountExpiresAt">تاریخ انقضای تخفیف</Label>
              <Input
                id="discountExpiresAt"
                name="discountExpiresAt"
                type="datetime-local"
                value={formData.discountExpiresAt}
                onChange={handleInputChange}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="trading_style">سبک معاملاتی</Label>
              <Input
                id="trading_style"
                name="trading_style"
                placeholder="مثلاً: swing, day, scalping"
                value={formData.trading_style}
                onChange={handleInputChange}
                maxLength={50}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="trading_session">جلسه معاملاتی</Label>
              <Input
                id="trading_session"
                name="trading_session"
                placeholder="مثلاً: london, newyork, tokyo"
                value={formData.trading_session}
                onChange={handleInputChange}
                maxLength={50}
              />
            </div>
          </div>

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

          {categories.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="categoryId">دسته‌بندی محصول</Label>
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="backtest_trades_count">تعداد معاملات بکتست</Label>
              <Input
                id="backtest_trades_count"
                name="backtest_trades_count"
                type="number"
                min="0"
                value={formData.backtest_trades_count}
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
                    if (editingProductId && formData.thumbnail) {
                      // Keep existing thumbnail preview
                      setThumbnailPreview(`${API_URL}/product/${editingProductId}/thumbnail`);
                    }
                  }}
                  className="mt-2"
                >
                  حذف تصویر
                </Button>
              </div>
            )}
            {!thumbnailPreview && editingProductId && formData.thumbnail && (
              <div className="mt-4">
                <p className="text-sm text-muted-foreground mb-2">تصویر فعلی:</p>
                <img
                  src={`${API_URL}/product/${editingProductId}/thumbnail`}
                  alt="Current thumbnail"
                  className="w-full h-48 object-cover rounded-lg border"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}
          </div>

          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                name="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData((prev) => ({ ...prev, is_active: e.target.checked }))}
                className="mr-2 rounded border-input text-primary focus:ring-ring"
              />
              <span className="text-sm font-medium">محصول فعال است</span>
            </label>
          </div>

            <div className="space-y-2">
              <Label htmlFor="markdown_description">توضیحات Markdown</Label>
              <textarea
                id="markdown_description"
                name="markdown_description"
                value={formData.markdown_description}
                onChange={handleInputChange}
                rows={5}
                placeholder="# عنوان\n\nتوضیحات کامل..."
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="backtest_results">نتایج بکتست (JSON)</Label>
              <textarea
                id="backtest_results"
                name="backtest_results"
                value={formData.backtest_results}
                onChange={handleInputChange}
                rows={4}
                placeholder='{"profit": 1500, "drawdown": 200, "win_rate": 85.5}'
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-mono"
              />
              <p className="text-xs text-muted-foreground">فرمت JSON معتبر وارد کنید</p>
            </div>

          {courses.length > 0 && (
            <div className="space-y-2">
              <Label>دوره‌های مرتبط</Label>
              <div className="max-h-40 overflow-y-auto border rounded-lg p-2 bg-muted/50">
                {courses.map((course) => (
                  <label
                    key={course.id}
                    className="flex items-center space-x-2 space-x-reverse p-2 hover:bg-muted rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={formData.courseIds.includes(course.id)}
                      onChange={() => handleCourseSelect(course.id)}
                      className="rounded border-input text-primary focus:ring-ring"
                    />
                    <span className="text-sm">{course.title}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsModalOpen(false);
                setEditingProductId(null);
                setFormData({
                  title: '',
                  description: '',
                  price: '',
                  winrate: '',
                  discountedPrice: '',
                  discountExpiresAt: '',
                  courseIds: [],
                  keywords: [],
                  trading_style: '',
                  trading_session: '',
                  categoryId: '',
                  backtest_trades_count: '',
                  markdown_description: '',
                  backtest_results: '',
                  thumbnail: '',
                  is_active: true,
                  sort_order: '0',
                });
                setKeywordInput('');
                setErrors({});
              }}
            >
              انصراف
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'در حال ذخیره...' : editingProductId ? 'ذخیره تغییرات' : 'ایجاد محصول'}
            </Button>
          </DialogFooter>
        </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

