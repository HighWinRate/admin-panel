'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Ticket, TicketStatus, TicketPriority, TicketType, User } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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

async function fetchTicketsList(params: {
  page: number;
  limit: number;
  status?: string;
  priority?: string;
  type?: string;
}) {
  const query = new URLSearchParams({
    page: String(params.page),
    limit: String(params.limit),
  });
  if (params.status) query.set('status', params.status);
  if (params.priority) query.set('priority', params.priority);
  if (params.type) query.set('type', params.type);

  const response = await fetch(`/api/admin/tickets?${query.toString()}`, {
    cache: 'no-store',
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error('Failed to load tickets');
  }
  return response.json();
}

async function fetchTicketDetails(ticketId: string) {
  const response = await fetch(`/api/admin/tickets/${ticketId}`, {
    cache: 'no-store',
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error('Failed to load ticket');
  }
  return response.json();
}

async function fetchTicketMessages(ticketId: string) {
  const response = await fetch(`/api/admin/tickets/${ticketId}/messages`, {
    cache: 'no-store',
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error('Failed to load messages');
  }
  return response.json();
}

async function sendTicketMessage(ticketId: string, payload: Record<string, unknown>) {
  const response = await fetch(`/api/admin/tickets/${ticketId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const message = await response.text().catch(() => 'خطا در ارسال پیام');
    throw new Error(message);
  }
  return response.json();
}

async function updateTicket(ticketId: string, payload: Record<string, unknown>) {
  const response = await fetch(`/api/admin/tickets/${ticketId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const message = await response.text().catch(() => 'خطا در به‌روزرسانی تیکت');
    throw new Error(message);
  }
  return response.json();
}

async function fetchSupportUsers(): Promise<User[]> {
  const response = await fetch('/api/admin/users', {
    cache: 'no-store',
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error('Failed to load users');
  }
  const data: User[] = await response.json();
  return data.filter((u) => u.role === 'admin' || u.role === 'support');
}

export default function TicketsPage() {
  const router = useRouter();
  const { user, isAuthenticated, loading } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<TicketStatus | 'all'>('all');
  const [filterPriority, setFilterPriority] = useState<TicketPriority | 'all'>('all');
  const [filterType, setFilterType] = useState<TicketType | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [updating, setUpdating] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);

  const loadTickets = async () => {
    const response = await fetchTicketsList({
      page: currentPage,
      limit: 20,
      status: filterStatus !== 'all' ? filterStatus : undefined,
      priority: filterPriority !== 'all' ? filterPriority : undefined,
      type: filterType !== 'all' ? filterType : undefined,
    });
    setTickets(response.tickets);
    setTotalPages(response.totalPages);
  };

  const loadSupportUsers = async () => {
    const data = await fetchSupportUsers();
    setUsers(data);
  };

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace('/login');
      return;
    }

    if (user && user.role !== 'admin' && user.role !== 'support') {
      router.replace('/login');
      return;
    }

    if (isAuthenticated) {
      setLoadingTickets(true);
      loadTickets()
        .catch((error) => console.error('Error fetching tickets:', error))
        .finally(() => setLoadingTickets(false));
      loadSupportUsers().catch((error) => console.error('Error fetching users:', error));
    }
  }, [
    isAuthenticated,
    loading,
    router,
    filterStatus,
    filterPriority,
    filterType,
    currentPage,
  ]);

  async function handleUpdateStatus(ticketId: string, newStatus: TicketStatus) {
    setUpdating(true);
    try {
      await updateTicket(ticketId, { status: newStatus });
      await loadTickets();
      if (selectedTicket?.id === ticketId) {
        const updated = await fetchTicketDetails(ticketId);
        setSelectedTicket(updated);
        const msgs = await fetchTicketMessages(ticketId);
        setMessages(msgs);
      }
    } catch (error: any) {
      alert(error.message || 'خطا در به‌روزرسانی وضعیت');
    } finally {
      setUpdating(false);
    }
  }

  async function handleAssignTicket(ticketId: string, assignedToId: string) {
    setUpdating(true);
    try {
      await updateTicket(ticketId, { assigned_to: assignedToId });
      await loadTickets();
      if (selectedTicket?.id === ticketId) {
        const updated = await fetchTicketDetails(ticketId);
        setSelectedTicket(updated);
        const msgs = await fetchTicketMessages(ticketId);
        setMessages(msgs);
      }
    } catch (error: any) {
      alert(error.message || 'خطا در اختصاص تیکت');
    } finally {
      setUpdating(false);
    }
  }

  async function handleViewDetails(ticket: Ticket) {
    try {
      const fullTicket = await fetchTicketDetails(ticket.id);
      setSelectedTicket(fullTicket);
      setIsDetailModalOpen(true);
      const msgs = await fetchTicketMessages(ticket.id);
      setMessages(msgs);
    } catch (error) {
      console.error('Error fetching ticket details:', error);
    }
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim() || !selectedTicket) return;

    setSendingMessage(true);
    try {
      await sendTicketMessage(selectedTicket.id, {
        content: newMessage.trim(),
        type: 'support',
        is_internal: false,
      });
      setNewMessage('');
      const msgs = await fetchTicketMessages(selectedTicket.id);
      setMessages(msgs);
      const updated = await fetchTicketDetails(selectedTicket.id);
      setSelectedTicket(updated);
    } catch (error: any) {
      console.error('Error sending message:', error);
      alert(error.message || 'خطا در ارسال پیام');
    } finally {
      setSendingMessage(false);
    }
  }

  const getStatusColor = (status: TicketStatus) => {
    const colors = {
      open: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
      in_progress: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300',
      waiting_for_user: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300',
      resolved: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
      closed: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300',
    };
    return colors[status] || colors.open;
  };

  const getStatusLabel = (status: TicketStatus) => {
    const labels = {
      open: 'باز',
      in_progress: 'در حال بررسی',
      waiting_for_user: 'در انتظار کاربر',
      resolved: 'حل شده',
      closed: 'بسته شده',
    };
    return labels[status] || status;
  };

  if (loading || loadingTickets) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">در حال بارگذاری...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">مدیریت تیکت‌ها</h1>

      {/* Filters */}
      <Card className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              وضعیت
            </label>
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value as TicketStatus | 'all');
                setCurrentPage(1);
              }}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="all">همه</option>
              <option value="open">باز</option>
              <option value="in_progress">در حال بررسی</option>
              <option value="waiting_for_user">در انتظار کاربر</option>
              <option value="resolved">حل شده</option>
              <option value="closed">بسته شده</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              اولویت
            </label>
            <select
              value={filterPriority}
              onChange={(e) => {
                setFilterPriority(e.target.value as TicketPriority | 'all');
                setCurrentPage(1);
              }}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="all">همه</option>
              <option value="low">پایین</option>
              <option value="medium">متوسط</option>
              <option value="high">بالا</option>
              <option value="urgent">فوری</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              نوع
            </label>
            <select
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value as TicketType | 'all');
                setCurrentPage(1);
              }}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="all">همه</option>
              <option value="technical">فنی</option>
              <option value="billing">مالی</option>
              <option value="general">عمومی</option>
              <option value="feature_request">درخواست ویژگی</option>
              <option value="bug_report">گزارش باگ</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Tickets List */}
      <div className="space-y-4">
        {tickets.map((ticket) => (
          <Card key={ticket.id}>
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    {ticket.subject}
                  </h3>
                  {ticket.reference_number && (
                    <span className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                      #{ticket.reference_number}
                    </span>
                  )}
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(ticket.status)}`}>
                    {getStatusLabel(ticket.status)}
                  </span>
                </div>
                <p className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-2">
                  {ticket.description}
                </p>
                <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                  <span>کاربر: {ticket.user ? `${ticket.user.first_name} ${ticket.user.last_name}` : 'نامشخص'}</span>
                  {ticket.assigned_to && (
                    <span>اختصاص داده شده به: {ticket.assigned_to.first_name} {ticket.assigned_to.last_name}</span>
                  )}
                  <span>
                    {new Date(ticket.created_at).toLocaleDateString('fa-IR')}
                  </span>
                </div>
              </div>
              <div className="ml-4 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleViewDetails(ticket)}
                >
                  مشاهده
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            قبلی
          </Button>
          <span className="px-4 py-2 text-gray-700 dark:text-gray-300">
            صفحه {currentPage} از {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            بعدی
          </Button>
        </div>
      )}

      {/* Detail Modal */}
      {selectedTicket && (
        <Dialog open={isDetailModalOpen} onOpenChange={(open) => {
          if (!open) {
            setIsDetailModalOpen(false);
            setSelectedTicket(null);
            setNewMessage('');
            setMessages([]);
          }
        }}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>تیکت: {selectedTicket.subject}</DialogTitle>
            </DialogHeader>
          <div className="space-y-6">
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">توضیحات</h4>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {selectedTicket.description}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  وضعیت
                </label>
                <select
                  value={selectedTicket.status}
                  onChange={(e) => handleUpdateStatus(selectedTicket.id, e.target.value as TicketStatus)}
                  disabled={updating}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="open">باز</option>
                  <option value="in_progress">در حال بررسی</option>
                  <option value="waiting_for_user">در انتظار کاربر</option>
                  <option value="resolved">حل شده</option>
                  <option value="closed">بسته شده</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  اختصاص به
                </label>
                <select
                  value={selectedTicket.assigned_to?.id || ''}
                  onChange={(e) => {
                    if (e.target.value) {
                      handleAssignTicket(selectedTicket.id, e.target.value);
                    }
                  }}
                  disabled={updating}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="">اختصاص نده</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.first_name} {u.last_name} ({u.role})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Messages Section */}
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-4">
                پیام‌ها ({messages.length})
              </h4>
              <div className="space-y-3 max-h-64 overflow-y-auto mb-4">
                {messages.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                    هیچ پیامی وجود ندارد
                  </p>
                ) : (
                  messages.map((msg) => {
                    const isSupportMessage = msg.type === 'support';
                    const isUserMessage = msg.type === 'user';
                    
                    return (
                      <div
                        key={msg.id}
                        className={`p-3 rounded-lg ${
                          isSupportMessage
                            ? 'bg-green-50 dark:bg-green-900/20 border-r-4 border-green-500'
                            : isUserMessage
                            ? 'bg-blue-50 dark:bg-blue-900/20 border-r-4 border-blue-500'
                            : 'bg-gray-50 dark:bg-gray-800'
                        }`}
                      >
                        <div className="flex justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {msg.user ? `${msg.user.first_name} ${msg.user.last_name}` : 'سیستم'}
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                              {msg.type === 'support' ? 'پشتیبانی' : msg.type === 'user' ? 'کاربر' : 'سیستم'}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(msg.created_at).toLocaleDateString('fa-IR', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                          {msg.content}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Send Message Form */}
              {selectedTicket.status !== 'closed' && (
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <h5 className="font-semibold text-gray-900 dark:text-white mb-3">
                    ارسال پیام جدید
                  </h5>
                  <form onSubmit={handleSendMessage} className="space-y-3">
                    <textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="پیام خود را وارد کنید..."
                      rows={4}
                      required
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                    />
                    <div className="flex gap-2">
                      <Button
                        type="submit"
                        disabled={sendingMessage}
                        className="bg-primary-600 hover:bg-primary-700 text-white"
                      >
                        {sendingMessage ? 'در حال ارسال...' : 'ارسال پیام'}
                      </Button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

