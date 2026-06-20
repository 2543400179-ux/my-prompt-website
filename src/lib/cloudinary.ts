async function generateSHA1(message: string) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-1', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

export async function uploadBase64ToCloudinary(base64: string): Promise<string> {
  if (base64.startsWith('http')) {
    return base64;
  }
  
  let validBase64 = base64;
  // If it's pure base64 without data prefix, add it.
  if (!base64.startsWith('data:')) {
    validBase64 = `data:image/jpeg;base64,${base64}`;
  }

  try {
    const cloudName = "dhdq6fpsv";
    const apiKey = "996593378718384";
    const apiSecret = "RySWFrVv2tLnDDnSGGveW6YPMlQ";
    
    // Generate signature
    const timestamp = Math.round((new Date).getTime() / 1000);
    const folder = "nai-muse";
    
    // Parameters to sign must be sorted alphabetically
    const paramsToSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
    const signature = await generateSHA1(paramsToSign);

    const formData = new FormData();
    formData.append("file", validBase64);
    formData.append("api_key", apiKey);
    formData.append("timestamp", timestamp.toString());
    formData.append("signature", signature);
    formData.append("folder", folder);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body: formData
    });
    
    if (!res.ok) {
      const text = await res.text();
      try {
        const json = JSON.parse(text);
        throw new Error(json.error?.message || `HTTP Error ${res.status}`);
      } catch (e) {
        throw new Error(`HTTP ${res.status}: ${text.slice(0, 100)}`);
      }
    }

    const data = await res.json();
    if (data.secure_url) {
      return data.secure_url;
    }
    throw new Error(data.error?.message || 'Upload failed');
  } catch (err) {
    console.error("Cloudinary direct upload error:", err);
    throw err;
  }
}
