export async function uploadBase64ToCloudinary(base64: string): Promise<string> {
  if (!base64.startsWith('data:image')) {
    // If it's already a URL (e.g. cloudinary URL), just return it
    if (base64.startsWith('http')) return base64;
    return base64;
  }

  try {
    const res = await fetch('/api/upload/base64', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64: base64 })
    });
    const data = await res.json();
    if (data.secure_url) {
      return data.secure_url;
    }
    throw new Error(data.error || 'Upload failed');
  } catch (err) {
    console.error("Cloudinary upload error:", err);
    throw err;
  }
}
