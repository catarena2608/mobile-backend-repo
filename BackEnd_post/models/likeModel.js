const mongoose = require("mongoose");

// Schema cho Like
const likeSchema = new mongoose.Schema(
  {
    _id: {
      type: String, // Dạng: userID_postID
    },
    userID: {
      type: String,
      required: true,
      index: true,
    },
    postID: {
      type: String,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Tạo composite key tự động (để không cần gán thủ công)
likeSchema.pre("validate", function (next) {
  if (!this._id) {
    this._id = `${this.userID}_${this.postID}`;
  }
  next();
});

// Tạo index unique phòng trường hợp _id bị vô hiệu hoá
likeSchema.index({ userID: 1, postID: 1 }, { unique: true });

module.exports = mongoose.model("Like", likeSchema);
