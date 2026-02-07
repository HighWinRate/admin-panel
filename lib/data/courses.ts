import { createAdminClient } from '@/lib/supabase/admin';
import { Course, File, Category } from '@/lib/types';

type CourseRecord = Course & {
  category_id?: string | null;
};

type FileRelation = {
  filesId?: string | null;
  coursesId?: string | null;
};

type CoursePayload = {
  title: string;
  description?: string;
  markdown_description?: string;
  markdown_content?: string;
  keywords?: string[];
  thumbnail?: string;
  is_active?: boolean;
  sort_order?: number;
  duration_minutes?: number;
  categoryId?: string | null;
  fileIds?: string[];
};

const THUMBNAIL_BUCKET = 'thumbnails';

function uniqueIds(ids: Array<string | undefined | null>) {
  return [...new Set(ids.filter((id): id is string => Boolean(id)))];
}

async function syncCourseFiles(
  client: ReturnType<typeof createAdminClient>,
  courseId: string,
  fileIds?: string[],
) {
  await client.from('files_courses_courses').delete().eq('coursesId', courseId);
  if (!fileIds || fileIds.length === 0) {
    return;
  }
  const rows = fileIds.map((fileId) => ({
    filesId: fileId,
    coursesId: courseId,
  }));
  await client.from('files_courses_courses').insert(rows);
}

function mapCourses(
  courses: CourseRecord[],
  categories: Category[],
  fileRelations: FileRelation[],
  files: File[],
) {
  const categoryMap = new Map<string, Category>();
  categories.forEach((category) => categoryMap.set(category.id, category));

  const fileMap = new Map<string, File>();
  files.forEach((file) => fileMap.set(file.id, file));

  const courseFilesMap = new Map<string, string[]>();
  fileRelations.forEach((relation) => {
    if (!relation.coursesId || !relation.filesId) {
      return;
    }
    const existing = courseFilesMap.get(relation.coursesId) || [];
    existing.push(relation.filesId);
    courseFilesMap.set(relation.coursesId, existing);
  });

  return courses.map((course) => ({
    ...course,
    category:
      course.category_id && categoryMap.has(course.category_id)
        ? categoryMap.get(course.category_id) || undefined
        : course.category || undefined,
    files: (courseFilesMap.get(course.id) || [])
      .map((fileId) => fileMap.get(fileId))
      .filter(Boolean) as File[],
  }));
}

export async function listCourses(): Promise<Course[]> {
  const client = createAdminClient();
  const [{ data: courses, error: coursesError }, { data: categories, error: categoriesError }] =
    await Promise.all([
      client.from('courses').select('*').order('sort_order', { ascending: true }),
      client.from('categories').select('id, name, slug'),
    ]);

  if (coursesError) {
    throw coursesError;
  }
  if (categoriesError) {
    throw categoriesError;
  }

  const courseIds = courses ? courses.map((course) => course.id) : [];

  const { data: fileRelations, error: fileRelationsError } = await client
    .from('files_courses_courses')
    .select('filesId, coursesId')
    .in('coursesId', courseIds);

  if (fileRelationsError) {
    throw fileRelationsError;
  }

  const fileIds = uniqueIds(
    fileRelations?.map((relation) => relation.filesId) || [],
  );
  const { data: files, error: filesError } = await client
    .from('files')
    .select('id, name, type, path, size, isFree, mimetype, url, created_at')
    .in('id', fileIds);

  if (filesError) {
    throw filesError;
  }

  return mapCourses(courses || [], categories || [], fileRelations || [], files || []);
}

export async function getCourseById(courseId: string): Promise<Course | null> {
  const client = createAdminClient();
  const { data: course, error } = await client
    .from('courses')
    .select('*')
    .eq('id', courseId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw error;
  }
  if (!course) {
    return null;
  }

  const [{ data: category }, fileRelationsResult] = await Promise.all([
    client
      .from('categories')
      .select('id, name, slug')
      .eq('id', course.category_id)
      .single(),
    client
      .from('files_courses_courses')
      .select('filesId')
      .eq('coursesId', courseId),
  ]);

  const fileIds = uniqueIds(fileRelationsResult.data?.map((relation) => relation.filesId) || []);
  const { data: files, error: filesError } = await client
    .from('files')
    .select('id, name, type, path, size, isFree, mimetype, url, created_at')
    .in('id', fileIds);

  if (filesError) {
    throw filesError;
  }

  const [mapped] = mapCourses(
    [course],
    category ? [category] : [],
    fileRelationsResult.data || [],
    files || [],
  );

  return mapped;
}

export async function createCourse(payload: CoursePayload): Promise<Course> {
  const client = createAdminClient();
  const { fileIds, categoryId, ...rest } = payload;
  const { data: course, error } = await client.from('courses').insert({
    ...rest,
    category_id: categoryId ?? null,
  }).select('*').single();

  if (error) {
    throw error;
  }
  if (!course) {
    throw new Error('Failed to create course');
  }

  await syncCourseFiles(client, course.id, fileIds);
  const created = await getCourseById(course.id);
  if (!created) {
    throw new Error('Course created but not retrievable');
  }
  return created;
}

export async function updateCourse(courseId: string, payload: Partial<CoursePayload>): Promise<Course> {
  const client = createAdminClient();
  const { fileIds, categoryId, ...rest } = payload;
  const update = {
    ...rest,
    category_id: categoryId ?? undefined,
  };
  const { error } = await client.from('courses').update(update).eq('id', courseId);
  if (error) {
    throw error;
  }

  if (fileIds) {
    await syncCourseFiles(client, courseId, fileIds);
  }

  const updated = await getCourseById(courseId);
  if (!updated) {
    throw new Error('Course not found after update');
  }
  return updated;
}

export async function deleteCourse(courseId: string): Promise<void> {
  const client = createAdminClient();
  await client.from('files_courses_courses').delete().eq('coursesId', courseId);
  const { error } = await client.from('courses').delete().eq('id', courseId);
  if (error) {
    throw error;
  }
}

export function buildCourseThumbnailUrl(path?: string | null) {
  if (!path) {
    return null;
  }
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!baseUrl) {
    return null;
  }
  const normalized = baseUrl.replace(/\/$/, '');
  const cleanPath = path.replace(/^thumbnails\//u, '');
  return `${normalized}/storage/v1/object/public/${THUMBNAIL_BUCKET}/${cleanPath}`;
}

