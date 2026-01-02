import { createAdminClient } from '@/lib/supabase/admin';
import { Course, File, Product } from '@/lib/types';

type FileRelation = {
  file_id?: string | null;
  product_id?: string | null;
};

type FileCourseRelation = {
  file_id?: string | null;
  course_id?: string | null;
};

type FilePayload = {
  name: string;
  type: 'video' | 'pdf' | 'docx' | 'zip';
  isFree?: boolean;
  path: string;
  size: number;
  mimetype?: string;
  productIds?: string[];
  courseIds?: string[];
};

const FILE_BUCKET = 'files';

function uniqueIds(ids: Array<string | undefined | null>) {
  return [...new Set(ids.filter((id): id is string => Boolean(id)))];
}

async function syncFileProducts(
  client: ReturnType<typeof createAdminClient>,
  fileId: string,
  productIds?: string[],
) {
  await client.from('files_products').delete().eq('file_id', fileId);
  if (!productIds || productIds.length === 0) {
    return;
  }
  const rows = productIds.map((productId) => ({
    file_id: fileId,
    product_id: productId,
  }));
  await client.from('files_products').insert(rows);
}

async function syncFileCourses(
  client: ReturnType<typeof createAdminClient>,
  fileId: string,
  courseIds?: string[],
) {
  await client.from('files_courses_courses').delete().eq('filesId', fileId);
  if (!courseIds || courseIds.length === 0) {
    return;
  }
  const rows = courseIds.map((courseId) => ({
    filesId: fileId,
    coursesId: courseId,
  }));
  await client.from('files_courses_courses').insert(rows);
}

async function enrichFiles(files: File[]) {
  if (files.length === 0) {
    return [];
  }
  const client = createAdminClient();
  const fileIds = files.map((file) => file.id);

  const [productRelationsRes, courseRelationsRes] = await Promise.all([
    client
      .from<FileRelation>('files_products')
      .select('file_id, product_id')
      .in('file_id', fileIds),
    client
      .from<FileCourseRelation>('files_courses_courses')
      .select('filesId, coursesId')
      .in('filesId', fileIds),
  ]);

  if (productRelationsRes.error) {
    throw productRelationsRes.error;
  }
  if (courseRelationsRes.error) {
    throw courseRelationsRes.error;
  }

  const productIds = uniqueIds(productRelationsRes.data?.map((relation) => relation.product_id) || []);
  const courseIds = uniqueIds(courseRelationsRes.data?.map((relation) => relation.coursesId) || []);

  const [productsRes, coursesRes] = await Promise.all([
    client.from<Product>('products').select('id, title').in('id', productIds),
    client.from<Course>('courses').select('id, title').in('id', courseIds),
  ]);

  if (productsRes.error) {
    throw productsRes.error;
  }
  if (coursesRes.error) {
    throw coursesRes.error;
  }

  const productMap = new Map<string, Product>();
  productsRes.data?.forEach((product) => productMap.set(product.id, product));

  const courseMap = new Map<string, Course>();
  coursesRes.data?.forEach((course) => courseMap.set(course.id, course));

  return files.map((file) => {
    const associatedProducts = (productRelationsRes.data || [])
      .filter((relation) => relation.file_id === file.id)
      .map((relation) => relation.product_id)
      .filter(Boolean)
      .map((id) => productMap.get(id))
      .filter(Boolean) as Product[];

    const associatedCourses = (courseRelationsRes.data || [])
      .filter((relation) => relation.filesId === file.id)
      .map((relation) => relation.coursesId)
      .filter(Boolean)
      .map((id) => courseMap.get(id))
      .filter(Boolean) as Course[];

    return {
      ...file,
      products: associatedProducts,
      courses: associatedCourses,
    };
  });
}

export async function listFiles(): Promise<File[]> {
  const client = createAdminClient();
  const { data: files, error } = await client.from<File>('files').select('*').order('created_at', { ascending: false });
  if (error) {
    throw error;
  }
  if (!files) {
    return [];
  }
  return enrichFiles(files);
}

export async function getFileById(fileId: string): Promise<File | null> {
  const client = createAdminClient();
  const { data: file, error } = await client.from<File>('files').select('*').eq('id', fileId).single();
  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw error;
  }
  if (!file) {
    return null;
  }
  const enriched = await enrichFiles([file]);
  return enriched[0] || null;
}

export async function createFile(payload: FilePayload): Promise<File> {
  const client = createAdminClient();
  const { data: file, error } = await client.from('files').insert({
    name: payload.name,
    type: payload.type,
    isFree: payload.isFree ?? false,
    path: payload.path,
    size: payload.size,
    mimetype: payload.mimetype ?? null,
  }).select('*').single();

  if (error) {
    throw error;
  }
  if (!file) {
    throw new Error('Failed to create file record');
  }

  await Promise.all([
    syncFileProducts(client, file.id, payload.productIds),
    syncFileCourses(client, file.id, payload.courseIds),
  ]);

  const enriched = await getFileById(file.id);
  if (!enriched) {
    throw new Error('File created but could not be reloaded');
  }
  return enriched;
}

export async function updateFileRecord(fileId: string, payload: Partial<FilePayload>): Promise<File> {
  const client = createAdminClient();
  const updatePayload = Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined && value !== null),
  );
  const { error } = await client.from('files').update(updatePayload).eq('id', fileId);
  if (error) {
    throw error;
  }

  await Promise.all([
    syncFileProducts(client, fileId, payload.productIds),
    syncFileCourses(client, fileId, payload.courseIds),
  ]);

  const updated = await getFileById(fileId);
  if (!updated) {
    throw new Error('File not found after update');
  }
  return updated;
}

export async function deleteFile(fileId: string): Promise<void> {
  const client = createAdminClient();
  await client.from('files_products').delete().eq('file_id', fileId);
  await client.from('files_courses_courses').delete().eq('filesId', fileId);
  const { error } = await client.from('files').delete().eq('id', fileId);
  if (error) {
    throw error;
  }
}

export async function deleteFileFromStorage(path: string) {
  const client = createAdminClient();
  await client.storage.from(FILE_BUCKET).remove([path]);
}

export async function uploadFileToStorage(name: string, fileData: Buffer, mimetype?: string) {
  const client = createAdminClient();
  const filename = `${Date.now()}-${name}`.replace(/\s+/g, '_');
  const storagePath = `${filename}`;
  const { error } = await client.storage
    .from(FILE_BUCKET)
    .upload(storagePath, fileData, {
      contentType: mimetype,
      upsert: true,
    });
  if (error) {
    throw error;
  }
  return storagePath;
}

export function buildFileUrl(path?: string | null) {
  if (!path) {
    return null;
  }
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!baseUrl) {
    return null;
  }
  const normalized = baseUrl.replace(/\/$/, '');
  const cleanPath = path.replace(/^files\//u, '');
  return `${normalized}/storage/v1/object/public/${FILE_BUCKET}/${cleanPath}`;
}

