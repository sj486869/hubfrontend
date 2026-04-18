// 📁 models/Comment.js
import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
  {
    // 💭 Comment Text
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },

    // 👤 Relationship: Comment ↔ User (One-to-One)
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // One comment belongs to one user.

    // 🎬 Relationship: Comment ↔ Video (One-to-One)
    video: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Video",
      required: true,
    },
    // One comment belongs to one video.

    // 💬 Replies (Self-Referencing)
    parentComment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
      default: null,
    },
    // For threaded replies: if this is null → it's a top-level comment.

    // ❤️ Likes (Many Users → One Comment)
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    // Many users can like one comment.

    // 📊 Counts for performance
    likesCount: {
      type: Number,
      default: 0,
    },
    repliesCount: {
      type: Number,
      default: 0,
    },

  },
  {
    timestamps: true, // adds createdAt & updatedAt
  }
);

export default mongoose.model("Comment", commentSchema);
 