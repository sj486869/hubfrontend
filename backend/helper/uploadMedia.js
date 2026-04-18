import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import cloudinary from "../config/cloudinary.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadMedia = async (filePath, folder, resourceType = "auto") => {
  const isCloudinaryConfigured =
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_CLOUD_NAME !== "your_cloudinary_cloud_name";

  if (isCloudinaryConfigured) {
    try {
      console.log(`☁️ Uploading ${resourceType} to Cloudinary...`);
      const result = await cloudinary.uploader.upload(filePath, {
        folder,
        resource_type: resourceType,
      });
      // Delete temp file after Cloudinary upload
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return {
        secure_url: result.secure_url,
        duration: result.duration || 0,
        isLocal: false,
      };
    } catch (error) {
      console.error("❌ Cloudinary upload failed, falling back to local:", error.message);
    }
  }

  // Fallback to Local Storage
  console.log(`📂 Using local storage for ${resourceType}...`);
  const fileName = path.basename(filePath);
  const targetDir = path.join(__dirname, "../public/uploads", folder);
  
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const targetPath = path.join(targetDir, fileName);
  fs.renameSync(filePath, targetPath);

  // Return a local URL
  const localUrl = `http://localhost:5004/uploads/${folder}/${fileName}`;
  return {
    secure_url: localUrl,
    duration: 0, // Duration is hard to get locally without ffprobe
    isLocal: true,
  };
};

export default uploadMedia;
