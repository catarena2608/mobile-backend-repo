const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

// ====================== POST SCHEMA ======================
const postSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  userID: { type: String, required: true },
  type: { type: String, required: true }, // Moment / Rate / Tip / Recipe
  like: { type: Number, default: 0 },

  tag: { type: [String], default: [] },
  caption: { type: String, default: "" },
  media: { type: [String], default: [] },

  location: {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point"
    },
    coordinates: {
      type: [Number],
      default: [0, 0]
    },
    name: { type: String }
  },

  // ✅ Gắn commentSchema vào
  comment: { type: Number, default:0 }

}, { timestamps: true });

// Tắt ObjectId ảo
postSchema.set("id", false);

// ====================== EXPORT ======================
module.exports = mongoose.model("Post", postSchema, "posts");
