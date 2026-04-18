import express from "express";
import multer from "multer";
import storage from "../config/multerStorage.js";
import {
  signup,
  login,
  logout,
  upgradeCreator,
  getAuthUser,
  deleteUser,
  updateUser,
} from "../controllers/user.controller.js";
import { isLoggedIn } from "../middleware/isLoggedIn.js"; 

const router = express.Router();

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
  },
});

// Public routes
router.post("/signup", upload.single("profileImage"), signup);
router.post("/login", login);
router.post("/logout", logout);

// Protected routes
router.patch("/upgrade-creator", isLoggedIn, upgradeCreator);
router.get("/auth", isLoggedIn, getAuthUser);
router.patch(
  "/:id",
  isLoggedIn,
  upload.fields([{ name: "profileImage", maxCount: 1 }]),
  updateUser
);

router.delete("/delete", isLoggedIn, deleteUser);


export default router;
