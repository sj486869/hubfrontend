import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import Video from "../models/video.model.js";
import Comment from "../models/comment.model.js";
import Subscription from "../models/subscription.model.js";
import Playlist from "../models/playlist.model.js";
import uploadMedia from "../helper/uploadMedia.js";
import deleteFromCloudinary from "../helper/deleteFromCloudinary.js";

export const signup = async (req, res) => {
  try {
    // 1. Did I get the input?
    const { name, email, password, gender } = req.body;

    // 2. Did I validate it?
    if (!name || !email || !password || !gender) {
      return res.status(400).json({
        success: false,
        message: "All fields (name, email, password, gender) are required",
      });
    }

    // 3. Did I check permissions/rules?
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email already registered",
      });
    }

    // 4. Did I do the main action?
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    let profileImage = "";
    if (req.file) {
      const result = await uploadMedia(req.file.path, "profile_images", "image");
      profileImage = result.secure_url;
    }

    const user = new User({
      name,
      email,
      password: hashedPassword,
      gender,
      profileImage,
    });
    await user.save();

    // 5. Did I update anything else related?
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // true only on HTTPS
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    // 6. Did I respond to the client?
    res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        gender: user.gender,
        profileImage: user.profileImage,
        uploadedVideos: user.uploadedVideos,
        playlists: user.playlists,
        likedVideos: user.likedVideos,
        savedVideos: user.savedVideos,
        subscribersCount: user.subscribersCount,
      },
    });
  } catch (error) {
    console.error("Signup error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error during signup",
    });
  }
};

// Login Controller
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
   
    // Step 1: Find user
    const user = await User.findOne({ email });
  
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Step 2: Compare password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid email or password",
      });
    }
    // Step 4: Generate JWT
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Step 5: Set cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // true only on HTTPS
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    console.log("✅ Login successful!");
    res.status(200).json({
      success: true,
      message: "Login successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        gender: user.gender,
        profileImage: user.profileImage,
        uploadedVideos: user.uploadedVideos,
        playlists: user.playlists,
        likedVideos: user.likedVideos,
        savedVideos: user.savedVideos,
        subscribersCount: user.subscribersCount,
      },
    });
  } catch (error) {
    console.error("🔥 Login error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error during login",
    });
  }
};

// Logout Controller
export const logout = (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "none", // ✅ Must match how it was set
    });

    res.status(200).json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    console.error("Logout error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error during logout",
    });
  }
};

// Upgrade to Seller Controller
export const upgradeCreator = async (req, res) => {
  try {
    const { userId } = req.user;
    console.log("userId", userId);

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if already a seller
    if (user.role === "creator") {
      return res.status(400).json({
        success: false,
        message: "User is already a creator",
      });
    }

    // Update role to seller
    user.role = "creator";
    await user.save();

    // Generate new JWT with updated role
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    // Set new cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(200).json({
      success: true,
      message: "User upgraded to creator successfully",

      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        gender: user.gender,
        profileImage: user.profileImage,
        uploadedVideos: user.uploadedVideos,
        playlists: user.playlists,
        likedVideos: user.likedVideos,
        savedVideos: user.savedVideos,
        subscribersCount: user.subscribersCount,
      },
    });
  } catch (error) {
    console.error("Upgrade seller error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error during role upgrade",
    });
  }
};

// Get Authenticated User Controller

export const getAuthUser = async (req, res) => {
  try {
    const { userId } = req.user;

    // Find user and populate likedVideos and savedVideos
    const user = await User.findById(userId)
      .select("-password")
      .populate({
        path: "likedVideos",
        select:
          "title thumbnailUrl duration uploadedBy likesCount views commentsCount",
        populate: { path: "uploadedBy", select: "name profileImage" },
      })
      .populate({
        path: "savedVideos",
        select:
          "title thumbnailUrl duration uploadedBy likesCount views commentsCount",
        populate: { path: "uploadedBy", select: "name profileImage" },
      });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        gender: user.gender,
        profileImage: user.profileImage,
        uploadedVideos: user.uploadedVideos,
        playlists: user.playlists,
        likedVideos: user.likedVideos,
        savedVideos: user.savedVideos,
        subscribersCount: user.subscribersCount,
      },
    });
  } catch (error) {
    console.error("Get auth user error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error while fetching user data",
    });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { userId } = req.user;
    const { id } = req.params;
    const { name, email, password, gender } = req.body;
    const { profileImage } = req.files || {};

    // Only allow logged-in user to update their own account
    if (id !== userId) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized. You can only update your own account.",
      });
    }

    // Find user
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const updatedData = {};

    // Email update with uniqueness check
    if (email && email !== user.email) {
      const existingEmail = await User.findOne({ email });
      if (existingEmail) {
        return res
          .status(400)
          .json({ success: false, message: "Email already registered." });
      }
      if (!/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email)) {
        return res
          .status(400)
          .json({ success: false, message: "Please enter a valid email." });
      }
      updatedData.email = email.trim();
    }

    if (name) updatedData.name = name.trim();
    if (gender) updatedData.gender = gender.trim();

    // Password update with hashing
    if (password) {
      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          message: "Password must be at least 6 characters.",
        });
      }
      const salt = await bcrypt.genSalt(10);
      updatedData.password = await bcrypt.hash(password, salt);
    }

    // Profile image update
    if (profileImage) {
      if (user.profileImage) {
        await deleteFromCloudinary(user.profileImage, "image");
      }
      const result = await uploadMedia(profileImage[0].path, "profile_images", "image");
      updatedData.profileImage = result.secure_url;
    }

    // No fields to update .if the user didn’t send any valid fields, updatedData is {} → empty object → no point in running findByIdAndUpdate
    if (Object.keys(updatedData).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid fields provided to update.",
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      id,
      { $set: updatedData },
      { new: true, runValidators: true }
    ).select("-password");

    res.status(200).json({
      success: true,
      message: "User updated successfully",
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        gender: updatedUser.gender,
        profileImage: updatedUser.profileImage,
        uploadedVideos: updatedUser.uploadedVideos,
        playlists: updatedUser.playlists,
        likedVideos: updatedUser.likedVideos,
        savedVideos: updatedUser.savedVideos,
        subscribersCount: updatedUser.subscribersCount,
      },
    });
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating user",
      error: error.message,
    });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { userId } = req.user; // from auth JWT

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    // 1️⃣ Delete profile image
    if (user.profileImage) {
      await deleteFromCloudinary(user.profileImage, "image");
    }

    // 2️⃣ Delete all videos uploaded by this user if creator
    if (user.role === "creator") {
      const videos = await Video.find({ uploadedBy: userId });

      const deletions = [];
      for (const video of videos) {
        if (video.videoUrl)
          deletions.push(deleteFromCloudinary(video.videoUrl, "video"));
        if (video.thumbnailUrl)
          deletions.push(deleteFromCloudinary(video.thumbnailUrl, "image"));

        // Delete comments on this video
        await Comment.deleteMany({ video: video._id });
      }

      await Promise.allSettled(deletions);

      // Delete videos from DB
      await Video.deleteMany({ uploadedBy: userId });

      // Delete playlists owned by this creator
      await Playlist.deleteMany({ owner: userId });
    } else {
      // 3️⃣ For normal users, remove their saved/liked videos
      await Video.updateMany(
        {},
        {
          $pull: { likes: userId },
        }
      );
      await Playlist.updateMany(
        {},
        { $pull: { videos: { $in: user.playlists } } }
      );
    }

    // 4️⃣ Delete comments made by the user
    await Comment.deleteMany({ user: userId });

    // 5️⃣ Remove this user from likes in comments
    await Comment.updateMany({}, { $pull: { likes: userId } });

    // 6️⃣ Delete subscriptions related to this user
    await Subscription.deleteMany({
      $or: [{ subscriber: userId }, { subscribedTo: userId }],
    });

    // 7️⃣ Finally, delete the user
    await User.findByIdAndDelete(userId);

    // 8️⃣ Clear JWT cookie
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    res.status(200).json({
      success: true,
      message:
        "User account and all associated resources deleted successfully.",
    });
  } catch (error) {
    console.error("Delete user error:", error.message);
    res.status(500).json({
      success: false,
      message: "Error deleting user account",
      error: error.message,
    });
  }
};


