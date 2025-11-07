// models/commentModel.js
const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const commentSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  postID: { type: String, required: true },     // thuộc về post nào
  userID: { type: String, required: true },
  content: { type: String, required: true },
  parentID: { type: String, default: null },     // nếu là reply
  depth: { type: Number, default: 0 },           // 0 = comment gốc
}, { timestamps: true });

// Tắt ObjectId ảo
commentSchema.set("id", false);

module.exports = mongoose.model("Comment", commentSchema, "comments");
