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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type {
  UserSubscriptionWithDetails,
  SubscriptionPlan,
} from '@/lib/types';

interface SubscriptionStats {
  total: number;
  active: number;
  expired: number;
  expiring_soon: number;
}

export default function SubscriptionsPage() {
  const router = useRouter();
  const { user, isAuthenticated, loading } = useAuth();

  const [subscriptions, setSubscriptions] = useState<
    UserSubscriptionWithDetails[]
  >([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [stats, setStats] = useState<SubscriptionStats>({
    total: 0,
    active: 0,
    expired: 0,
    expiring_soon: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSubscription, setEditingSubscription] =
    useState<UserSubscriptionWithDetails | null>(null);

  // Form data
  const [formData, setFormData] = useState({
    user_id: '',
    plan_id: '',
    transaction_id: '',
    start_date: '',
  });

  const [editFormData, setEditFormData] = useState({
    status: 'active' as 'active' | 'expired' | 'cancelled',
    end_date: '',
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

  // Fetch data
  useEffect(() => {
    if (user && user.role === 'admin') {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [subscriptionsRes, plansRes, statsRes] = await Promise.all([
        fetch('/api/admin/subscriptions'),
        fetch('/api/admin/subscription-plans'),
        fetch('/api/admin/subscriptions?action=stats'),
      ]);

      const subscriptionsData = await subscriptionsRes.json();
      const plansData = await plansRes.json();
      const statsData = await statsRes.json();

      setSubscriptions(subscriptionsData);
      setPlans(plansData);
      setStats(statsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(
        `/api/admin/subscriptions/users/${formData.user_id}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            plan_id: formData.plan_id,
            transaction_id: formData.transaction_id || undefined,
            start_date: formData.start_date || undefined,
          }),
        },
      );

      if (res.ok) {
        setShowCreateModal(false);
        setFormData({
          user_id: '',
          plan_id: '',
          transaction_id: '',
          start_date: '',
        });
        fetchData();
      } else {
        const error = await res.json();
        alert(error.error || 'خطا در ایجاد اشتراک');
      }
    } catch (error) {
      console.error('Error creating subscription:', error);
      alert('خطا در ایجاد اشتراک');
    }
  };

  const handleUpdateSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubscription) return;

    try {
      const res = await fetch(
        `/api/admin/subscriptions/${editingSubscription.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editFormData),
        },
      );

      if (res.ok) {
        setShowEditModal(false);
        setEditingSubscription(null);
        fetchData();
      } else {
        const error = await res.json();
        alert(error.error || 'خطا در ویرایش اشتراک');
      }
    } catch (error) {
      console.error('Error updating subscription:', error);
      alert('خطا در ویرایش اشتراک');
    }
  };

  const handleDeleteSubscription = async (id: string) => {
    if (!confirm('آیا مطمئن هستید که می‌خواهید این اشتراک را حذف کنید؟'))
      return;

    try {
      const res = await fetch(`/api/admin/subscriptions/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        fetchData();
      } else {
        const error = await res.json();
        alert(error.error || 'خطا در حذف اشتراک');
      }
    } catch (error) {
      console.error('Error deleting subscription:', error);
      alert('خطا در حذف اشتراک');
    }
  };

  const handleEdit = (subscription: UserSubscriptionWithDetails) => {
    setEditingSubscription(subscription);
    setEditFormData({
      status: subscription.status,
      end_date: subscription.end_date.split('T')[0],
    });
    setShowEditModal(true);
  };

  const handleExpireOldSubscriptions = async () => {
    if (
      !confirm(
        'آیا مطمئن هستید که می‌خواهید همه اشتراک‌های منقضی شده را به‌روز کنید؟',
      )
    )
      return;

    try {
      const res = await fetch('/api/admin/subscriptions?action=expire', {
        method: 'GET',
      });

      if (res.ok) {
        const data = await res.json();
        alert(`${data.expired_count} اشتراک به‌روز شد`);
        fetchData();
      }
    } catch (error) {
      console.error('Error expiring subscriptions:', error);
      alert('خطا در به‌روزرسانی اشتراک‌ها');
    }
  };

  // Filter subscriptions
  const filteredSubscriptions = subscriptions.filter((sub) => {
    const matchesSearch =
      !searchQuery ||
      sub.user?.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.user?.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.user?.last_name.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' || sub.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

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
        <h1 className="text-3xl font-bold">مدیریت اشتراک‌ها</h1>
        <div className="flex gap-4">
          <Button variant="outline" onClick={handleExpireOldSubscriptions}>
            به‌روزرسانی اشتراک‌های منقضی
          </Button>
          <Button onClick={() => setShowCreateModal(true)}>
            افزودن اشتراک جدید
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              کل اشتراک‌ها
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              فعال
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{stats.active}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              در حال انقضا
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-yellow-600">
              {stats.expiring_soon}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              منقضی شده
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">{stats.expired}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <Input
          placeholder="جستجو (ایمیل یا نام کاربر)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-xs"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="وضعیت" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه</SelectItem>
            <SelectItem value="active">فعال</SelectItem>
            <SelectItem value="expired">منقضی شده</SelectItem>
            <SelectItem value="cancelled">لغو شده</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Subscriptions Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>کاربر</TableHead>
                <TableHead>پلن</TableHead>
                <TableHead>وضعیت</TableHead>
                <TableHead>تاریخ شروع</TableHead>
                <TableHead>تاریخ پایان</TableHead>
                <TableHead>روزهای باقی‌مانده</TableHead>
                <TableHead>تراکنش</TableHead>
                <TableHead>عملیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSubscriptions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    اشتراکی یافت نشد
                  </TableCell>
                </TableRow>
              ) : (
                filteredSubscriptions.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {sub.user?.first_name} {sub.user?.last_name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {sub.user?.email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{sub.plan_name}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          sub.status === 'active'
                            ? 'default'
                            : sub.status === 'expired'
                              ? 'destructive'
                              : 'secondary'
                        }
                      >
                        {sub.status === 'active'
                          ? 'فعال'
                          : sub.status === 'expired'
                            ? 'منقضی'
                            : 'لغو شده'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(sub.start_date).toLocaleDateString('fa-IR')}
                    </TableCell>
                    <TableCell>
                      {new Date(sub.end_date).toLocaleDateString('fa-IR')}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          sub.is_expired
                            ? 'destructive'
                            : sub.is_expiring_soon
                              ? 'secondary'
                              : 'outline'
                        }
                      >
                        {sub.days_remaining} روز
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {sub.transaction_id || '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(sub)}
                        >
                          ویرایش
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteSubscription(sub.id)}
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
            <DialogTitle>افزودن اشتراک جدید</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateSubscription}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="user_id">شناسه کاربر (User ID)</Label>
                <Input
                  id="user_id"
                  value={formData.user_id}
                  onChange={(e) =>
                    setFormData({ ...formData, user_id: e.target.value })
                  }
                  placeholder="UUID کاربر"
                  required
                />
              </div>
              <div>
                <Label htmlFor="plan_id">پلن</Label>
                <Select
                  value={formData.plan_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, plan_id: value })
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="انتخاب پلن" />
                  </SelectTrigger>
                  <SelectContent>
                    {plans.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.name} ({plan.duration_days} روز -{' '}
                        {plan.price.toLocaleString('fa-IR')} تومان)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="transaction_id">شناسه تراکنش (اختیاری)</Label>
                <Input
                  id="transaction_id"
                  value={formData.transaction_id}
                  onChange={(e) =>
                    setFormData({ ...formData, transaction_id: e.target.value })
                  }
                  placeholder="UUID تراکنش"
                />
              </div>
              <div>
                <Label htmlFor="start_date">تاریخ شروع (اختیاری)</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) =>
                    setFormData({ ...formData, start_date: e.target.value })
                  }
                />
                <p className="text-sm text-muted-foreground mt-1">
                  اگر خالی باشد، از امروز شروع می‌شود
                </p>
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
              <Button type="submit">ایجاد اشتراک</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ویرایش اشتراک</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateSubscription}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit_status">وضعیت</Label>
                <Select
                  value={editFormData.status}
                  onValueChange={(value: any) =>
                    setEditFormData({ ...editFormData, status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">فعال</SelectItem>
                    <SelectItem value="expired">منقضی شده</SelectItem>
                    <SelectItem value="cancelled">لغو شده</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit_end_date">تاریخ پایان</Label>
                <Input
                  id="edit_end_date"
                  type="date"
                  value={editFormData.end_date}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, end_date: e.target.value })
                  }
                  required
                />
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
