import fs from "fs";
import path from "path";
import cloudinary from "../config/cloudinary.js";

const uploadToCloudinary = async (filePath, options = {}) => {
  try {
    //Get File Extension
    const ext = path.extname(filePath).toLowerCase();

    //Decide Resource Type
    if (!options.resource_type) {
      if ([".mp3", ".wav", ".aac", ".m4a", ".ogg"].includes(ext)) {
        options.resource_type = "video";
      } else {
        options.resource_type = "image";
      }
    }

    const result = await cloudinary.uploader.upload(filePath, options);
    return result;
  } catch (error) {
    console.error("Error uploading file to Cloudinary:", error);
    throw error;
  } finally {
    fs.unlinkSync(filePath);
  }
};

export default uploadToCloudinary;
