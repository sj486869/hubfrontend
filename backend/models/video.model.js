// 📁 models/Video.js
import mongoose from "mongoose";

const videoSchema = new mongoose.Schema(
  {
    // 🎥 Basic Video Information
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      maxlength: 5000,
    },
    videoUrl: {
      type: String,
      required: true,
    },
    thumbnailUrl: {
      type: String,
      required: true,
    },
    duration: {
      type: Number, // in seconds or minutes
      required: true,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    category: {
      type: String,
      trim: true,
    },
    isPublic: {
      type: Boolean,
      default: true,
    },

    // 👤 Relationship: Video ↔ User (Uploader)
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // One user can upload many videos, but one video belongs to a single user.

    // ❤️ Relationship: Video ↔ User (Likes)
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    // Many users can like a video, and one user can like many videos.

    // 📋 Relationship: Video ↔ Playlist (Many-to-Many)
    playlists: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Playlist",
      },
    ],
    // One video can appear in many playlists, and each playlist can contain many videos.

    // 💬 Relationship: Video ↔ Comment (One-to-Many)
    comments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Comment",
      },
    ],
    // One video can have multiple comments, each comment belongs to one video.

    // 📊 Analytics
    views: {
      type: Number,
      default: 0,
    },

    viewedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    likesCount: {
      type: Number,
      default: 0,
    },
    commentsCount: {
      type: Number,
      default: 0,
    },
    

  },
  {
    timestamps: true, // automatically adds createdAt & updatedAt
  }
);

export default mongoose.model("Video", videoSchema);
 