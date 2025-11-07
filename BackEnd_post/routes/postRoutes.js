const express = require("express");
const router = express.Router();
const multer = require("multer");
const axios = require("axios");
const FormData = require("form-data");
const Post = require("../models/postModel");
const Like = require("../models/likeModel");
const Comment = require("../models/commentModel"); // model comment
const { isValidObjectId } = require("mongoose");
const { v4: uuidv4 } = require("uuid");

// 🧩 GET posts với cursor-based pagination + check meLike nhanh bằng composite _id
router.get("/", async (req, res) => {
  try {
    const { after, userID } = req.query; // user gửi kèm thời điểm và ID
    const limit = 10;

    if (!userID) {
      return res.status(400).json({ success: false, message: "Thiếu userID" });
    }

    // Nếu có after => lấy post cũ hơn thời điểm đó
    const query = after ? { createdAt: { $lt: new Date(after) } } : {};

    // Lấy 10 bài viết mới nhất (hoặc cũ hơn after)
    const posts = await Post.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    if (posts.length === 0) {
      return res.json({
        success: true,
        posts: [],
        nextCursor: null,
      });
    }

    // Tạo danh sách _id dạng userID_postID để query Like nhanh hơn
    const likeIDs = posts.map((p) => `${userID}_${p._id}`);

    // Query Like theo danh sách _id (chỉ check tồn tại)
    const liked = await Like.find({ _id: { $in: likeIDs } }).select("_id");

    // Dùng Set để tra nhanh
    const likedSet = new Set(liked.map((l) => l._id));

    // Gắn thêm trường meLike
    const resultPosts = posts.map((p) => ({
      ...p,
      meLike: likedSet.has(`${userID}_${p._id}`),
    }));

    // Cursor tiếp theo
    const nextCursor = posts[posts.length - 1].createdAt;

    res.json({
      success: true,
      nextCursor,
      posts: resultPosts,
    });
  } catch (err) {
    console.error("❌ Error fetching posts:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});
router.get("/:userID", async (req, res) => {
  try {
    const { userID } = req.params;
    if (!userID)
      return res.status(400).json({ success: false, message: "Thiếu userID" });

    // Lấy các bài viết do user đó đăng
    const posts = await Post.find({ userID }).sort({ createdAt: -1 }).lean();

    res.json({
      success: true,
      total: posts.length,
      posts,
    });
  } catch (err) {
    console.error("❌ Lỗi khi lấy bài viết theo user:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});
// ⚙️ Cấu hình multer (lưu file tạm trong RAM)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// 🧩 Upload bài viết
router.post("/upload", upload.array("media", 10), async (req, res) => {
  try {
    const { userID, type, caption, tag, location } = req.body;

    if (!userID || !type)
      return res.status(400).json({ success: false, message: "Thiếu thông tin bắt buộc" });

    // 🖼 Upload tất cả ảnh lên Cloudinary
    const uploadedUrls = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const formData = new FormData();
        formData.append("file", file.buffer, file.originalname);
        formData.append("upload_preset", "uploadDemo"); // preset Cloudinary của bạn

        const cloudRes = await axios.post(
          "https://api.cloudinary.com/v1_1/dx6uxiydg/image/upload",
          formData,
          { headers: formData.getHeaders() }
        );

        uploadedUrls.push(cloudRes.data.secure_url);
      }
    }

    // 🧩 Parse JSON cho tag và location
    const parsedTag = tag ? JSON.parse(tag) : [];
    const parsedLocation = location ? JSON.parse(location) : {
      type: "Point",
      coordinates: [0, 0],
      name: "Không rõ",
    };

    // 🧠 Tạo Post mới
    const newPost = new Post({
      _id: uuidv4(),
      userID,
      type,
      caption,
      tag: parsedTag,
      location: parsedLocation,
      media: uploadedUrls, // ảnh sau khi up Cloudinary
      like: 0,
    });

    await newPost.save();

    res.json({
      success: true,
      message: "Đăng bài thành công 🎉",
      post: newPost,
    });
  } catch (err) {
    console.error("❌ Lỗi upload bài:", err.message);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi upload bài",
      error: err.message,
    });
  }
});
// ❤️ LIKE bài viết
router.post("/like", async (req, res) => {
  try {
    const { userID, postID } = req.body;
    if (!userID || !postID)
      return res
        .status(400)
        .json({ success: false, message: "Thiếu userID hoặc postID" });

    const likeID = `${userID}_${postID}`;

    // 🔍 Kiểm tra đã like chưa
    const existed = await Like.findById(likeID);
    if (existed) {
      return res.json({
        success: true,
        message: "Đã like trước đó",
      });
    }

    // ✅ Tạo bản ghi like
    await Like.create({ userID, postID });

    // 🔼 Cập nhật số lượng like trong Post
    await Post.findByIdAndUpdate(postID, { $inc: { like: 1 } });

    res.json({
      success: true,
      message: "Đã like bài viết ❤️",
    });
  } catch (err) {
    console.error("❌ Lỗi khi like:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 💔 UNLIKE bài viết
router.delete("/like", async (req, res) => {
  try {
    const { userID, postID } = req.body;
    if (!userID || !postID)
      return res
        .status(400)
        .json({ success: false, message: "Thiếu userID hoặc postID" });

    const likeID = `${userID}_${postID}`;

    // ❌ Xóa like nếu tồn tại
    const deleted = await Like.findByIdAndDelete(likeID);

    if (!deleted) {
      return res.json({
        success: true,
        message: "Chưa từng like bài này",
      });
    }

    // 🔽 Giảm số lượng like trong Post
    await Post.findByIdAndUpdate(postID, { $inc: { like: -1 } });

    res.json({
      success: true,
      message: "Đã bỏ like 💔",
    });
  } catch (err) {
    console.error("❌ Lỗi khi unlike:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});
// 🧩 GET /api/post/comment/:postID?after=...
router.get("/comment/:postID", async (req, res) => {
  try {
    const { postID } = req.params;
    const { after } = req.query;
    const limit = 20;

    if (!postID)
      return res.status(400).json({ success: false, message: "Thiếu postID" });

    // ✅ Bước 1: lấy 20 comment depth=0 mới nhất (cũ hơn after nếu có)
    const baseQuery = { postID, depth: 0 };
    if (after) baseQuery.createdAt = { $lt: new Date(after) };

    const parents = await Comment.find(baseQuery)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    if (parents.length === 0) {
      return res.json({
        success: true,
        comments: [],
        nextCursor: null,
      });
    }

    // ✅ Bước 2: lấy ID tầng 0
    const parentIDs = parents.map((c) => c._id);

    // ✅ Bước 3: lấy tất cả reply depth=1 có parentID thuộc tầng 0
    const level1 = await Comment.find({
      postID,
      depth: 1,
      parentID: { $in: parentIDs },
    }).lean();

    // ✅ Bước 4: lấy tất cả reply depth=2 có parentID thuộc tầng 1
    const level1IDs = level1.map((c) => c._id);
    const level2 = await Comment.find({
      postID,
      depth: 2,
      parentID: { $in: level1IDs },
    }).lean();

    // ✅ Bước 5: Map tra nhanh
    const level1Map = new Map();
    const level2Map = new Map();

    // Map level2 → nhóm theo parentID
    for (const c of level2) {
      if (!level2Map.has(c.parentID)) level2Map.set(c.parentID, []);
      level2Map.get(c.parentID).push(c);
    }

    // Map level1 → gắn replies từ level2
    for (const c of level1) {
      c.replies = level2Map.get(c._id) || [];
      if (!level1Map.has(c.parentID)) level1Map.set(c.parentID, []);
      level1Map.get(c.parentID).push(c);
    }

    // ✅ Bước 6: Gắn replies vào tầng 0
    for (const p of parents) {
      p.replies = level1Map.get(p._id) || [];
    }

    // ✅ Bước 7: nextCursor cho pagination
    const nextCursor = parents[parents.length - 1].createdAt;

    res.json({
      success: true,
      nextCursor,
      comments: parents,
    });
  } catch (err) {
    console.error("❌ Lỗi khi lấy comment:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});
// 🧩 POST /api/post/addComment
router.post("/comment", async (req, res) => {
  try {
    const { userID, postID, content, reply } = req.body;

    if (!userID || !postID || !content)
      return res
        .status(400)
        .json({ success: false, message: "Thiếu userID, postID hoặc nội dung" });

    let parentID = null;
    let depth = 0;

    // Nếu là reply thì tìm comment cha
    if (reply) {
      const parentComment = await Comment.findById(reply);
      if (!parentComment)
        return res
          .status(404)
          .json({ success: false, message: "Không tìm thấy comment gốc để reply" });

      // Giới hạn 3 tầng: 0,1,2 → reply thêm sẽ vẫn là depth=2
      depth = parentComment.depth + 1 > 2 ? 2 : parentComment.depth + 1;
      parentID = parentComment._id;
    }

    // ✅ Tạo comment mới
    const newComment = await Comment.create({
      postID,
      userID,
      content,
      parentID,
      depth,
    });

    // ✅ Cập nhật số lượng comment trong Post
    await Post.findByIdAndUpdate(postID, { $inc: { comment: 1 } });

    res.json({
      success: true,
      message: "Đã thêm bình luận 💬",
      comment: newComment,
    });
  } catch (err) {
    console.error("❌ Lỗi khi thêm bình luận:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});
// 🗑 DELETE /api/post/comment/:id
router.delete("/comment/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const comment = await Comment.findById(id);

    if (!comment)
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy bình luận để xóa" });

    // ✅ Xóa chính comment này
    await Comment.findByIdAndDelete(id);

    // ✅ Xóa luôn các reply con (nếu có)
    await Comment.deleteMany({ parentID: id });

    // ✅ Nếu comment depth=0 → có thể có reply 2 tầng, nên xóa cascade thêm 1 lớp
    if (comment.depth === 0) {
      const level1Replies = await Comment.find({ parentID: id }).select("_id");
      const level1IDs = level1Replies.map((r) => r._id);
      await Comment.deleteMany({ parentID: { $in: level1IDs } });
    }

    // ✅ Giảm số comment trong Post
    await Post.findByIdAndUpdate(comment.postID, { $inc: { comment: -1 } });

    res.json({
      success: true,
      message: "Đã xóa bình luận 🗑️",
    });
  } catch (err) {
    console.error("❌ Lỗi khi xóa bình luận:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});
module.exports = router;
