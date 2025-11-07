const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid"); // cần cài: npm i uuid

const userSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  name: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String, required: true },
  avatar: { type: String, required: true },
  coverImage: { type: String, default: "" },
  numPosts: { type: Number, default: 0 },
  numFollowed: { type: Number, default: 0 },
  numFollowing: { type: Number, default: 0 },
  tags: { type: [String], default: [] },
  link: { type: [String], default: [] },
  preference: {
    allergy: { type: [String], default: [] },
    illness: { type: [String], default: [] },
    diet: { type: [String], default: [] },
  },
}, { timestamps: true });

// Nếu muốn disable ObjectId hoàn toàn
userSchema.set('id', false);

module.exports = mongoose.model("User", userSchema);
