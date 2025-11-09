const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

// ====================== INGREDIENT SCHEMA ======================
const ingredientSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },

  // Tên nguyên liệu
  name: { type: String, required: true, trim: true }, // Tên tiếng Anh
  name_vi: { type: String, required: true, trim: true }, // Tên tiếng Việt

  // Phân loại & vai trò
  category: { type: String, default: "" }, // Ví dụ: Protein, Carb, Vegetable...
  type: {
    type: [String],
    enum: ["base", "comple", "spice", "other"], // 4 nhóm reasoning
    required: true
  },

  // Gắn thẻ, mô tả
  tags: { type: [String], default: [] },
  flavor_profile: { type: [String], default: [] }, // "thanh", "béo nhẹ"...
  texture: { type: String, default: "" },

  // Dinh dưỡng cơ bản (theo 100g)
  nutrition: {
    calories: { type: Number, default: 0 },
    protein_g: { type: Number, default: 0 },
    fat_g: { type: Number, default: 0 },
    carbs_g: { type: Number, default: 0 }
  },

  // Gợi ý kết hợp
  pairings: { type: [String], default: [] }, // "rau cải", "nấm"...
  alternatives: { type: [String], default: [] }, // "trứng", "phô mai tươi"...

  // Tương thích tốt/xấu
  compatibility: {
    good_with: { type: [String], default: [] },
    bad_with: { type: [String], default: [] }
  },

  // Bảo quản
  storage: { type: String, default: "" },

  // Embed mô tả cho reasoning / hiển thị AI
  embed_text: { type: String, default: "" }

}, { timestamps: true });

// ====================== EXPORT ======================
module.exports = mongoose.model("Ingredient", ingredientSchema, "ingredients");
