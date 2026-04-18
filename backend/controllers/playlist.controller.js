// 📁 controller/playlist.controller.js
import Playlist from "../models/playlist.model.js";
import Video from "../models/video.model.js";
import uploadToCloudinary from "../helper/uploadToCloudinary.js";

export const createPlaylist = async (req, res) => {
  try {
    const { title, description, isPublic } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Playlist title is required.",
      });
    }

    let thumbnailUrl = "";

    if (req.file) {
      const imageResult = await uploadToCloudinary(req.file.path, {
        folder: "playlists/thumbnails",
        resource_type: "image",
      });
      thumbnailUrl = imageResult.secure_url;
    }

    const newPlaylist = new Playlist({
      title,
      description,
      thumbnailUrl,
      isPublic: isPublic !== undefined ? isPublic : true,
      owner: req.user.userId,
    });

    await newPlaylist.save();

    res.status(201).json({
      success: true,
      message: "Playlist created successfully.",
      playlist: newPlaylist,
    });
  } catch (error) {
    console.error("Error creating playlist:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create playlist.",
      error: error.message,
    });
  }
};

// Get playlist by ID
export const getPlaylistById = async (req, res) => {
  try {
    
    const playlist = await Playlist.findById(req.params.id)
      .populate("owner", "name email profileImage")
      .populate({
        path: "videos",
        select:
          "title videoUrl thumbnailUrl duration views likesCount commentsCount category",
        populate: { path: "uploadedBy", select: "name profileImage" },
      });

    if (!playlist) {
      return res.status(404).json({ message: "Playlist not found." });
    }

    res.status(200).json({
      success: true,
      message: "Playlist fetched successfully.",
      playlist,
    });
  } catch (error) {
    console.error("Error fetching playlist:", error);
    res.status(500).json({ message: "Failed to fetch playlist." });
  }
};

// Get all playlists of the logged-in user
export const getUserPlaylists = async (req, res) => {
  try {
    const { userId } = req.user;

    const playlists = await Playlist.find({ owner: userId })
      .populate({
        path: "videos",
        select:
          "title videoUrl thumbnailUrl duration views likesCount commentsCount category",
      })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: "User playlists fetched successfully.",
      playlists,
    });
  } catch (error) {
    console.error("Error fetching user playlists:", error);
    res.status(500).json({ message: "Failed to fetch playlists." });
  }
};

export const addVideoToPlaylist = async (req, res) => {
  try {
    const { videoId } = req.body;
    const { id } = req.params; // playlist id
    const { userId } = req.user;

    const playlist = await Playlist.findById(id);
    if (!playlist) {
      return res.status(404).json({ message: "Playlist not found." });
    }

    // Check ownership
    if (playlist.owner.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({ message: "Not authorized to modify this playlist." });
    }

    // Check if video exists
    const video = await Video.findById(videoId);
    if (!video) {
      return res.status(404).json({ message: "Video not found." });
    }

    // Avoid duplicates
    if (playlist.videos.includes(videoId)) {
      return res.status(400).json({ message: "Video already in playlist." });
    }

    playlist.videos.push(videoId);
    await playlist.save();

    res.status(200).json({
      success: true,
      message: "Video added to playlist.",
      playlist,
    });
  } catch (error) {
    console.error("Error adding video to playlist:", error);
    res.status(500).json({ message: "Failed to add video." });
  }
};

// Remove video from playlist
export const removeVideoFromPlaylist = async (req, res) => {
  try {
    const { videoId } = req.body;
    const { id } = req.params; // playlist id
    const { userId } = req.user;

    const playlist = await Playlist.findById(id);
    if (!playlist) {
      return res.status(404).json({ message: "Playlist not found." });
    }

    // Check ownership
    if (playlist.owner.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({ message: "Not authorized to modify this playlist." });
    }

    // Check if video exists in playlist
    if (!playlist.videos.includes(videoId)) {
      return res.status(400).json({ message: "Video not in playlist." });
    }

    playlist.videos = playlist.videos.filter(
      (id) => id.toString() !== videoId.toString()
    );
    await playlist.save();

    res.status(200).json({
      success: true,
      message: "Video removed from playlist.",
      playlist,
    });
  } catch (error) {
    console.error("Error removing video from playlist:", error);
    res.status(500).json({ message: "Failed to remove video." });
  }
};

export const updatePlaylist = async (req, res) => {
  try {
    const { id } = req.params; // playlist id
    const { userId } = req.user;
    const { title, description, isPublic } = req.body;

    const playlist = await Playlist.findById(id);

    if (!playlist) {
      return res.status(404).json({ message: "Playlist not found." });
    }

    // Check ownership
    if (playlist.owner.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({ message: "Not authorized to update this playlist." });
    }

    // Update fields
    if (title) playlist.title = title;
    if (description) playlist.description = description;
    if (isPublic !== undefined) playlist.isPublic = isPublic;

    // Handle thumbnail upload from Multer
    if (req.file) {
      // req.file.path is the path to uploaded file
      const uploadedImage = await uploadToCloudinary(req.file.path, {
        folder: "playlist_thumbnails",
      });
      playlist.thumbnailUrl = uploadedImage.secure_url;
    }

    const updatedPlaylist = await playlist.save();
    res.status(200).json({
      success: true,
      message: "Playlist updated successfully.",
      updatedPlaylist,
    });
  } catch (error) {
    console.error("Error updating playlist:", error);
    res.status(500).json({ message: "Failed to update playlist." });
  }
};

// Delete playlist
export const deletePlaylist = async (req, res) => {
  try {
    const { id } = req.params; // playlist id
    const { userId } = req.user;

    // Find playlist and check if it exists
    const playlist = await Playlist.findById(id);

    if (!playlist) {
      return res.status(404).json({ message: "Playlist not found." });
    }

    // Check ownership
    if (playlist.owner.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({ message: "Not authorized to delete this playlist." });
    }

    // Remove playlist reference from all videos in one query
    if (playlist.videos.length > 0) {
      await Video.updateMany(
        { _id: { $in: playlist.videos } },
        { $pull: { playlists: playlist._id } }
      );
    }

    // Delete the playlist
    await playlist.deleteOne();

    res.status(200).json({
      success: true,
      message: "Playlist deleted successfully, and videos updated.",
    });
  } catch (error) {
    console.error("Error deleting playlist:", error);
    res.status(500).json({ message: "Failed to delete playlist." });
  }
};

