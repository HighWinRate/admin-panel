'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import type { SubscriptionPlan } from '@/lib/types';

export default function SubscriptionPlansPage() {
  const router = useRouter();
  const { user, isAuthenticated, loading } = useAuth();

  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);

  // Form data
  const [formData, setFormData] = useState({
    name: '',
    duration_days: '',
    price: '',
    description: '',
    is_active: true,
  });

  // Auth check
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace('/login');
    }
    if (user && user.role !== 'admin') {
      router.replace('/login');
    }
  }, [user, isAuthenticated, loading, router]);

  // Fetch plans
  useEffect(() => {
    if (user && user.role === 'admin') {
      fetchPlans();
    }
  }, [user]);

  const fetchPlans = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/subscription-plans');
      const data = await res.json();
      setPlans(data);
    } catch (error) {
      console.error('Error fetching plans:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/subscription-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          duration_days: parseInt(formData.duration_days),
          price: parseFloat(formData.price),
          description: formData.description || undefined,
          is_active: formData.is_active,
        }),
      });

      if (res.ok) {
        setShowCreateModal(false);
        setFormData({
          name: '',
          duration_days: '',
          price: '',
          description: '',
          is_active: true,
        });
        fetchPlans();
      } else {
        const error = await res.json();
        alert(error.error || 'خطا در ایجاد پلن');
      }
    } catch (error) {
      console.error('Error creating plan:', error);
      alert('خطا در ایجاد پلن');
    }
  };

  const handleUpdatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;

    try {
      const res = await fetch(`/api/admin/subscription-plans/${editingPlan.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          duration_days: parseInt(formData.duration_days),
          price: parseFloat(formData.price),
          description: formData.description || undefined,
          is_active: formData.is_active,
        }),
      });

      if (res.ok) {
        setShowEditModal(false);
        setEditingPlan(null);
        fetchPlans();
      } else {
        const error = await res.json();
        alert(error.error || 'خطا در ویرایش پلن');
      }
    } catch (error) {
      console.error('Error updating plan:', error);
      alert('خطا در ویرایش پلن');
    }
  };

  const handleDeletePlan = async (id: string) => {
    if (
      !confirm(
        'آیا مطمئن هستید که می‌خواهید این پلن را حذف کنید؟ این عملیات بازگشت‌ناپذیر است.',
      )
    )
      return;

    try {
      const res = await fetch(`/api/admin/subscription-plans/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        fetchPlans();
      } else {
        const error = await res.json();
        alert(error.error || 'خطا در حذف پلن');
      }
    } catch (error) {
      console.error('Error deleting plan:', error);
      alert('خطا در حذف پلن');
    }
  };

  const handleEdit = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      duration_days: plan.duration_days.toString(),
      price: plan.price.toString(),
      description: plan.description || '',
      is_active: plan.is_active,
    });
    setShowEditModal(true);
  };

  const handleToggleActive = async (plan: SubscriptionPlan) => {
    try {
      const res = await fetch(`/api/admin/subscription-plans/${plan.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_active: !plan.is_active,
        }),
      });

      if (res.ok) {
        fetchPlans();
      }
    } catch (error) {
      console.error('Error toggling plan status:', error);
    }
  };

  if (loading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">در حال بارگذاری...</div>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">مدیریت پلن‌های اشتراک</h1>
        <Button onClick={() => setShowCreateModal(true)}>افزودن پلن جدید</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>نام پلن</TableHead>
                <TableHead>مدت زمان (روز)</TableHead>
                <TableHead>قیمت (تومان)</TableHead>
                <TableHead>توضیحات</TableHead>
                <TableHead>وضعیت</TableHead>
                <TableHead>تاریخ ایجاد</TableHead>
                <TableHead>عملیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    پلنی یافت نشد
                  </TableCell>
                </TableRow>
              ) : (
                plans.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell className="font-medium">{plan.name}</TableCell>
                    <TableCell>{plan.duration_days} روز</TableCell>
                    <TableCell>
                      {plan.price.toLocaleString('fa-IR')} تومان
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {plan.description || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={plan.is_active ? 'default' : 'secondary'}
                        className="cursor-pointer"
                        onClick={() => handleToggleActive(plan)}
                      >
                        {plan.is_active ? 'فعال' : 'غیرفعال'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(plan.created_at).toLocaleDateString('fa-IR')}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(plan)}
                        >
                          ویرایش
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeletePlan(plan.id)}
                        >
                          حذف
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>افزودن پلن جدید</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreatePlan}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">نام پلن</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="مثلاً: اشتراک ماهانه"
                  required
                />
              </div>
              <div>
                <Label htmlFor="duration_days">مدت زمان (روز)</Label>
                <Input
                  id="duration_days"
                  type="number"
                  value={formData.duration_days}
                  onChange={(e) =>
                    setFormData({ ...formData, duration_days: e.target.value })
                  }
                  placeholder="30"
                  required
                />
              </div>
              <div>
                <Label htmlFor="price">قیمت (تومان)</Label>
                <Input
                  id="price"
                  type="number"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({ ...formData, price: e.target.value })
                  }
                  placeholder="50000"
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">توضیحات (اختیاری)</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="توضیحات پلن..."
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) =>
                    setFormData({ ...formData, is_active: e.target.checked })
                  }
                  className="w-4 h-4"
                />
                <Label htmlFor="is_active" className="cursor-pointer">
                  فعال
                </Label>
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateModal(false)}
              >
                انصراف
              </Button>
              <Button type="submit">ایجاد پلن</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ویرایش پلن</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdatePlan}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit_name">نام پلن</Label>
                <Input
                  id="edit_name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit_duration_days">مدت زمان (روز)</Label>
                <Input
                  id="edit_duration_days"
                  type="number"
                  value={formData.duration_days}
                  onChange={(e) =>
                    setFormData({ ...formData, duration_days: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit_price">قیمت (تومان)</Label>
                <Input
                  id="edit_price"
                  type="number"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({ ...formData, price: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit_description">توضیحات (اختیاری)</Label>
                <Input
                  id="edit_description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="edit_is_active"
                  checked={formData.is_active}
                  onChange={(e) =>
                    setFormData({ ...formData, is_active: e.target.checked })
                  }
                  className="w-4 h-4"
                />
                <Label htmlFor="edit_is_active" className="cursor-pointer">
                  فعال
                </Label>
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowEditModal(false)}
              >
                انصراف
              </Button>
              <Button type="submit">ذخیره تغییرات</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
