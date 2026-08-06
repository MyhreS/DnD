export const MAX_WORKSHOP_IMAGES = 5;
export const MAX_WORKSHOP_IMAGE_BYTES = 10 * 1024 * 1024;
export const WORKSHOP_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
export const WORKSHOP_IMAGE_ACCEPT = WORKSHOP_IMAGE_TYPES.join(",");

export function workshopClipboardImages(clipboard: DataTransfer): File[] {
  const itemFiles = Array.from(clipboard.items)
    .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
    .map((item) => item.getAsFile())
    .filter((file): file is File => file !== null);
  if (itemFiles.length > 0) return itemFiles;
  return Array.from(clipboard.files).filter((file) => file.type.startsWith("image/"));
}

export function validateWorkshopFiles(files: File[]): string | null {
  if (files.length > MAX_WORKSHOP_IMAGES) return `Add up to ${MAX_WORKSHOP_IMAGES} images.`;
  if (files.some((file) => !WORKSHOP_IMAGE_TYPES.includes(file.type as typeof WORKSHOP_IMAGE_TYPES[number]))) {
    return "Use JPG, PNG, WebP, or GIF images.";
  }
  if (files.some((file) => file.size <= 0 || file.size > MAX_WORKSHOP_IMAGE_BYTES)) {
    return "Each image must be smaller than 10 MB.";
  }
  return null;
}
