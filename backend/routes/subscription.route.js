// 📁 routes/subscriptionRoutes.js
import express from "express";
import {
 toggleSubscription,
  getSubscribedCreators,
  getCreators,
  getCreatorById
} from "../controllers/subscription.controller.js";
import { isLoggedIn } from "../middleware/isLoggedIn.js"; 

const router = express.Router();

router.post("/toggle/:creatorId", isLoggedIn, toggleSubscription);

// Get all users a person subscribed to
router.get("/:userId/subscribed", isLoggedIn, getSubscribedCreators);

// All creators
router.get("/", getCreators);

// Single creator
router.get("/:id", getCreatorById);

export default router;
