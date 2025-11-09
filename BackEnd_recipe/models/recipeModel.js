const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const ingredientSchema = new mongoose.Schema({
  quantity: String,
  name: String,
});

const stepSchema = new mongoose.Schema({
  step: Number,
  content: String,
  media: [String], // danh sách ảnh hoặc video
});

const recipeSchema = new mongoose.Schema(
  {
    _id: { type: String, default: uuidv4 },
    userID: { type: String, required: true },
    postID: { type: String, ref: "Post" },
    thumbnail: { type: String }, // ảnh thumbnail chính của món ăn
    caption: { type: String }, // caption ngắn
    name: { type: String, required: true }, // tên món
    description: { type: String },
    ration: { type: Number, default: 1 },
    time: { type: String, default: "10 phút" },

    // 🍅 ingredients chia làm 4 nhóm
    ingredients: {
      base: [ingredientSchema],
      comple: [ingredientSchema],
      spice: [ingredientSchema],
      other: [ingredientSchema],
    },

    // 👨‍🍳 hướng dẫn nấu ăn
    guide: [stepSchema],

    tags: [String], // từ khóa, chủ đề
  },
  { timestamps: true }
);

module.exports = mongoose.model("Recipe", recipeSchema);
