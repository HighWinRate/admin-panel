'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { adminApiClient, User, UserPurchase, Product } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';

export default function UsersPage() {
  const router = useRouter();
  const { user, isAuthenticated, loading } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    role: 'user' as 'user' | 'admin' | 'blogger' | 'support',
    password: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProductsModalOpen, setIsProductsModalOpen] = useState(false);
  const [userPurchases, setUserPurchases] = useState<UserPurchase[]>([]);
  const [loadingPurchases, setLoadingPurchases] = useState(false);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [addingProduct, setAddingProduct] = useState(false);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace('/login');
      return;
    }

    if (user && user.role !== 'admin') {
      router.replace('/login');
      return;
    }

    async function fetchUsers() {
      try {
        const data = await adminApiClient.getUsers();
        setUsers(data);
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setLoadingUsers(false);
      }
    }

    if (isAuthenticated) {
      fetchUsers();
    }
  }, [user, isAuthenticated, loading, router]);

  const handleEdit = async (userId: string) => {
    try {
      const userData = await adminApiClient.getUser(userId);
      setEditingUser(userData);
      setFormData({
        first_name: userData.first_name || '',
        last_name: userData.last_name || '',
        email: userData.email || '',
        role: userData.role || 'user',
        password: '',
      });
      setErrors({});
      setIsEditModalOpen(true);
    } catch (error: any) {
      console.error('Error fetching user:', error);
      alert(error.message || 'خطا در بارگذاری اطلاعات کاربر');
    }
  };

  const handleDelete = (userToDelete: User) => {
    setEditingUser(userToDelete);
    setIsDeleteModalOpen(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setIsSubmitting(true);

    try {
      if (!editingUser) return;

      const updateData: any = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        role: formData.role,
      };

      // فقط اگر password وارد شده باشد، آن را اضافه می‌کنیم
      if (formData.password && formData.password.trim() !== '') {
        if (formData.password.length < 8) {
          setErrors({ password: 'رمز عبور باید حداقل 8 کاراکتر باشد' });
          setIsSubmitting(false);
          return;
        }
        updateData.password = formData.password;
      }

      await adminApiClient.updateUser(editingUser.id, updateData);
      alert('کاربر با موفقیت به‌روزرسانی شد');
      setIsEditModalOpen(false);
      setEditingUser(null);
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        role: 'user',
        password: '',
      });

      // Refresh users list
      const updatedUsers = await adminApiClient.getUsers();
      setUsers(updatedUsers);
    } catch (error: any) {
      console.error('Error updating user:', error);
      alert(error.message || 'خطا در به‌روزرسانی کاربر');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!editingUser) return;

    try {
      await adminApiClient.deleteUser(editingUser.id);
      alert('کاربر با موفقیت حذف شد');
      setIsDeleteModalOpen(false);
      setEditingUser(null);

      // Refresh users list
      const updatedUsers = await adminApiClient.getUsers();
      setUsers(updatedUsers);
    } catch (error: any) {
      console.error('Error deleting user:', error);
      alert(error.message || 'خطا در حذف کاربر');
    }
  };

  const handleManageProducts = async (userId: string) => {
    try {
      setEditingUser(users.find(u => u.id === userId) || null);
      setLoadingPurchases(true);
      setIsProductsModalOpen(true);
      
      // Fetch user purchases and all products in parallel
      const [purchases, products] = await Promise.all([
        adminApiClient.getUserPurchases(userId),
        adminApiClient.getProducts(),
      ]);
      
      setUserPurchases(purchases);
      setAllProducts(products);
      setSelectedProductId('');
    } catch (error: any) {
      console.error('Error fetching user purchases:', error);
      alert(error.message || 'خطا در بارگذاری محصولات کاربر');
    } finally {
      setLoadingPurchases(false);
    }
  };

  const handleAddProduct = async () => {
    if (!editingUser || !selectedProductId) {
      alert('لطفا محصولی را انتخاب کنید');
      return;
    }

    // Check if user already has this product
    const alreadyHas = userPurchases.some(
      p => p.product?.id === selectedProductId || p.product_id === selectedProductId
    );
    
    if (alreadyHas) {
      alert('کاربر قبلاً این محصول را دارد');
      return;
    }

    setAddingProduct(true);
    try {
      await adminApiClient.addProductToUser(editingUser.id, selectedProductId);
      alert('محصول با موفقیت به کاربر اضافه شد');
      
      // Refresh purchases list
      const purchases = await adminApiClient.getUserPurchases(editingUser.id);
      setUserPurchases(purchases);
      setSelectedProductId('');
    } catch (error: any) {
      console.error('Error adding product:', error);
      alert(error.message || 'خطا در اضافه کردن محصول');
    } finally {
      setAddingProduct(false);
    }
  };

  const handleRemoveProduct = async (productId: string) => {
    if (!editingUser) return;
    
    if (!confirm('آیا مطمئن هستید که می‌خواهید این محصول را از کاربر حذف کنید؟')) {
      return;
    }

    try {
      await adminApiClient.removeProductFromUser(editingUser.id, productId);
      alert('محصول با موفقیت از کاربر حذف شد');
      
      // Refresh purchases list
      const purchases = await adminApiClient.getUserPurchases(editingUser.id);
      setUserPurchases(purchases);
    } catch (error: any) {
      console.error('Error removing product:', error);
      alert(error.message || 'خطا در حذف محصول');
    }
  };

  if (loading || loadingUsers) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">در حال بارگذاری...</p>
        </div>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-8">مدیریت کاربران</h1>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-gray-900/50">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                نام
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                ایمیل
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                نقش
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                عملیات
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-gray-100">
                  {u.first_name} {u.last_name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-gray-100">{u.email}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                    {u.role}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="ml-2"
                    onClick={() => handleEdit(u.id)}
                  >
                    ویرایش
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="ml-2"
                    onClick={() => handleManageProducts(u.id)}
                  >
                    محصولات
                  </Button>
                  <Button 
                    variant="danger" 
                    size="sm"
                    onClick={() => handleDelete(u)}
                  >
                    حذف
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingUser(null);
          setFormData({
            first_name: '',
            last_name: '',
            email: '',
            role: 'user',
            password: '',
          });
          setErrors({});
        }}
        title="ویرایش کاربر"
        size="md"
      >
        <form onSubmit={handleSubmitEdit} className="space-y-4">
          <Input
            label="نام *"
            name="first_name"
            value={formData.first_name}
            onChange={handleInputChange}
            error={errors.first_name}
            required
          />

          <Input
            label="نام خانوادگی *"
            name="last_name"
            value={formData.last_name}
            onChange={handleInputChange}
            error={errors.last_name}
            required
          />

          <Input
            label="ایمیل *"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleInputChange}
            error={errors.email}
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              نقش *
            </label>
            <select
              name="role"
              value={formData.role}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              required
            >
              <option value="user">کاربر</option>
              <option value="admin">مدیر</option>
              <option value="blogger">بلاگر</option>
              <option value="support">پشتیبانی</option>
            </select>
          </div>

          <Input
            label="رمز عبور جدید (اختیاری)"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleInputChange}
            error={errors.password}
            placeholder="در صورت عدم تغییر، خالی بگذارید"
          />

          <div className="flex gap-2 justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsEditModalOpen(false);
                setEditingUser(null);
                setFormData({
                  first_name: '',
                  last_name: '',
                  email: '',
                  role: 'user',
                  password: '',
                });
                setErrors({});
              }}
            >
              انصراف
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              ذخیره تغییرات
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setEditingUser(null);
        }}
        title="تأیید حذف کاربر"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-700 dark:text-gray-300">
            آیا مطمئن هستید که می‌خواهید کاربر{' '}
            <strong>
              {editingUser?.first_name} {editingUser?.last_name}
            </strong>{' '}
            را حذف کنید؟
          </p>
          <p className="text-sm text-red-600 dark:text-red-400">
            این عمل غیرقابل بازگشت است.
          </p>
          <div className="flex gap-2 justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setEditingUser(null);
              }}
            >
              انصراف
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={handleConfirmDelete}
            >
              حذف کاربر
            </Button>
          </div>
        </div>
      </Modal>

      {/* Products Management Modal */}
      <Modal
        isOpen={isProductsModalOpen}
        onClose={() => {
          setIsProductsModalOpen(false);
          setEditingUser(null);
          setUserPurchases([]);
          setSelectedProductId('');
        }}
        title={`مدیریت محصولات کاربر: ${editingUser?.first_name} ${editingUser?.last_name}`}
        size="lg"
      >
        {loadingPurchases ? (
          <div className="text-center py-8">
            <p className="text-gray-600 dark:text-gray-400">در حال بارگذاری...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Add Product Section */}
            <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200">افزودن محصول</h3>
              <div className="flex gap-2">
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                >
                  <option value="">انتخاب محصول...</option>
                  {allProducts
                    .filter(p => !userPurchases.some(up => up.product?.id === p.id || up.product_id === p.id))
                    .map(product => (
                      <option key={product.id} value={product.id}>
                        {product.title} - ${product.price}
                      </option>
                    ))}
                </select>
                <Button
                  onClick={handleAddProduct}
                  isLoading={addingProduct}
                  disabled={!selectedProductId || addingProduct}
                >
                  افزودن
                </Button>
              </div>
            </div>

            {/* User Purchases List */}
            <div>
              <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200">
                محصولات کاربر ({userPurchases.length})
              </h3>
              {userPurchases.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  این کاربر هیچ محصولی ندارد
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {userPurchases.map((purchase) => {
                    const product = purchase.product;
                    if (!product) return null;
                    
                    return (
                      <Card key={purchase.id} className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-1">
                              {product.title}
                            </h4>
                            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                              <p>قیمت: ${product.price}</p>
                              <p>نرخ برد: {product.winrate}%</p>
                              <p className="text-xs">
                                تاریخ خرید: {new Date(purchase.purchased_at).toLocaleDateString('fa-IR')}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleRemoveProduct(product.id)}
                          >
                            حذف
                          </Button>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

