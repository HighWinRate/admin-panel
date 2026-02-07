/**
 * پردازش و اسکیل تصاویر قبل از آپلود
 * این فایل تصاویر را به حداکثر 1000 پیکسل (عرض یا ارتفاع) اسکیل می‌کند
 */

export interface ProcessedImage {
  file: File;
  width: number;
  height: number;
}

/**
 * اسکیل تصویر با استفاده از Canvas API
 * حداکثر ابعاد: 1000 پیکسل
 */
export async function processImage(file: File): Promise<ProcessedImage> {
  return new Promise((resolve, reject) => {
    // بررسی نوع فایل
    if (!file.type.startsWith('image/')) {
      reject(new Error('فایل باید از نوع تصویر باشد'));
      return;
    }

    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error('خطا در خواندن فایل'));
    };

    img.onload = () => {
      const MAX_SIZE = 1000;
      let { width, height } = img;

      // محاسبه ابعاد جدید
      if (width > MAX_SIZE || height > MAX_SIZE) {
        if (width > height) {
          height = Math.round((height * MAX_SIZE) / width);
          width = MAX_SIZE;
        } else {
          width = Math.round((width * MAX_SIZE) / height);
          height = MAX_SIZE;
        }
      }

      // ساخت canvas برای اسکیل
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('خطا در ایجاد canvas'));
        return;
      }

      // رسم تصویر با ابعاد جدید
      ctx.drawImage(img, 0, 0, width, height);

      // تبدیل به Blob
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('خطا در تبدیل تصویر'));
            return;
          }

          // ساخت فایل جدید
          const processedFile = new File([blob], file.name, {
            type: file.type,
            lastModified: Date.now(),
          });

          resolve({
            file: processedFile,
            width,
            height,
          });
        },
        file.type,
        0.9, // کیفیت 90%
      );
    };

    img.onerror = () => {
      reject(new Error('خطا در بارگذاری تصویر'));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * اعتبارسنجی فایل تصویر
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  // بررسی نوع فایل
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'فرمت تصویر باید JPEG، PNG، GIF یا WebP باشد',
    };
  }

  // بررسی حجم فایل (حداکثر 10MB)
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: 'حجم تصویر نباید بیشتر از 10 مگابایت باشد',
    };
  }

  return { valid: true };
}

/**
 * پردازش چندین تصویر به صورت همزمان
 */
export async function processMultipleImages(files: File[]): Promise<ProcessedImage[]> {
  const promises = files.map((file) => processImage(file));
  return Promise.all(promises);
}
