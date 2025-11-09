const express = require("express");
const multer = require("multer");
const axios = require("axios");
const FormData = require("form-data");
const { v4: uuidv4 } = require("uuid");
const Recipe = require("../models/recipeModel");

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });

// 🧩 POST /api/recipe/upload
router.post("/upload", upload.array("media", 50), async (req, res) => {
  try {
    const {
      userID,
      caption,
      postID,
      name,
      description,
      ration,
      time,
      ingredients,
      guide,
      tags,
    } = req.body;

    if (!userID || !name) {
      return res
        .status(400)
        .json({ success: false, message: "Thiếu thông tin bắt buộc" });
    }

    // 🧠 Parse JSON từ frontend
    const parsedIngredients = ingredients ? JSON.parse(ingredients) : {};
    const parsedGuide = guide ? JSON.parse(guide) : [];
    const parsedTags = tags ? JSON.parse(tags) : [];

    // 🖼 Upload tất cả file (ảnh/video) lên Cloudinary
    const uploadedUrls = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const formData = new FormData();
        formData.append("file", file.buffer, file.originalname);
        formData.append("upload_preset", "uploadDemo");

        const cloudRes = await axios.post(
          "https://api.cloudinary.com/v1_1/dx6uxiydg/auto/upload",
          formData,
          { headers: formData.getHeaders() }
        );
        uploadedUrls.push(cloudRes.data.secure_url);
      }
    }

    // 🧩 Phân bổ file vào thumbnail + guide media
    // Quy ước frontend: file đầu tiên (nếu có thumbnail) là thumbnail
    // Còn lại là media của các bước
    let fileIndex = 0;

    // Thumbnail
    const thumbnail = uploadedUrls.length > 0 ? uploadedUrls[fileIndex++] : null;

    // Guide media
    for (const g of parsedGuide) {
      if (g.media && g.media.length > 0) {
        const mediaUrls = [];

        for (let i = 0; i < g.media.length; i++) {
          if (fileIndex < uploadedUrls.length) {
            mediaUrls.push(uploadedUrls[fileIndex++]);
          }
        }

        g.media = mediaUrls; // Gán lại thành mảng URL string
      } else {
        g.media = []; // Nếu không có media, gán rỗng để Mongoose không lỗi
      }
    }

    // 📦 Tạo recipe
    const newRecipe = new Recipe({
      _id: uuidv4(),
      userID,
      postID,
      caption,
      name,
      description,
      ration: ration ? Number(ration) : 1,
      time,
      ingredients: parsedIngredients,
      guide: parsedGuide,
      tags: parsedTags,
      thumbnail,
    });

    await newRecipe.save();

    res.json({
      success: true,
      message: "🍳 Tạo công thức thành công!",
      recipe: newRecipe,
    });
  } catch (err) {
    console.error("❌ Lỗi upload recipe:", err);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi upload recipe",
      error: err.message,
    });
  }
});
// GET /api/recipe/:postID
router.get("/:postID", async (req, res) => {
  try {
    const { postID } = req.params;
    if (!postID)
      return res.status(400).json({ success: false, message: "Thiếu postID" });

    const recipe = await Recipe.findOne({ postID });
    if (!recipe)
      return res.status(404).json({ success: false, message: "Không tìm thấy recipe" });

    res.json({ success: true, recipe });
  } catch (err) {
    console.error("❌ Lỗi GET recipe:", err);
    res.status(500).json({ success: false, message: "Lỗi server", error: err.message });
  }
});

module.exports = router;
