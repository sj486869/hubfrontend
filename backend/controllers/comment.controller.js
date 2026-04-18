import Video from "../models/video.model.js";
import Comment from "../models/comment.model.js";



export const addCommentToVideo = async (req, res) => {
  try {
    const { id } = req.params; // Video ID
    const { text } = req.body;
    const { userId } = req.user;

    if (!text || text.trim() === "") {
      return res.status(400).json({ message: "Comment text is required." });
    }

    // Check video existence
    const video = await Video.findById(id);
    if (!video) {
      return res.status(404).json({ message: "Video not found." });
    }

    // Create new top-level comment
    const newComment = await Comment.create({
      text,
      user: userId,
      video: id,
      parentComment: null, // top-level comment
    });

    // Add comment to video
    video.comments.push(newComment._id);
    video.commentsCount += 1; // optional if you track commentsCount
    await video.save();

    const populatedComment = await newComment.populate(
      "user",
      "name email profileImage"
    );

    res.status(201).json({
      success: true,
      message: "Comment added successfully.",
      comment: populatedComment,
    });
  } catch (error) {
    console.error("Error adding comment:", error);
    res.status(500).json({ message: "Failed to add comment." });
  }
};


export const getVideoComments = async (req, res) => {
  try {
    const { id } = req.params;

    // Check video existence
    const video = await Video.findById(id);
    if (!video) {
      return res.status(404).json({ message: "Video not found." });
    }

    // Find top-level comments (no parent)
    const comments = await Comment.find({
      video: id,
      parentComment: null,
    })
      .populate("user", "name email profileImage")
      .sort({ createdAt: -1 });

    // For each top-level comment, fetch its replies
    const commentsWithReplies = await Promise.all(
      comments.map(async (comment) => {
        const replies = await Comment.find({ parentComment: comment._id })
          .populate("user", "name email profileImage")
          .sort({ createdAt: 1 }); // replies oldest first

        return {
          ...comment.toObject(),
          replies,
        };
      })
    );

    res.status(200).json({
      success: true,
      totalComments: comments.length,
      comments: commentsWithReplies,
    });
  } catch (error) {
    console.error("Error fetching comments:", error);
    res.status(500).json({ message: "Failed to fetch comments." });
  }
};

// ✅ Update comment (owner only)
export const updateComment = async (req, res) => {
  try {
    const { id } = req.params; // comment id
    const { text } = req.body;
    const { userId } = req.user;

    if (!text || text.trim() === "") {
      return res.status(400).json({ message: "Comment text is required." });
    }

    const comment = await Comment.findById(id);
    if (!comment) return res.status(404).json({ message: "Comment not found." });

    // Only owner can update
    if (comment.user.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Not authorized to update this comment." });
    }

    comment.text = text;
    const updatedComment = await comment.save();
    const populatedComment = await updatedComment.populate("user", "name email profileImage");

    res.status(200).json({
      success: true,
      message: "Comment updated successfully.",
      comment: populatedComment,
    });
  } catch (error) {
    console.error("Error updating comment:", error);
    res.status(500).json({ message: "Failed to update comment." });
  }
};

// ✅ Delete comment (owner or admin)
export const deleteComment = async (req, res) => {
  try {
    const { id } = req.params; // comment id
    const { userId} = req.user;

    const comment = await Comment.findById(id);
    if (!comment) return res.status(404).json({ message: "Comment not found." });

    // Owner or admin can delete
    if (comment.user.toString() !== userId.toString() ) {
      return res.status(403).json({ message: "Not authorized to delete this comment." });
    }

    // If it’s a reply, decrement parent’s repliesCount
    if (comment.parentComment) {
      const parent = await Comment.findById(comment.parentComment);
      if (parent) {
        parent.repliesCount = Math.max(0, parent.repliesCount - 1);
        await parent.save();
      }
    }

    // Remove comment from video.comments array
    const video = await Video.findById(comment.video);
    if (video) {
      video.comments = video.comments.filter(cId => cId.toString() !== id);
      video.commentsCount = Math.max(0, video.commentsCount - 1);
      await video.save();
    }

    await comment.deleteOne();

    res.status(200).json({
      success: true,
      message: "Comment deleted successfully.",
    });
  } catch (error) {
    console.error("Error deleting comment:", error);
    res.status(500).json({ message: "Failed to delete comment." });
  }
};

// ✅ Reply to a comment
export const replyToComment = async (req, res) => {
  try {
    const { id } = req.params; // parent comment ID
    const { text } = req.body;
    const { userId } = req.user;

    if (!text || text.trim() === "") {
      return res.status(400).json({ message: "Reply text is required." });
    }

    // Check parent comment existence
    const parentComment = await Comment.findById(id);
    if (!parentComment)
      return res.status(404).json({ message: "Parent comment not found." });

    // Check video existence
    const video = await Video.findById(parentComment.video);
    if (!video) return res.status(404).json({ message: "Video not found." });

    // Create reply
    const reply = await Comment.create({
      text,
      user: userId,
      video: parentComment.video,
      parentComment: id, // reference parent comment
    });

    // Update counts
    parentComment.repliesCount += 1;
    await parentComment.save();

    video.comments.push(reply._id); // optional: include in video comments array
    video.commentsCount += 1; // optional
    await video.save();

    const populatedReply = await reply.populate("user", "name email profileImage");

    res.status(201).json({
      success: true,
      message: "Reply added successfully.",
      reply: populatedReply,
    });
  } catch (error) {
    console.error("Error replying to comment:", error);
    res.status(500).json({ message: "Failed to add reply." });
  }
};


// ✅ Like or unlike a comment
export const likeOrUnlikeComment = async (req, res) => {
  try {
    const { id } = req.params; // comment id
    const { userId } = req.user;

    const comment = await Comment.findById(id);
    if (!comment) return res.status(404).json({ message: "Comment not found." });

    const hasLiked = comment.likes.includes(userId);

    if (hasLiked) {
      // Unlike
      comment.likes = comment.likes.filter(uId => uId.toString() !== userId.toString());
      comment.likesCount = Math.max(0, comment.likesCount - 1);
    } else {
      // Like
      comment.likes.push(userId);
      comment.likesCount += 1;
    }

    await comment.save();

    res.status(200).json({
      success: true,
      message: hasLiked ? "Comment unliked." : "Comment liked.",
      likesCount: comment.likesCount,
    });
  } catch (error) {
    console.error("Error liking/unliking comment:", error);
    res.status(500).json({ message: "Failed to like/unlike comment." });
  }
};
