'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { BankAccount } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
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
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

function formatCardDisplay(cardNumber: string): string {
  const digits = String(cardNumber).replace(/\D/g, '');
  if (digits.length !== 16) return cardNumber;
  return `${digits.slice(0, 4)}-${digits.slice(4, 8)}-${digits.slice(8, 12)}-${digits.slice(12, 16)}`;
}

async function fetchBankAccounts(): Promise<BankAccount[]> {
  const response = await fetch('/api/admin/bank-accounts', {
    cache: 'no-store',
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Failed to load bank accounts');
  return response.json();
}

export default function BankAccountsPage() {
  const router = useRouter();
  const { user, isAuthenticated, loading } = useAuth();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    card_number: '',
    account_holder: '',
    bank_name: '',
    iban: '',
    is_active: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadAccounts = async () => {
    const data = await fetchBankAccounts();
    setAccounts(data);
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
        await loadAccounts();
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingList(false);
      }
    }
    if (isAuthenticated) fetchData();
  }, [user, isAuthenticated, loading, router]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    const digits = formData.card_number.replace(/\D/g, '');
    if (digits.length !== 16)
      newErrors.card_number = 'شماره کارت باید ۱۶ رقم باشد';
    if (!formData.account_holder.trim())
      newErrors.account_holder = 'نام گیرنده الزامی است';
    if (!formData.bank_name.trim()) newErrors.bank_name = 'نام بانک الزامی است';
    if (formData.iban.trim()) {
      const iban = formData.iban.replace(/\s/g, '');
      if (iban.length !== 26 || !iban.startsWith('IR')) {
        newErrors.iban = 'شماره شبا باید ۲۶ کاراکتر و با IR شروع شود';
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEdit = (account: BankAccount) => {
    setFormData({
      card_number: account.card_number,
      account_holder: account.account_holder,
      bank_name: account.bank_name,
      iban: account.iban || '',
      is_active: account.is_active,
    });
    setEditingId(account.id);
    setErrors({});
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      const payload = {
        card_number: formData.card_number.replace(/\D/g, ''),
        account_holder: formData.account_holder.trim(),
        bank_name: formData.bank_name.trim(),
        iban: formData.iban.trim() || null,
        is_active: formData.is_active,
      };
      const url = editingId
        ? `/api/admin/bank-accounts/${editingId}`
        : '/api/admin/bank-accounts';
      const method = editingId ? 'PATCH' : 'POST';
      const body = editingId ? { ...payload } : payload;
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'خطا در ذخیره');
      }
      await loadAccounts();
      handleCloseModal();
    } catch (err: unknown) {
      setErrors({
        submit: err instanceof Error ? err.message : 'خطا در ذخیره',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (account: BankAccount) => {
    try {
      const response = await fetch(`/api/admin/bank-accounts/${account.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ is_active: !account.is_active }),
      });
      if (!response.ok) throw new Error('خطا در به‌روزرسانی');
      await loadAccounts();
    } catch (err) {
      console.error(err);
      alert('خطا در به‌روزرسانی وضعیت');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('آیا از حذف این حساب اطمینان دارید؟')) return;
    try {
      const response = await fetch(`/api/admin/bank-accounts/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('خطا در حذف');
      await loadAccounts();
    } catch (err) {
      console.error(err);
      alert('خطا در حذف حساب');
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({
      card_number: '',
      account_holder: '',
      bank_name: '',
      iban: '',
      is_active: true,
    });
    setErrors({});
  };

  if (loading || loadingList) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <p className="text-center text-gray-600">در حال بارگذاری...</p>
      </div>
    );
  }

  if (!user || user.role !== 'admin') return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-primary-900">حساب‌های بانکی</h1>
        <Button
          onClick={() => {
            setEditingId(null);
            setFormData({
              card_number: '',
              account_holder: '',
              bank_name: '',
              iban: '',
              is_active: true,
            });
            setIsModalOpen(true);
          }}
        >
          افزودن حساب جدید
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">شماره کارت</TableHead>
                <TableHead className="text-right">نام گیرنده</TableHead>
                <TableHead className="text-right">نام بانک</TableHead>
                <TableHead className="text-right">وضعیت</TableHead>
                <TableHead className="text-right">عملیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-gray-500 py-8"
                  >
                    هیچ حسابی ثبت نشده است. برای پرداخت دستی حداقل یک حساب اضافه
                    کنید.
                  </TableCell>
                </TableRow>
              ) : (
                accounts.map((acc) => (
                  <TableRow key={acc.id}>
                    <TableCell className="font-mono">
                      {formatCardDisplay(acc.card_number)}
                    </TableCell>
                    <TableCell>{acc.account_holder}</TableCell>
                    <TableCell>{acc.bank_name}</TableCell>
                    <TableCell>
                      <Badge variant={acc.is_active ? 'default' : 'secondary'}>
                        {acc.is_active ? 'فعال' : 'غیرفعال'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(acc)}
                        >
                          ویرایش
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleActive(acc)}
                        >
                          {acc.is_active ? 'غیرفعال' : 'فعال'}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(acc.id)}
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

      <Dialog
        open={isModalOpen}
        onOpenChange={(open) => !open && handleCloseModal()}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'ویرایش حساب بانکی' : 'افزودن حساب بانکی'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="card_number">شماره کارت (۱۶ رقم) *</Label>
              <Input
                id="card_number"
                name="card_number"
                value={formData.card_number}
                onChange={handleInputChange}
                placeholder="6037-XXXX-XXXX-XXXX"
                maxLength={19}
              />
              {errors.card_number && (
                <p className="text-sm text-destructive">{errors.card_number}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="account_holder">نام گیرنده *</Label>
              <Input
                id="account_holder"
                name="account_holder"
                value={formData.account_holder}
                onChange={handleInputChange}
                placeholder="نام صاحب کارت"
              />
              {errors.account_holder && (
                <p className="text-sm text-destructive">
                  {errors.account_holder}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="bank_name">نام بانک *</Label>
              <Input
                id="bank_name"
                name="bank_name"
                value={formData.bank_name}
                onChange={handleInputChange}
                placeholder="مثال: ملی، ملت، ..."
              />
              {errors.bank_name && (
                <p className="text-sm text-destructive">{errors.bank_name}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="iban">شماره شبا (اختیاری)</Label>
              <Input
                id="iban"
                name="iban"
                value={formData.iban}
                onChange={handleInputChange}
                placeholder="IR..."
              />
              {errors.iban && (
                <p className="text-sm text-destructive">{errors.iban}</p>
              )}
            </div>
            {editingId && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleInputChange}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="is_active">حساب فعال</Label>
              </div>
            )}
            {errors.submit && (
              <p className="text-sm text-destructive">{errors.submit}</p>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseModal}
              >
                انصراف
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'در حال ذخیره...' : 'ذخیره'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
