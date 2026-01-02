/**
 * Shared type definitions used throughout the Admin Panel.
 */

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'user' | 'admin' | 'blogger' | 'support';
  is_active?: boolean;
  created_at?: string;
}

export interface AuthResponse {
  access_token: string;
  user: User;
}

export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  winrate: number;
  trading_style?: string;
  trading_session?: string;
  keywords?: string[];
  backtest_trades_count?: number;
  markdown_description?: string;
  backtest_results?: any;
  thumbnail?: string;
  is_active: boolean;
  sort_order?: number;
  discountedPrice?: number;
  discountExpiresAt?: string;
  created_at: string;
  courses?: Course[];
  files?: File[];
  category?: Category;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  slug?: string;
  icon?: string;
  sort_order?: number;
  is_active?: boolean;
  parent_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  markdown_description?: string;
  markdown_content?: string;
  keywords?: string[];
  duration_minutes?: number;
  thumbnail?: string;
  is_active?: boolean;
  sort_order?: number;
  category?: Category;
  files?: File[];
  created_at?: string;
}

export interface File {
  id: string;
  name: string;
  type: string;
  size: number;
  isFree: boolean;
  path: string;
  created_at: string;
  mimetype?: string;
  products?: Product[];
  courses?: Course[];
}

export interface Transaction {
  id: string;
  user_id: string;
  product_id: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  refId: string;
  cryptoAddress?: string;
  cryptoAmount?: number;
  cryptoCurrency?: string;
  created_at: string;
  paid_at?: string;
  discount_amount?: number;
  tx_hash?: string;
  gateway?: string;
  user?: User;
  product?: Product;
}

export interface DiscountCode {
  id: string;
  code: string;
  amount: number;
  type: 'percentage' | 'fixed';
  is_active: boolean;
  max_uses?: number;
  current_uses?: number;
  start_date?: string;
  end_date?: string;
  description?: string;
  minimum_amount?: number;
}

export interface DiscountValidation {
  isValid: boolean;
  discountAmount: number;
  finalPrice: number;
  discountCode?: DiscountCode;
  message?: string;
}

export interface UserPurchase {
  id: string;
  user_id?: string;
  product_id?: string;
  purchased_at: string;
  user?: User;
  product?: Product;
  transaction?: Transaction | null;
}

export type TicketStatus = 'open' | 'in_progress' | 'waiting_for_user' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TicketType = 'technical' | 'billing' | 'general' | 'feature_request' | 'bug_report';
export type MessageType = 'user' | 'support' | 'system';

export interface Ticket {
  id: string;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  type: TicketType;
  reference_number?: string;
  user?: User;
  assigned_to?: User | null;
  messages?: TicketMessage[];
  resolved_at?: string | null;
  closed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TicketMessage {
  id: string;
  content: string;
  type: MessageType;
  is_internal: boolean;
  user?: User | null;
  ticket?: Ticket;
  created_at: string;
  updated_at: string;
}

export interface TicketListResponse {
  tickets: Ticket[];
  total: number;
  page: number;
  totalPages: number;
}

export interface TicketStatistics {
  total: number;
  open: number;
  in_progress: number;
  waiting_for_user: number;
  resolved: number;
  closed: number;
  by_priority: {
    low: number;
    medium: number;
    high: number;
    urgent: number;
  };
  by_type: {
    technical: number;
    billing: number;
    general: number;
    feature_request: number;
    bug_report: number;
  };
}

