// 📁 models/Playlist.js
import mongoose from "mongoose";

const playlistSchema = new mongoose.Schema(
  {
    // 🏷️ Basic Info
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      maxlength: 1000,
    },
    thumbnailUrl: {
      type: String,
      default: "",
    },
    isPublic: {
      type: Boolean,
      default: true,
    },

    // 👤 Relationship: Playlist ↔ User (Owner)
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // One user can have many playlists, but each playlist belongs to a single user.

    // 🎬 Relationship: Playlist ↔ Videos (Many-to-Many)
    videos: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Video",
      },
    ],
    // One playlist can contain many videos, and videos can be in many playlists.
  },
  {
    timestamps: true, // auto manages createdAt & updatedAt
  }
);

export default mongoose.model("Playlist", playlistSchema);
