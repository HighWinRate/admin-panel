'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { File as FileType, Course, Product } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

async function fetchFilesList(): Promise<FileType[]> {
  const response = await fetch('/api/admin/files', {
    cache: 'no-store',
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error('Failed to load files');
  }
  return response.json();
}

async function fetchFileDetails(id: string): Promise<FileType> {
  const response = await fetch(`/api/admin/files/${id}`, {
    cache: 'no-store',
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error('Failed to load file details');
  }
  return response.json();
}

async function fetchAdminCoursesForFiles(): Promise<Course[]> {
  const response = await fetch('/api/admin/courses', {
    cache: 'no-store',
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error('Failed to load courses');
  }
  return response.json();
}

async function fetchAdminProducts(): Promise<Product[]> {
  const response = await fetch('/api/admin/products', {
    cache: 'no-store',
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error('Failed to load products');
  }
  return response.json();
}

export default function FilesPage() {
  const router = useRouter();
  const { user, isAuthenticated, loading } = useAuth();
  const [files, setFiles] = useState<FileType[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [loadingData, setLoadingData] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingFile, setEditingFile] = useState<FileType | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [editError, setEditError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [editSuccess, setEditSuccess] = useState(false);
  
  // Upload form state
  const [fileToUpload, setFileToUpload] = useState<globalThis.File | null>(null);
  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState<'video' | 'pdf' | 'docx' | 'zip'>('pdf');
  const [isFree, setIsFree] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);

  // Edit form state
  const [editFileName, setEditFileName] = useState('');
  const [editFileType, setEditFileType] = useState<'video' | 'pdf' | 'docx' | 'zip'>('pdf');
  const [editIsFree, setEditIsFree] = useState(false);
  const [editSelectedProductIds, setEditSelectedProductIds] = useState<string[]>([]);
  const [editSelectedCourseIds, setEditSelectedCourseIds] = useState<string[]>([]);

  const loadFiles = async () => {
    const list = await fetchFilesList();
    setFiles(list);
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
        const [filesData, coursesData, productsData] = await Promise.all([
          fetchFilesList(),
          fetchAdminCoursesForFiles(),
          fetchAdminProducts(),
        ]);
        setFiles(filesData);
        setCourses(coursesData);
        setProducts(productsData);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoadingFiles(false);
        setLoadingData(false);
      }
    }

    if (isAuthenticated) {
      fetchData();
    }
  }, [user, isAuthenticated, loading, router]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileToUpload(file);
      if (!fileName) {
        setFileName(file.name);
      }
      // Detect file type from extension
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext === 'mp4' || ext === 'avi' || ext === 'mov' || ext === 'mkv') {
        setFileType('video');
      } else if (ext === 'pdf') {
        setFileType('pdf');
      } else if (ext === 'docx' || ext === 'doc') {
        setFileType('docx');
      } else if (ext === 'zip' || ext === 'rar' || ext === '7z') {
        setFileType('zip');
      }
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileToUpload) {
      setUploadError('لطفاً یک فایل انتخاب کنید');
      return;
    }

    setUploading(true);
    setUploadError('');
    setUploadSuccess(false);

    try {
      const formData = new FormData();
      formData.append('file', fileToUpload);
      formData.append('name', fileName);
      formData.append('type', fileType);
      formData.append('isFree', String(isFree));
      selectedProductIds.forEach((id) => formData.append('productIds', id));
      selectedCourseIds.forEach((id) => formData.append('courseIds', id));

      const response = await fetch('/api/admin/files/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const message = await response.text().catch(() => 'خطا در آپلود فایل');
        throw new Error(message);
      }

      await loadFiles();

      // Reset form
      setFileToUpload(null);
      setFileName('');
      setFileType('pdf');
      setIsFree(false);
      setSelectedProductIds([]);
      setSelectedCourseIds([]);
      setShowUploadModal(false);
      setUploadSuccess(true);

      // Hide success message after 3 seconds
      setTimeout(() => setUploadSuccess(false), 3000);
    } catch (error: any) {
      setUploadError(error.message || 'خطا در آپلود فایل. لطفاً دوباره تلاش کنید.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('آیا از حذف این فایل اطمینان دارید؟')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/files/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const message = await response.text().catch(() => 'خطا در حذف فایل');
        throw new Error(message);
      }
      await loadFiles();
    } catch (error) {
      console.error('Error deleting file:', error);
      alert('خطا در حذف فایل. لطفاً دوباره تلاش کنید.');
    }
  };

  const handleEdit = async (file: FileType) => {
    setEditingFile(file);
    setEditFileName(file.name);
    setEditFileType(file.type as 'video' | 'pdf' | 'docx' | 'zip');
    setEditIsFree(file.isFree);
    
    // Fetch full file data to get courses and products
    try {
      const fullFile = await fetchFileDetails(file.id);
      // Extract product IDs from products array
      if (fullFile.products && Array.isArray(fullFile.products)) {
        setEditSelectedProductIds(fullFile.products.map((p: Product) => p.id));
      } else {
        setEditSelectedProductIds([]);
      }
      
      // Extract course IDs from courses array
      if (fullFile.courses && Array.isArray(fullFile.courses)) {
        setEditSelectedCourseIds(fullFile.courses.map((c: Course) => c.id));
      } else {
        setEditSelectedCourseIds([]);
      }
    } catch (error) {
      console.error('Error fetching file details:', error);
      setEditSelectedProductIds([]);
      setEditSelectedCourseIds([]);
    }
    
    setEditError('');
    setEditSuccess(false);
    setShowEditModal(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFile) return;

    setSaving(true);
    setEditError('');
    setEditSuccess(false);

    try {
      const response = await fetch(`/api/admin/files/${editingFile.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name: editFileName,
          type: editFileType,
          isFree: editIsFree,
          productIds: editSelectedProductIds.length > 0 ? editSelectedProductIds : undefined,
          courseIds: editSelectedCourseIds.length > 0 ? editSelectedCourseIds : undefined,
        }),
      });

      if (!response.ok) {
        const message = await response.text().catch(() => 'خطا در به‌روزرسانی فایل');
        throw new Error(message);
      }

      await loadFiles();

      // Close modal
      setShowEditModal(false);
      setEditingFile(null);
      setEditSuccess(true);

      // Hide success message after 3 seconds
      setTimeout(() => setEditSuccess(false), 3000);
    } catch (error: any) {
      setEditError(error.message || 'خطا در به‌روزرسانی فایل. لطفاً دوباره تلاش کنید.');
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = async (file: FileType) => {
    try {
      const response = await fetch(`/api/files/${file.id}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('خطا در دانلود فایل');
      }

      // Get blob and create download link
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('خطا در دانلود فایل. لطفاً دوباره تلاش کنید.');
    }
  };

  if (loading || loadingFiles) {
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
      {/* Success messages */}
      {uploadSuccess && (
        <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg text-green-800 dark:text-green-300">
          فایل با موفقیت آپلود شد
        </div>
      )}
      {editSuccess && (
        <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg text-green-800 dark:text-green-300">
          فایل با موفقیت به‌روزرسانی شد
        </div>
      )}

      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">مدیریت فایل‌ها</h1>
        <Button variant="primary" onClick={() => setShowUploadModal(true)}>
          آپلود فایل جدید
        </Button>
      </div>

      {files.length === 0 ? (
        <div className="text-center py-12">
              <p className="text-gray-600 dark:text-gray-400">هنوز فایلی آپلود نشده است</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {files.map((file) => (
            <Card key={file.id} className="p-6">
              <h3 className="text-xl font-semibold mb-2 dark:text-gray-200">{file.name}</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                نوع: {file.type} | حجم: {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
              <div className="flex justify-between items-center mb-4">
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                  file.isFree ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300' : 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300'
                }`}>
                  {file.isFree ? 'رایگان' : 'پولی'}
                </span>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleDownload(file)}
                >
                  دانلود
                </Button>
                <Button 
                  variant="primary" 
                  size="sm"
                  onClick={() => handleEdit(file)}
                >
                  ویرایش
                </Button>
                <Button 
                  variant="danger" 
                  size="sm"
                  onClick={() => handleDelete(file.id)}
                >
                  حذف
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto text-gray-900 dark:text-gray-100">
            <h2 className="text-2xl font-bold mb-4">آپلود فایل جدید</h2>
            
            {uploadError && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded text-red-800 dark:text-red-300 text-sm">
                {uploadError}
              </div>
            )}

            <form onSubmit={handleUpload}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  فایل
                </label>
                <input
                  type="file"
                  onChange={handleFileSelect}
                  className="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 dark:file:bg-blue-900 file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-100 dark:hover:file:bg-blue-800"
                  required
                />
                {fileToUpload && (
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    انتخاب شده: {fileToUpload.name} ({(fileToUpload.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
              </div>

              <div className="mb-4">
                <Input
                  label="نام فایل"
                  type="text"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  نوع فایل
                </label>
                <select
                  value={fileType}
                  onChange={(e) => setFileType(e.target.value as 'video' | 'pdf' | 'docx' | 'zip')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  required
                >
                  <option value="pdf">PDF</option>
                  <option value="video">ویدیو</option>
                  <option value="docx">Word (DOCX)</option>
                  <option value="zip">Zip Archive</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={isFree}
                    onChange={(e) => setIsFree(e.target.checked)}
                    className="mr-2 rounded border-gray-300 dark:border-gray-600 text-blue-600 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-800"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">فایل رایگان</span>
                </label>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  محصولات مرتبط (اختیاری - می‌توانید چند محصول انتخاب کنید)
                </label>
                <div className="max-h-40 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-md p-2 bg-white dark:bg-gray-800">
                  {products.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">هیچ محصولی موجود نیست</p>
                  ) : (
                    products.map((product) => (
                      <label key={product.id} className="flex items-center py-1">
                        <input
                          type="checkbox"
                          checked={selectedProductIds.includes(product.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedProductIds([...selectedProductIds, product.id]);
                            } else {
                              setSelectedProductIds(selectedProductIds.filter(id => id !== product.id));
                            }
                          }}
                          className="mr-2 rounded border-gray-300 dark:border-gray-600 text-blue-600 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-800"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{product.title}</span>
                      </label>
                    ))
                  )}
                </div>
                {selectedProductIds.length > 0 && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {selectedProductIds.length} محصول انتخاب شده
                  </p>
                )}
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  دوره‌های مرتبط (اختیاری - می‌توانید چند دوره انتخاب کنید)
                </label>
                <div className="max-h-40 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-md p-2 bg-white dark:bg-gray-800">
                  {courses.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">هیچ دوره‌ای موجود نیست</p>
                  ) : (
                    courses.map((course) => (
                      <label key={course.id} className="flex items-center py-1">
                        <input
                          type="checkbox"
                          checked={selectedCourseIds.includes(course.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedCourseIds([...selectedCourseIds, course.id]);
                            } else {
                              setSelectedCourseIds(selectedCourseIds.filter(id => id !== course.id));
                            }
                          }}
                          className="mr-2 rounded border-gray-300 dark:border-gray-600 text-blue-600 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-800"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{course.title}</span>
                      </label>
                    ))
                  )}
                </div>
                {selectedCourseIds.length > 0 && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {selectedCourseIds.length} دوره انتخاب شده
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={uploading}
                  disabled={uploading}
                >
                  آپلود
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowUploadModal(false);
                    setUploadError('');
                    setFileToUpload(null);
                    setFileName('');
                    setFileType('pdf');
                    setIsFree(false);
                    setSelectedProductIds([]);
                    setSelectedCourseIds([]);
                  }}
                >
                  لغو
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingFile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto text-gray-900 dark:text-gray-100">
            <h2 className="text-2xl font-bold mb-4">ویرایش فایل</h2>
            
            {editError && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded text-red-800 dark:text-red-300 text-sm">
                {editError}
              </div>
            )}

            <form onSubmit={handleUpdate}>
              <div className="mb-4">
                <Input
                  label="نام فایل"
                  type="text"
                  value={editFileName}
                  onChange={(e) => setEditFileName(e.target.value)}
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  نوع فایل
                </label>
                <select
                  value={editFileType}
                  onChange={(e) => setEditFileType(e.target.value as 'video' | 'pdf' | 'docx' | 'zip')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  required
                >
                  <option value="pdf">PDF</option>
                  <option value="video">ویدیو</option>
                  <option value="docx">Word (DOCX)</option>
                  <option value="zip">Zip Archive</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={editIsFree}
                    onChange={(e) => setEditIsFree(e.target.checked)}
                    className="mr-2 rounded border-gray-300 dark:border-gray-600 text-blue-600 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-800"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">فایل رایگان</span>
                </label>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  محصولات مرتبط (اختیاری - می‌توانید چند محصول انتخاب کنید)
                </label>
                <div className="max-h-40 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-md p-2 bg-white dark:bg-gray-800">
                  {products.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">هیچ محصولی موجود نیست</p>
                  ) : (
                    products.map((product) => (
                      <label key={product.id} className="flex items-center py-1">
                        <input
                          type="checkbox"
                          checked={editSelectedProductIds.includes(product.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setEditSelectedProductIds([...editSelectedProductIds, product.id]);
                            } else {
                              setEditSelectedProductIds(editSelectedProductIds.filter(id => id !== product.id));
                            }
                          }}
                          className="mr-2 rounded border-gray-300 dark:border-gray-600 text-blue-600 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-800"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{product.title}</span>
                      </label>
                    ))
                  )}
                </div>
                {editSelectedProductIds.length > 0 && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {editSelectedProductIds.length} محصول انتخاب شده
                  </p>
                )}
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  دوره‌های مرتبط (اختیاری - می‌توانید چند دوره انتخاب کنید)
                </label>
                <div className="max-h-40 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-md p-2 bg-white dark:bg-gray-800">
                  {courses.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">هیچ دوره‌ای موجود نیست</p>
                  ) : (
                    courses.map((course) => (
                      <label key={course.id} className="flex items-center py-1">
                        <input
                          type="checkbox"
                          checked={editSelectedCourseIds.includes(course.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setEditSelectedCourseIds([...editSelectedCourseIds, course.id]);
                            } else {
                              setEditSelectedCourseIds(editSelectedCourseIds.filter(id => id !== course.id));
                            }
                          }}
                          className="mr-2 rounded border-gray-300 dark:border-gray-600 text-blue-600 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-800"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{course.title}</span>
                      </label>
                    ))
                  )}
                </div>
                {editSelectedCourseIds.length > 0 && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {editSelectedCourseIds.length} دوره انتخاب شده
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={saving}
                  disabled={saving}
                >
                  ذخیره
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingFile(null);
                    setEditError('');
                    setEditFileName('');
                    setEditFileType('pdf');
                    setEditIsFree(false);
                    setEditSelectedProductIds([]);
                    setEditSelectedCourseIds([]);
                  }}
                >
                  لغو
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

