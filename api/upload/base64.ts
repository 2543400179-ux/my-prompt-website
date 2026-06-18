import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "dhdq6fpsv",
  api_key: process.env.CLOUDINARY_API_KEY || "996593378718384",
  api_secret: process.env.CLOUDINARY_API_SECRET || "RySWFrVv2tLnDDnSGGveW6YPMlQ"
});

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '4.5mb',
    },
  },
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { imageBase64 } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: "Missing imageBase64" });
    }

    const result = await cloudinary.uploader.upload(imageBase64, {
      folder: "nai-muse",
      resource_type: "image",
    });

    res.status(200).json({ secure_url: result.secure_url, public_id: result.public_id });
  } catch (err: any) {
    console.error("Cloudinary upload error:", err);
    res.status(500).json({ error: err.message || "Failed to upload image" });
  }
}
