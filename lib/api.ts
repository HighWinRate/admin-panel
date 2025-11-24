/**
 * API Client for Admin Panel - connecting to Backend
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// Types
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

export interface Course {
  id: string;
  title: string;
  description: string;
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
  products?: Product[];
  courses?: Course[];
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
  created_at?: string;
}

export class AdminApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string = API_URL) {
    this.baseUrl = baseUrl;
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('admin_token');
    }
  }

  setToken(token: string | null) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('admin_token', token);
      } else {
        localStorage.removeItem('admin_token');
      }
    }
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const config: RequestInit = {
      headers,
      ...options,
    };

    try {
      const response = await fetch(url, config);

      if (response.status === 401) {
        this.setToken(null);
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        throw new Error('Unauthorized');
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `HTTP error! status: ${response.status}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  private async requestFormData<T>(
    endpoint: string,
    formData: FormData
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers: Record<string, string> = {};

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (response.status === 401) {
        this.setToken(null);
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        throw new Error('Unauthorized');
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `HTTP error! status: ${response.status}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async patch<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // Auth endpoints
  async login(data: { email: string; password: string }): Promise<AuthResponse> {
    const response = await this.post<AuthResponse>('/auth/login', data);
    if (response.access_token) {
      this.setToken(response.access_token);
    }
    return response;
  }

  logout() {
    this.setToken(null);
  }

  // Product endpoints (Admin)
  async getProducts(): Promise<Product[]> {
    return this.get<Product[]>('/product');
  }

  async getProduct(id: string): Promise<Product> {
    return this.get<Product>(`/product/${id}`);
  }

  async createProduct(data: Partial<Product>): Promise<Product> {
    return this.post<Product>('/product', data);
  }

  async updateProduct(id: string, data: Partial<Product>): Promise<Product> {
    return this.patch<Product>(`/product/${id}`, data);
  }

  async deleteProduct(id: string): Promise<void> {
    return this.delete<void>(`/product/${id}`);
  }

  async uploadProductThumbnail(productId: string, file: File): Promise<Product> {
    const formData = new FormData();
    formData.append('thumbnail', file);
    return this.requestFormData<Product>(`/product/${productId}/thumbnail`, formData);
  }

  // Course endpoints (Admin)
  async getCourses(): Promise<Course[]> {
    return this.get<Course[]>('/course');
  }

  async getCourse(id: string): Promise<Course> {
    return this.get<Course>(`/course/${id}`);
  }

  async createCourse(data: Partial<Course>): Promise<Course> {
    return this.post<Course>('/course', data);
  }

  async updateCourse(id: string, data: Partial<Course>): Promise<Course> {
    return this.patch<Course>(`/course/${id}`, data);
  }

  async deleteCourse(id: string): Promise<void> {
    return this.delete<void>(`/course/${id}`);
  }

  async uploadCourseThumbnail(courseId: string, file: File): Promise<Course> {
    const formData = new FormData();
    formData.append('thumbnail', file);
    return this.requestFormData<Course>(`/course/${courseId}/thumbnail`, formData);
  }

  // File endpoints (Admin)
  async uploadFile(
    file: File,
    data: {
      name: string;
      type: 'video' | 'pdf' | 'docx' | 'zip';
      isFree: boolean;
      productIds?: string[];
      courseIds?: string[];
    }
  ): Promise<File> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', data.name);
    formData.append('type', data.type);
    formData.append('isFree', data.isFree.toString());
    if (data.productIds && data.productIds.length > 0) {
      // Append each product ID separately for multipart/form-data
      data.productIds.forEach((productId) => {
        formData.append('productIds', productId);
      });
    }
    if (data.courseIds && data.courseIds.length > 0) {
      // Append each course ID separately for multipart/form-data
      data.courseIds.forEach((courseId) => {
        formData.append('courseIds', courseId);
      });
    }
    return this.requestFormData<File>('/file', formData);
  }

  async getFiles(): Promise<File[]> {
    return this.get<File[]>('/file');
  }

  async getFile(id: string): Promise<File> {
    return this.get<File>(`/file/${id}`);
  }

  async updateFile(
    id: string,
    data: {
      name?: string;
      type?: 'video' | 'pdf' | 'docx' | 'zip';
      isFree?: boolean;
      productIds?: string[];
      courseIds?: string[];
    }
  ): Promise<File> {
    return this.patch<File>(`/file/${id}`, data);
  }

  async deleteFile(id: string): Promise<void> {
    return this.delete<void>(`/file/${id}`);
  }

  // User endpoints (Admin)
  async getUsers(): Promise<User[]> {
    return this.get<User[]>('/user');
  }

  async getUser(id: string): Promise<User> {
    return this.get<User>(`/user/${id}`);
  }

  async updateUser(id: string, data: Partial<User>): Promise<User> {
    return this.patch<User>(`/user/${id}`, data);
  }

  async deleteUser(id: string): Promise<void> {
    return this.delete<void>(`/user/${id}`);
  }

  // User Purchases endpoints (Admin)
  async getUserPurchases(userId: string): Promise<UserPurchase[]> {
    return this.get<UserPurchase[]>(`/user/${userId}/purchases`);
  }

  async addProductToUser(userId: string, productId: string): Promise<UserPurchase> {
    return this.post<UserPurchase>(`/user/${userId}/purchases`, { productId });
  }

  async removeProductFromUser(userId: string, productId: string): Promise<void> {
    return this.delete<void>(`/user/${userId}/purchases/${productId}`);
  }

  // Transaction endpoints (Admin)
  async getTransactions(): Promise<Transaction[]> {
    return this.get<Transaction[]>('/transaction');
  }

  async getTransaction(id: string): Promise<Transaction> {
    return this.get<Transaction>(`/transaction/${id}`);
  }

  async updateTransaction(
    id: string,
    data: Partial<Transaction>
  ): Promise<Transaction> {
    return this.patch<Transaction>(`/transaction/${id}`, data);
  }

  // Discount endpoints (Admin)
  async getDiscountCodes(): Promise<DiscountCode[]> {
    return this.get<DiscountCode[]>('/discount');
  }

  async getDiscountCode(id: string): Promise<DiscountCode> {
    return this.get<DiscountCode>(`/discount/${id}`);
  }

  async createDiscountCode(data: Partial<DiscountCode>): Promise<DiscountCode> {
    return this.post<DiscountCode>('/discount', data);
  }

  async updateDiscountCode(id: string, data: Partial<DiscountCode>): Promise<DiscountCode> {
    return this.patch<DiscountCode>(`/discount/${id}`, data);
  }

  async deleteDiscountCode(id: string): Promise<void> {
    return this.delete<void>(`/discount/${id}`);
  }

  // Category endpoints (Admin)
  async getCategories(): Promise<Category[]> {
    return this.get<Category[]>('/categories');
  }

  async getCategory(id: string): Promise<Category> {
    return this.get<Category>(`/categories/${id}`);
  }

  async createCategory(data: Partial<Category>): Promise<Category> {
    return this.post<Category>('/categories', data);
  }

  async updateCategory(id: string, data: Partial<Category>): Promise<Category> {
    return this.patch<Category>(`/categories/${id}`, data);
  }

  async deleteCategory(id: string): Promise<void> {
    return this.delete<void>(`/categories/${id}`);
  }
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

export const adminApiClient = new AdminApiClient();

