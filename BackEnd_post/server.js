const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
require("dotenv").config();

const postRoutes = require("./routes/postRoutes");
const Post = require("./models/postModel");
const Like = require("./models/likeModel");
const Comment = require("./models/commentModel");
const fs = require("fs");

const app = express();

app.use(cors({
  origin: "http://localhost:5173",
  credentials: true,
}));
app.use(bodyParser.json());
app.use(cookieParser());

app.use("/api/post", postRoutes);

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("✅ Auth service connected to MongoDB");

    // -------------------
    // Import Posts
    // -------------------
    const postFile = "./postdb.posts.json";
    if (fs.existsSync(postFile)) {
      const rawData = fs.readFileSync(postFile);
      const posts = JSON.parse(rawData);

      const count = await Post.countDocuments();
      if (count === 0 && posts.length > 0) {
        await Post.insertMany(posts);
        console.log(`📦 Imported ${posts.length} posts from JSON`);
      } else {
        console.log("⚠️ Posts collection already has data, skip import");
      }
    } else {
      console.log("⚠️ postdb.posts.json not found, skip import");
    }

    // -------------------
    // Import Likes
    // -------------------
    const likeFile = "./postdb.like.json";
    if (fs.existsSync(likeFile)) {
      const rawData = fs.readFileSync(likeFile);
      const likes = JSON.parse(rawData);

      const count = await Like.countDocuments();
      if (count === 0 && likes.length > 0) {
        await Like.insertMany(likes);
        console.log(`💖 Imported ${likes.length} like entries from JSON`);
      } else {
        console.log("⚠️ Likes collection already has data, skip import");
      }
    } else {
      console.log("⚠️ postdb.like.json not found, skip import");
    }
    // ------------------- IMPORT COMMENTS -------------------
    const commentFile = "./postdb.comment.json";
    if (fs.existsSync(commentFile)) {
      const comments = JSON.parse(fs.readFileSync(commentFile));
      const count = await Comment.countDocuments();
      if (count === 0 && comments.length > 0) {
        await Comment.insertMany(comments);
        console.log(`💬 Imported ${comments.length} comments`);
      } else console.log("⚠️ Comments collection already has data, skip import");
    } else {
      console.log("⚠️ postdb.comment.json not found, skip import");
    }

    // -------------------
    // Start server
    // -------------------
    app.listen(process.env.PORT || 4001, () =>
      console.log(`🚀 Post service running on port ${process.env.PORT || 4001}`)
    );
  })
  .catch(err => console.error("❌ MongoDB error:", err));
