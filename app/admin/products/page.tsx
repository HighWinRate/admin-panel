'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { adminApiClient, Product, Course, Category } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';

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
  });
  const [keywordInput, setKeywordInput] = useState('');
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
      });
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
      };

      if (editingProductId) {
        // Update existing product
        await adminApiClient.updateProduct(editingProductId, productData);
      } else {
        // Create new product
        await adminApiClient.createProduct(productData);
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
      });
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
        <h1 className="text-3xl font-bold text-gray-900">مدیریت محصولات</h1>
        <Button variant="primary" onClick={() => setIsModalOpen(true)}>
          افزودن محصول جدید
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => (
          <Card key={product.id} className="p-6">
            <h3 className="text-xl font-semibold mb-2">{product.title}</h3>
            <p className="text-gray-600 text-sm mb-4">{product.description}</p>
            <div className="flex justify-between items-center mb-4">
              <span className="text-blue-600 font-semibold">${product.price}</span>
              <span className="text-green-600">نرخ برد: {product.winrate}%</span>
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
                variant="danger"
                size="sm"
                onClick={() => handleDelete(product.id)}
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
          });
          setKeywordInput('');
          setErrors({});
        }}
        title={editingProductId ? 'ویرایش محصول' : 'افزودن محصول جدید'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="عنوان محصول *"
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

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="قیمت (USD) *"
              name="price"
              type="number"
              step="0.01"
              min="0"
              value={formData.price}
              onChange={handleInputChange}
              error={errors.price}
              required
            />

            <Input
              label="نرخ برد (%) *"
              name="winrate"
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={formData.winrate}
              onChange={handleInputChange}
              error={errors.winrate}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="قیمت تخفیف (USD)"
              name="discountedPrice"
              type="number"
              step="0.01"
              min="0"
              value={formData.discountedPrice}
              onChange={handleInputChange}
            />

            <Input
              label="تاریخ انقضای تخفیف"
              name="discountExpiresAt"
              type="datetime-local"
              value={formData.discountExpiresAt}
              onChange={handleInputChange}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                سبک معاملاتی
              </label>
              <Input
                name="trading_style"
                placeholder="مثلاً: swing, day, scalping"
                value={formData.trading_style}
                onChange={handleInputChange}
                maxLength={50}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                جلسه معاملاتی
              </label>
              <Input
                name="trading_session"
                placeholder="مثلاً: london, newyork, tokyo"
                value={formData.trading_session}
                onChange={handleInputChange}
                maxLength={50}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
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
                    className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                  >
                    {keyword}
                    <button
                      type="button"
                      onClick={() => handleRemoveKeyword(keyword)}
                      className="text-blue-600 hover:text-blue-800 font-bold"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {categories.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                دسته‌بندی محصول
              </label>
              <select
                name="categoryId"
                value={formData.categoryId}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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

          {courses.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                دوره‌های مرتبط
              </label>
              <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-2">
                {courses.map((course) => (
                  <label
                    key={course.id}
                    className="flex items-center space-x-2 space-x-reverse p-2 hover:bg-gray-50 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={formData.courseIds.includes(course.id)}
                      onChange={() => handleCourseSelect(course.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{course.title}</span>
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
                });
                setKeywordInput('');
                setErrors({});
              }}
            >
              انصراف
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              {editingProductId ? 'ذخیره تغییرات' : 'ایجاد محصول'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

