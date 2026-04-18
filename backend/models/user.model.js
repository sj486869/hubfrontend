// User.js
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minLength: [3, "Name can't be less than 3 characters"],
      maxLength: [30, "Name can't exceed 30 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      unique: [true, "Email already registered, enter another email"],
      validate: {
        validator: (v) => {
          return /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(v);
        },
        message: "Please enter valid email",
      },
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minLength: [6, "Password can't be less than 6 characters"],
    },

    profileImage: {
      type: String,
      default: "",
    },
    gender: {
      type: String,
    },

    role: {
      type: String,
      enum: ["user", "creator"],
      default: "user",
    },

    // 📺 Creator relationship: (User → Videos)
    uploadedVideos: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Video",
      },
    ],
    // One-to-Many → one user can upload multiple videos.

    // 🎵 Playlist relationship: (User → Playlist)
    playlists: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Playlist",
      },
    ],
    // One-to-Many → one user can create multiple playlists.

    // ❤️ Like relationship: (User ↔ Videos)
    likedVideos: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Video",
      },
    ],
    // Many-to-Many → one user can like multiple videos, and videos can be liked by multiple users.

    // 📌 Saved Videos
    savedVideos: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Video",
      },
    ],
    // Many-to-Many → user can save many videos, videos can appear in many users' saved lists.

    // 🔔 Subscription relationships (User ↔ Creator(user))
    subscribersCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
