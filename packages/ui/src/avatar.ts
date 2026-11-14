export const MAX_AVATAR_BYTES = 15 * 1024 * 1024;

export function validateAvatarFile(file: File): string | null {
  const rawType = (file.type || "").trim().toLowerCase();
  const isSvg = rawType === "image/svg+xml" || /\.svg$/i.test(file.name);
  if (isSvg) {
    return "SVG rasm xavfsizlik sababli qabul qilinmaydi";
  }
  const isImage =
    rawType.startsWith("image/") ||
    /\.(png|jpe?g|jfif|webp|gif|bmp|heic|heif|avif)$/i.test(file.name);
  if (!isImage) {
    return "Faqat rasm fayli (PNG, JPEG, WEBP, GIF) yuklash mumkin";
  }
  if (file.size > MAX_AVATAR_BYTES) {
    return "Profil rasmi hajmi 15 MB dan oshmasligi kerak";
  }
  return null;
}

export function prepareAvatarDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.type === "image/gif") {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Rasm faylini o‘qib bo‘lmadi"));
      reader.onload = () => resolve(String(reader.result));
      reader.readAsDataURL(file);
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Rasm faylini o‘qib bo‘lmadi"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => {
        const fallback = String(reader.result || "");
        if (
          /^data:image\/(png|jpeg|jpg|webp|gif);base64,/i.test(fallback) &&
          file.size <= MAX_AVATAR_BYTES
        ) {
          resolve(fallback);
        } else {
          reject(
            new Error(
              "Bu rasm formatini brauzer o‘qiy olmadi. PNG, JPEG yoki WEBP tanlang.",
            ),
          );
        }
      };
      img.onload = () => {
        const maxDim = 512;
        let { width, height } = img;
        if (width <= maxDim && height <= maxDim && file.size <= 350 * 1024) {
          resolve(String(reader.result));
          return;
        }
        if (width > maxDim || height > maxDim) {
          if (width >= height) {
            height = Math.max(1, Math.round((height * maxDim) / width));
            width = maxDim;
          } else {
            width = Math.max(1, Math.round((width * maxDim) / height));
            height = maxDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context2d = canvas.getContext("2d");
        if (!context2d) {
          resolve(String(reader.result));
          return;
        }
        context2d.drawImage(img, 0, 0, width, height);
        const outMime = file.type === "image/png" ? "image/png" : "image/jpeg";
        resolve(canvas.toDataURL(outMime, 0.86));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
