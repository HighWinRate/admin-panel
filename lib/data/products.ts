import { createAdminClient } from '@/lib/supabase/admin';
import { Category, Course, File, Product } from '@/lib/types';

type ProductRelation = {
  product_id?: string | null;
  course_id?: string | null;
};

type ProductPayload = Partial<Product> & {
  category_id?: string | null;
  courseIds?: string[];
};

const STORAGE_BUCKET = 'thumbnails';

function uniqueIds(ids: Array<string | undefined | null>) {
  return [...new Set(ids.filter((id): id is string => Boolean(id)))];
}

async function syncProductCourses(
  client: ReturnType<typeof createAdminClient>,
  productId: string,
  courseIds?: string[],
) {
  await client.from('product_courses').delete().eq('product_id', productId);

  if (!courseIds || courseIds.length === 0) {
    return;
  }

  const rows = courseIds.map((courseId) => ({
    product_id: productId,
    course_id: courseId,
  }));
  await client.from('product_courses').insert(rows);
}

type ProductRecord = Product & {
  category_id?: string | null;
};

function mapProductRelations(
  products: ProductRecord[],
  categories: Category[],
  productCourses: ProductRelation[],
  courses: Course[],
  fileRelations: { product_id?: string | null; file_id?: string | null }[],
  files: File[],
) {
  const categoryMap = new Map<string, Category>();
  categories.forEach((category) => categoryMap.set(category.id, category));

  const courseMap = new Map<string, Course>();
  courses.forEach((course) => courseMap.set(course.id, course));

  const fileMap = new Map<string, File>();
  files.forEach((file) => fileMap.set(file.id, file));

  const productCoursesMap = new Map<string, string[]>();
  productCourses.forEach((relation) => {
    const productId = relation.product_id;
    const courseId = relation.course_id;
    if (!productId || !courseId) {
      return;
    }
    const existing = productCoursesMap.get(productId) || [];
    existing.push(courseId);
    productCoursesMap.set(productId, existing);
  });

  const productFilesMap = new Map<string, string[]>();
  fileRelations.forEach((relation) => {
    const productId = relation.product_id;
    const fileId = relation.file_id;
    if (!productId || !fileId) {
      return;
    }
    const existing = productFilesMap.get(productId) || [];
    existing.push(fileId);
    productFilesMap.set(productId, existing);
  });

  return products.map((product) => ({
    ...product,
    category: (product as any).category_id ? categoryMap.get((product as any).category_id) || undefined : undefined,
    courses: (productCoursesMap.get(product.id) || [])
      .map((courseId) => courseMap.get(courseId))
      .filter(Boolean) as Course[],
    files: (productFilesMap.get(product.id) || [])
      .map((fileId) => fileMap.get(fileId))
      .filter(Boolean) as File[],
  }));
}

export async function listProducts(): Promise<Product[]> {
  const client = createAdminClient();

  const [{ data: products, error: productsError }, { data: categories, error: categoriesError }] =
    await Promise.all([
      client.from('products').select('*').order('sort_order', { ascending: true }),
      client.from('categories').select('id, name, slug'),
    ]);

  if (productsError) {
    throw productsError;
  }
  if (categoriesError) {
    throw categoriesError;
  }

  const productIds = products ? products.map((product) => product.id) : [];
  const productCoursesResult = await client
    .from('product_courses')
    .select('product_id, course_id')
    .in('product_id', productIds);

  const filesProductsResult = await client
    .from('files_products')
    .select('product_id, file_id')
    .in('product_id', productIds);

  const courseIds = uniqueIds(productCoursesResult.data?.map((relation) => relation.course_id) || []);
  const courseResult = await client
    .from('courses')
    .select('*')
    .in('id', courseIds);

  const fileIds = uniqueIds(filesProductsResult.data?.map((relation) => relation.file_id) || []);
  const fileResult = await client
    .from('files')
    .select('*')
    .in('id', fileIds);

  if (productCoursesResult.error) {
    throw productCoursesResult.error;
  }
  if (filesProductsResult.error) {
    throw filesProductsResult.error;
  }
  if (courseResult.error) {
    throw courseResult.error;
  }
  if (fileResult.error) {
    throw fileResult.error;
  }

  return mapProductRelations(
    products || [],
    categories || [],
    productCoursesResult.data || [],
    courseResult.data || [],
    filesProductsResult.data || [],
    fileResult.data || [],
  );
}

export async function getProductById(productId: string): Promise<Product | null> {
  const client = createAdminClient();
  const { data: product, error } = await client.from('products').select('*').eq('id', productId).single();
  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw error;
  }
  if (!product) {
    return null;
  }

  const [{ data: category }, productCoursesResult, filesProductsResult] = await Promise.all([
    client.from('categories').select('id, name, slug').eq('id', product.category_id).single(),
    client
      .from('product_courses')
      .select('course_id')
      .eq('product_id', productId),
    client
      .from('files_products')
      .select('file_id')
      .eq('product_id', productId),
  ]);

  if (productCoursesResult.error) {
    throw productCoursesResult.error;
  }
  if (filesProductsResult.error) {
    throw filesProductsResult.error;
  }

  const courseIds = uniqueIds(productCoursesResult.data?.map((relation) => relation.course_id) || []);
  const courseResult = await client
    .from('courses')
    .select('*')
    .in('id', courseIds);

  const fileIds = uniqueIds(filesProductsResult.data?.map((relation) => relation.file_id) || []);
  const fileResult = await client
    .from('files')
    .select('*')
    .in('id', fileIds);

  if (courseResult.error) {
    throw courseResult.error;
  }
  if (fileResult.error) {
    throw fileResult.error;
  }

  const [mappedProduct] = mapProductRelations(
    [product],
    category ? [category] : [],
    productCoursesResult.data || [],
    courseResult.data || [],
    filesProductsResult.data || [],
    fileResult.data || [],
  );

  return mappedProduct;
}

export async function createProduct(payload: ProductPayload): Promise<Product> {
  const client = createAdminClient();
  const { courseIds, ...rest } = payload;
  const { data: product, error } = await client
    .from('products')
    .insert(rest)
    .select('*')
    .single();

  if (error) {
    throw error;
  }
  if (!product) {
    throw new Error('Failed to create product');
  }

  await syncProductCourses(client, product.id, courseIds);
  return getProductById(product.id).then((result) => {
    if (!result) {
      throw new Error('Product created but could not be fetched');
    }
    return result;
  });
}

export async function updateProduct(productId: string, payload: ProductPayload): Promise<Product> {
  const client = createAdminClient();
  const { courseIds, ...rest } = payload;
  const { error } = await client.from('products').update(rest).eq('id', productId);
  if (error) {
    throw error;
  }

  await syncProductCourses(client, productId, courseIds);
  const updated = await getProductById(productId);
  if (!updated) {
    throw new Error('Product not found after update');
  }
  return updated;
}

export async function deleteProduct(productId: string): Promise<void> {
  const client = createAdminClient();
  await client.from('product_courses').delete().eq('product_id', productId);
  const { error } = await client.from('products').delete().eq('id', productId);
  if (error) {
    throw error;
  }
}

export async function updateProductThumbnail(productId: string, thumbnailPath: string): Promise<Product> {
  const client = createAdminClient();
  const { error } = await client.from('products').update({ thumbnail: thumbnailPath }).eq('id', productId);
  if (error) {
    throw error;
  }
  const updated = await getProductById(productId);
  if (!updated) {
    throw new Error('Product not found after updating thumbnail');
  }
  return updated;
}

export function buildThumbnailUrl(path?: string | null) {
  if (!path) {
    return null;
  }
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!baseUrl) {
    return null;
  }
  const normalized = baseUrl.replace(/\/$/, '');
  const cleanPath = path.replace(/^thumbnails\//u, '');
  return `${normalized}/storage/v1/object/public/${STORAGE_BUCKET}/${cleanPath}`;
}

