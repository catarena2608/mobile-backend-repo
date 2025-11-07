const express = require("express");
const router = express.Router();
const User = require("../models/userModel");

// ✅ GET all users — chỉ lấy các trường cần thiết
router.get("/", async (req, res) => {
  try {
    const users = await User.find()
      .select("id name email avatar numPosts numFollowed numFollowing tags"); // chỉ lấy các trường này
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ❌ /getMe hiện tại không có ý nghĩa, nên tớ sửa lại mẫu luôn:
router.get("/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select(
      "id name email avatar coverImage numPosts numFollowed numFollowing tags link"
    );
    if (!user) return res.status(404).json({ message: "Không tìm thấy user" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ POST edit profile
router.post("/editProfile/:id", async (req, res) => {
  try {
    const { name, tags, email, avatar, link, preference } = req.body;

    const linkArray = Array.isArray(link)
      ? link
      : typeof link === "string"
      ? link
          .split("\n")
          .map((l) => l.trim())
          .filter((l) => l)
      : [];

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      {
        name,
        tags, // đổi từ userName sang tags
        email,
        avatar,
        link: linkArray,
        preference: {
          allergy: preference?.allergy || [],
          illness: preference?.illness || [],
          diet: preference?.diet ? [preference.diet] : ["Bình thường"],
        },
      },
      { new: true }
    ).select(
      "_id name email avatar coverImage numPosts numFollowed numFollowing tags link preference"
    );

    if (!updatedUser)
      return res.status(404).json({ message: "Không tìm thấy user để cập nhật" });

    res.json({
      message: "Cập nhật hồ sơ thành công",
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        avatar: updatedUser.avatar,
        coverImage: updatedUser.coverImage,
        numPosts: updatedUser.numPosts,
        numFollowed: updatedUser.numFollowed,
        numFollowing: updatedUser.numFollowing,
        tags: updatedUser.tags,
        link: updatedUser.link,
        preference: updatedUser.preference,
      },
    });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "Lỗi khi cập nhật hồ sơ", error: err.message });
  }
});
module.exports = router;
