import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { v2 as cloudinary } from "cloudinary";
import multer from "multer";

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));

// Initialize Cloudinary (We will wait for user to configure .env)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "dhdq6fpsv",
  api_key: process.env.CLOUDINARY_API_KEY || "996593378718384",
  api_secret: process.env.CLOUDINARY_API_SECRET || "RySWFrVv2tLnDDnSGGveW6YPMlQ"
});

const upload = multer({ storage: multer.memoryStorage() });

// --- API Routes ---

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Endpoint to upload a single base64 image or file to Cloudinary
app.post("/api/upload/base64", async (req, res) => {
  try {
    const { imageBase64 } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: "Missing imageBase64" });
    }
    
    const apiSecret = process.env.CLOUDINARY_API_SECRET || "RySWFrVv2tLnDDnSGGveW6YPMlQ";
    if (!apiSecret) {
      return res.status(500).json({ error: "Cloudinary API Secret is not configured in .env" });
    }

    const result = await cloudinary.uploader.upload(imageBase64, {
      folder: "nai-muse",
      resource_type: "image",
    });

    res.json({ secure_url: result.secure_url, public_id: result.public_id });
  } catch (err: any) {
    console.error("Cloudinary upload error:", err);
    res.status(500).json({ error: err.message || "Failed to upload image" });
  }
});

// Endpoint to upload a file directly
app.post("/api/upload/file", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Missing file" });
    }
    
    const apiSecret = process.env.CLOUDINARY_API_SECRET || "RySWFrVv2tLnDDnSGGveW6YPMlQ";
    if (!apiSecret) {
      return res.status(500).json({ error: "Cloudinary API Secret is not configured in .env" });
    }

    // Convert buffer to base64
    const b64 = Buffer.from(req.file.buffer).toString("base64");
    const dataURI = "data:" + req.file.mimetype + ";base64," + b64;
    
    const result = await cloudinary.uploader.upload(dataURI, {
      folder: "nai-muse",
      resource_type: "image"
    });

    res.json({ secure_url: result.secure_url, public_id: result.public_id });
  } catch (err: any) {
    console.error("Cloudinary file upload error:", err);
    res.status(500).json({ error: err.message || "Failed to upload file" });
  }
});

// --- Vite Middleware ---

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
