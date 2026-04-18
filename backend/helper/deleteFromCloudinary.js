import cloudinary from "../config/cloudinary.js";

export const deleteFromCloudinary = async (fileUrl, resourceType = "image") => {
  if (!fileUrl) {
    throw new Error("File URL is required for deletion.");
  }

  try {
    const urlParts = new URL(fileUrl);
    const pathname = urlParts.pathname;
    // Remove leading '/'
    let publicIdWithExtension = pathname.substring(
      pathname.indexOf("/upload/") + 8
    );

    // Remove version folder e.g. v1234567890/
    publicIdWithExtension = publicIdWithExtension.replace(/^v\d+\//, "");

    // Remove file extension
    const publicId = publicIdWithExtension.replace(/\.[^/.]+$/, "");

    // Call Cloudinary destroy API
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });

    return result;
  } catch (error) {
    console.error("Error deleting file from Cloudinary:", error);
    throw error;
  }
};

export default deleteFromCloudinary;
