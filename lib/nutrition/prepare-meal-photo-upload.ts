/**
 * Keep mobile photo requests below the Vercel Function request-body limit.
 * Server-side Sharp still performs the canonical image normalization.
 */
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
const TARGET_EDGE = 1600;

export async function prepareMealPhotoUpload(file: File): Promise<File> {
  if (file.size <= MAX_UPLOAD_BYTES) return file;

  // A browser may not decode HEIC/HEIF; never send an oversized original
  // to a serverless endpoint whose body limit is lower than the UI's 10 MB.
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("这张照片超过上传大小限制，且浏览器无法压缩。请转换为 JPEG 或选择较小的照片");
  }
  try {
    const factor = Math.min(1, TARGET_EDGE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * factor));
    canvas.height = Math.max(1, Math.round(bitmap.height * factor));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("浏览器无法处理照片，请重试");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.82, 0.72, 0.6]) {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
      if (!blob) continue;
      if (blob.size <= MAX_UPLOAD_BYTES) {
        return new File([blob], file.name.replace(/\.[^.]*$/, "") + ".jpg", { type: "image/jpeg" });
      }
    }
    throw new Error("这张照片压缩后仍然过大，请选择较小的照片");
  } finally {
    bitmap.close();
  }
}
