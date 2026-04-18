// 📁 controllers/subscriptionController.js
import Subscription from "../models/subscription.model.js";
import User from "../models/user.model.js";

export const toggleSubscription = async (req, res) => {
  try {
    const { creatorId } = req.params;
    const { userId } = req.user;

    if (userId === creatorId) {
      return res.status(400).json({
        success: false,
        message: "You cannot subscribe to yourself.",
      });
    }

    // Check if subscription already exists
    const existing = await Subscription.findOne({
      subscriber: userId,
      subscribedTo: creatorId,
    });

    let subscribed;
    let message;
    let subscriptionData = null;

    if (existing) {
      // 🔹 Populate subscriber before deletion
      const populatedSub = await Subscription.findById(existing._id).populate(
        "subscriber",
        "_id name email profileImage"
      );

      // Delete subscription and update creator's count
      await Promise.all([
        Subscription.deleteOne({ _id: existing._id }),
        User.updateOne({ _id: creatorId }, { $inc: { subscribersCount: -1 } }),
      ]);

      subscribed = false;
      message = "Unsubscribed successfully.";
      subscriptionData = populatedSub;
    } else {
      // Create new subscription
      const newSubscription = await Subscription.create({
        subscriber: userId,
        subscribedTo: creatorId,
      });

      // Update creator's subscriber count
      await User.updateOne(
        { _id: creatorId },
        { $inc: { subscribersCount: 1 } }
      );

      // Populate subscriber info
      const populatedSub = await Subscription.findById(
        newSubscription._id
      ).populate("subscriber", "_id name email profileImage");

      subscribed = true;
      message = "Subscribed successfully.";
      subscriptionData = populatedSub;
    }

    // Return response with subscriber info
    return res.status(200).json({
      success: true,
      subscribed,
      message,
      subscriber: subscriptionData.subscriber,
    });
  } catch (error) {
    console.error("Toggle Subscription error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to toggle subscription.",
    });
  }
};

// Get all users' subscribed  channel
export const getSubscribedCreators = async (req, res) => {
  try {
    const { userId } = req.params;

    const subscriptions = await Subscription.find({
      subscriber: userId,
    }).populate("subscribedTo", "name email profileImage subscribersCount");

    const creators = subscriptions.map((s) => s.subscribedTo);

    res.status(200).json({ success: true, subscribedTo: creators });
  } catch (error) {
    console.error("Get subscribed creators error:", error);
    res.status(500).json({ message: "Failed to fetch subscriptions." });
  }
};

// 🧍 Get a single creator by ID
export const getCreatorById = async (req, res) => {
  try {
    const { id } = req.params;

    // 🔍 Find the creator by ID
    const creator = await User.findById(id)
      .select("name email profileImage subscribersCount role uploadedVideos")
      .populate(
        "uploadedVideos",
        "title thumbnailUrl views commentsCount likesCount "
      );

    if (!creator || creator.role !== "creator") {
      return res.status(404).json({ message: "Creator not found" });
    }

    // 👥 Fetch all subscribers (users who subscribed to this creator)
    const subscriptions = await Subscription.find({ subscribedTo: id })
      .populate("subscriber", "name email profileImage")
      .lean();

    const subscribers = subscriptions.map((sub) => sub.subscriber);

    // 📊 Count total subscribers (for safety — could also use creator.subscribersCount)
    const subscriberCount = subscribers.length;

    res.status(200).json({
      success: true,
      creator,
      subscriberCount,
      subscribers, // List of all subscriber users
    });
  } catch (error) {
    console.error("GetCreatorById error:", error);
    res.status(500).json({ message: "Failed to fetch creator" });
  }
};

// 👥 Get all creators
export const getCreators = async (req, res) => {
  try {
    const creators = await User.find({ role: "creator" })
      .select("name email profileImage subscribersCount")
      .sort({ subscribersCount: -1 }); // most popular first

    res.status(200).json({ success: true, creators });
  } catch (error) {
    console.error("GetCreators error:", error);
    res.status(500).json({ message: "Failed to fetch creators" });
  }
};
