// Browser-side Cloudinary unsigned upload (shared by media manager + blog editor).

const CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const IMAGE_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_IMAGE_PRESET ?? "easyauto-listings";

export type CloudinaryUploadResult = {
  secure_url: string;
  public_id?: string;
  width?: number;
  height?: number;
};

export async function uploadImageToCloudinary(file: File): Promise<CloudinaryUploadResult> {
  if (!CLOUD) throw new Error("Cloudinary is not configured (missing cloud name).");

  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", IMAGE_PRESET);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`, {
    method: "POST",
    body: fd,
  });
  const json = await res.json();
  if (!res.ok || !json.secure_url) {
    throw new Error(json?.error?.message ?? "Upload failed");
  }
  return json as CloudinaryUploadResult;
}
