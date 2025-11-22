'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { adminApiClient, User } from '@/lib/api';
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

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
      return;
    }

    if (user && user.role !== 'admin') {
      router.push('/login');
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
    </div>
  );
}

