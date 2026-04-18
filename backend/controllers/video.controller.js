import Video from "../models/video.model.js";
import Playlist from "../models/playlist.model.js";
import Comment from "../models/comment.model.js";
import User from "../models/user.model.js";
import uploadMedia from "../helper/uploadMedia.js";
import deleteFromCloudinary from "../helper/deleteFromCloudinary.js";

export const uploadVideo = async (req, res) => {
  try {
    const { title, description, tags, category, isPublic } = req.body;

    // 🧩 Validation: Ensure required fields exist
    if (!req.files || !req.files.video || !req.files.thumbnail) {
      return res.status(400).json({
        success: false,
        message: "Video file and thumbnail image are required.",
      });
    }

    // 🎬 Upload video file
    const videoResult = await uploadMedia(req.files.video[0].path, "videos", "video");

    // 🖼️ Upload thumbnail image
    const thumbnailResult = await uploadMedia(req.files.thumbnail[0].path, "thumbnails", "image");

    // ⏱️ Get video duration from Cloudinary result
    const duration = videoResult.duration || 0; // seconds

    // 🏷️ Parse tags (string → array)
    let parsedTags = [];
    if (typeof tags === "string") {
      parsedTags = tags
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);
    } else if (Array.isArray(tags)) {
      parsedTags = tags;
    }

    // 🆕 Create video document
    const newVideo = new Video({
      title: title?.trim(),
      description: description?.trim(),
      videoUrl: videoResult.secure_url,
      thumbnailUrl: thumbnailResult.secure_url,
      duration,
      tags: parsedTags,
      category: category?.trim(),
      isPublic: isPublic !== undefined ? isPublic : true,
      uploadedBy: req.user.userId,
    });

    // 💾 Save video to DB
    await newVideo.save();

    // 🔄 Update user's uploadedVideos array
    await User.findByIdAndUpdate(req.user.userId, {
      $push: { uploadedVideos: newVideo._id },
    });

    // ✅ Response
    res.status(201).json({
      success: true,
      message: "Video uploaded successfully.",
      video: {
        id: newVideo._id,
        title: newVideo.title,
        description: newVideo.description,
        videoUrl: newVideo.videoUrl,
        thumbnailUrl: newVideo.thumbnailUrl,
        duration: newVideo.duration,
        tags: newVideo.tags,
        category: newVideo.category,
        isPublic: newVideo.isPublic,
        uploadedBy: newVideo.uploadedBy,
        createdAt: newVideo.createdAt,
      },
    });
  } catch (error) {
    console.error("Error creating video:", error);
    res.status(500).json({
      success: false,
      message: "Failed to upload video.",
      error: error.message,
    });
  }
};

export const getAllVideos = async (req, res) => {
  try {
    // 🧠 Extract query parameters
    const {
      search, // ?search=elon
      category, // ?category=Business
      user, // ?user=123456
      sortBy, // ?sortBy=createdAt or views
      sortOrder, // ?sortOrder=desc or asc
      limit, // ?limit=10
      page, // ?page=2
    } = req.query;

    // 🔍 Create dynamic filter
    const filter = {};

    // Search by title, description, or tags
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { tags: { $regex: search, $options: "i" } },
      ];
    }

    // Filter by category
    if (category) filter.category = category;

    // Filter by uploader (user)
    if (user) filter.user = user;

    // 🔄 Sorting
    const sortField = sortBy || "createdAt";
    const order = sortOrder === "asc" ? 1 : -1;
    const sort = { [sortField]: order };

    // 📄 Pagination
    const pageNum = Number(page) || 1;
    const pageLimit = Number(limit) || 10;
    const skip = (pageNum - 1) * pageLimit;

    // 📺 Fetch videos from DB
    const videos = await Video.find(filter)
      .populate("uploadedBy", "name profileImage")
      .sort(sort)
      .skip(skip)
      .limit(pageLimit);

    // 📊 Total count (for pagination UI)
    const totalVideos = await Video.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: videos.length,
      total: totalVideos,
      page: pageNum,
      totalPages: Math.ceil(totalVideos / pageLimit),
      videos,
    });
  } catch (error) {
    console.error("Error fetching videos:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch videos",
      error: error.message,
    });
  }
};

export const getVideoById = async (req, res) => {
  try {
    const { id } = req.params;

    // 🎥 Find video by ID and populate uploader info
    const video = await Video.findById(id)
    .populate("uploadedBy", "name email profileImage"
    );

    if (!video) {
      return res.status(404).json({
        success: false,
        message: "Video not found.",
      });
    }

  

    res.status(200).json({
      success: true,
      message: "Video fetched successfully.",
      video,
    });
  } catch (error) {
    console.error("Error fetching video:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch video.",
      error: error.message,
    });
  }
};

export const updateVideo = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user; 
    const { title, description, category, tags, isPublic } = req.body;

    // 🧩 Find existing video
    const video = await Video.findById(id);
    if (!video) {
      return res.status(404).json({ message: "Video not found." });
    }

    // 🔐 Verify ownership
    if (video.uploadedBy.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({ message: "Not authorized to update this video." });
    }

    // 🎥 Replace video file if new one is uploaded
    if (req.files?.video) {
      await deleteFromCloudinary(video.videoUrl, "video");
      const videoResult = await uploadToCloudinary(req.files.video[0].path, {
        folder: "videos/files",
        resource_type: "video",
      });
      video.videoUrl = videoResult.secure_url;
      video.duration = videoResult.duration;
    }

    // 🖼 Replace thumbnail if new one is uploaded
    if (req.files?.thumbnail) {
      await deleteFromCloudinary(video.thumbnailUrl, "image");
      const thumbnailResult = await uploadToCloudinary(
        req.files.thumbnail[0].path,
        {
          folder: "videos/thumbnails",
          resource_type: "image",
        }
      );
      video.thumbnailUrl = thumbnailResult.secure_url;
    }

    // ✏️ Update fields if provided
    if (title) video.title = title;
    if (description) video.description = description;
    if (category) video.category = category;
    if (tags)
      video.tags = Array.isArray(tags)
        ? tags
        : tags.split(",").map((t) => t.trim());
    if (typeof isPublic !== "undefined") video.isPublic = isPublic;

    // 💾 Save updated video
    const updatedVideo = await video.save();

    res.status(200).json({
      success: true,
      message: "Video updated successfully.",
      updatedVideo,
    });
  } catch (error) {
    console.error("Error updating video:", error);
    res.status(500).json({ message: "Failed to update video." });
  }
};

export const deleteVideo = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user; // from auth middleware

    // 1️⃣ Find the video
    const video = await Video.findById(id);
    if (!video) {
      return res.status(404).json({ message: "Video not found." });
    }

    // 2️⃣ Check ownership
    if (video.uploadedBy.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({ message: "Not authorized to delete this video." });
    }

    // 3️⃣ Remove video from all playlists
    await Playlist.updateMany(
      { videos: video._id },
      { $pull: { videos: video._id } }
    );

    // 4️⃣ Remove video references from users
    await User.updateMany(
      { uploadedVideos: video._id },
      { $pull: { uploadedVideos: video._id } }
    );

    await User.updateMany(
      { likedVideos: video._id },
      { $pull: { likedVideos: video._id } }
    );

    await User.updateMany(
      { savedVideos: video._id },
      { $pull: { savedVideos: video._id } }
    );

    // 5️⃣ Delete all comments related to this video
    await Comment.deleteMany({ video: video._id });

    // 6️⃣ Delete from Cloudinary
    if (video.videoUrl) await deleteFromCloudinary(video.videoUrl, "video");
    if (video.thumbnailUrl)
      await deleteFromCloudinary(video.thumbnailUrl, "image");

    // 7️⃣ Finally, delete the video itself
    await video.deleteOne();

    res.status(200).json({
      success: true,
      message: "Video deleted successfully and all references cleaned up.",
    });
  } catch (error) {
    console.error("Error deleting video:", error);
    res.status(500).json({ message: "Failed to delete video." });
  }
};

export const toggleVideoLike = async (req, res) => {
  try {
    const { id } = req.params; // video ID
    const { userId } = req.user; // from auth middleware

    const video = await Video.findById(id);
    if (!video) return res.status(404).json({ message: "Video not found." });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found." });

    // Convert ObjectIds to strings for safe comparison
    const alreadyLiked = video.likes.some(
      (likedUserId) => likedUserId.toString() === userId.toString()
    );

    if (alreadyLiked) {
      // 🔁 Unlike
      video.likes.pull(userId);
      user.likedVideos.pull(video._id);
    } else {
      // ❤️ Like
      video.likes.addToSet(userId);
      user.likedVideos.addToSet(video._id);
    }

    // 🧮 Update the likes count
    video.likesCount = video.likes.length;

    // 💾 Save updates
    await video.save();
    await user.save();

    res.status(200).json({
      success: true,
      liked: !alreadyLiked,
      userId,
      totalLikes: video.likesCount,
      message: alreadyLiked ? "Video unliked." : "Video liked.",
    });
  } catch (error) {
    console.error("Error liking/unliking video:", error);
    res.status(500).json({ message: "Failed to like/unlike video." });
  }
};

// Toggle Save / Unsave Video
export const toggleSavedVideo = async (req, res) => {
  try {
    const { videoId } = req.params;
    const { userId } = req.user;

    // 1️⃣ Check if video exists
    const video = await Video.findById(videoId);
    if (!video) {
      return res
        .status(404)
        .json({ success: false, message: "Video not found." });
    }

    // 2️⃣ Fetch user
    const user = await User.findById(userId);

    // 3️⃣ Check if video is already saved
    const isSaved = user.savedVideos.includes(videoId);

    if (isSaved) {
      // Remove video from savedVideos
      user.savedVideos = user.savedVideos.filter(
        (id) => id.toString() !== videoId.toString()
      );

      await user.save();
    } else {
      // Add video to savedVideos
      user.savedVideos.push(videoId);
      await user.save();
    }

    return res.status(200).json({
      success: true,
      saved: !isSaved,
      message: isSaved
        ? "Video Unsaved successfully."
        : "Video saved successfully",
    });
  } catch (error) {
    console.error("Error toggling saved video:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to toggle saved video." });
  }
};

export const incrementVideoViewCount = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user; // Assuming JWT middleware attaches userId

    // Check if video exists
    const video = await Video.findById(id);
    if (!video) {
      return res.status(404).json({ message: "Video not found." });
    }

    // If user already viewed, skip increment
    const hasViewed = video.viewedBy.some(
      (viewerId) => viewerId.toString() === userId.toString()
    );

    if (hasViewed) {
      return res.status(200).json({
        success: false,
        message: "View already counted for this user.",
        views: video.views,
      });
    }

    // Increment view count and track user
    video.views += 1;
    video.viewedBy.push(userId);
    await video.save();

    res.status(200).json({
      success: true,
      message: "Video view count incremented.",
      views: video.views,
    });
  } catch (error) {
    console.error("Error incrementing video view count:", error);
    res.status(500).json({ message: "Failed to increment video view count." });
  }
};

export const getCreatorVideos = async (req, res) => {
  try {
    const { userId } = req.user; // from isLoggedIn middleware

    // Fetch all videos uploaded by this creator
    const videos = await Video.find({ uploadedBy: userId })
      .populate("uploadedBy", "name email profileImage") // uploader info
      .populate({
        path: "comments",
        select: "text user createdAt",
        populate: { path: "user", select: "name profileImage" },
      })
      .sort({ createdAt: -1 }); // newest first

    if (!videos || videos.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No videos found for this creator.",
      });
    }

    // Format response to include essential meta data + analytics
    const response = videos.map((video) => ({
      id: video._id,
      title: video.title,
      description: video.description,
      category: video.category,
      tags: video.tags,
      isPublic: video.isPublic,
      duration: video.duration,
      videoUrl: video.videoUrl,
      thumbnailUrl: video.thumbnailUrl,
      views: video.views,
      likesCount: video.likesCount,
      commentsCount: video.commentsCount,
      uploadedBy: video.uploadedBy,
      comments: video.comments,
      createdAt: video.createdAt,
      updatedAt: video.updatedAt,
    }));

    res.status(200).json({
      success: true,
      message: "Creator videos fetched successfully.",
      videos: response,
    });
  } catch (error) {
    console.error("Error fetching creator videos:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch creator videos.",
    });
  }
};

export const getTopVideos = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    // 🧩 Top by likes
    const topByLikes = await Video.find()
      .sort({ likesCount: -1 })
      .limit(limit)
      .populate("uploadedBy", "name profileImage")
      .select("title thumbnailUrl views likesCount commentsCount")
      .lean();

    // 🧩 Top by views
    const topByViews = await Video.find()
      .sort({ views: -1 })
      .limit(limit)
      .populate("uploadedBy", "name profileImage")
      .select("title thumbnailUrl views likesCount commentsCount")
      .lean();

    // 🧩 Top by comments
    const topByComments = await Video.find()
      .sort({ commentsCount: -1 })
      .limit(limit)
      .populate("uploadedBy", "name profileImage")
      .select("title thumbnailUrl views likesCount commentsCount")
      .lean();

    // 🧩 Overall Top (weighted)
    const allVideos = await Video.find()
      .populate("uploadedBy", "name profileImage")
      .select("title thumbnailUrl views likesCount commentsCount")
      .lean();

    const rankedVideos = allVideos
      .map((v) => ({
        ...v,
        rankScore: v.likesCount * 2 + v.commentsCount * 1.5 + v.views * 0.001,
      }))
      .sort((a, b) => b.rankScore - a.rankScore)
      .slice(0, limit);

    res.status(200).json({
      success: true,
      message: "Top videos fetched successfully",
      topVideos: rankedVideos,
      topByLikes,
      topByViews,
      topByComments,
    });
  } catch (error) {
    console.error("Get top videos error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch top videos",
    });
  }
};
