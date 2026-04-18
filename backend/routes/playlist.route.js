// routes/videoPlaylists.routes.js
import express from "express";
import multer from "multer";
import storage from "../config/multerStorage.js";
import {
  createPlaylist,
  getPlaylistById,
  getUserPlaylists,
  updatePlaylist,
  deletePlaylist,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
} from "../controllers/playlist.controller.js";
import { isLoggedIn } from "../middleware/isLoggedIn.js";

const router = express.Router();
const upload = multer({ storage });

// Create a new video playlist (with optional thumbnail)
router.post("/create", isLoggedIn, upload.single("thumbnail"), createPlaylist);

// Get a specific video playlist
router.get("/:id", isLoggedIn, getPlaylistById);

// Get all video playlists of the logged-in user
router.get("/", isLoggedIn, getUserPlaylists);

// Update a video playlist (title, description, thumbnail, visibility)
router.patch("/:id", isLoggedIn, upload.single("thumbnail"), updatePlaylist);

// Delete a video playlist
router.delete("/:id", isLoggedIn, deletePlaylist);

// Add a video to a playlist
router.patch("/:id/add-video", isLoggedIn, addVideoToPlaylist);

// Remove a video from a playlist
router.patch("/:id/remove-video", isLoggedIn, removeVideoFromPlaylist);

export default router;
