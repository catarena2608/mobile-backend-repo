const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const fs = require("fs");
require("dotenv").config();

const app = express();

// Middleware
app.use(cors({
  origin: "http://localhost:5173",
  credentials: true,
}));
app.use(bodyParser.json());

// Import model và route
const User = require("./models/userModel");
const userRoutes = require("./routes/userRoutes");
app.use("/api/users", userRoutes);

// Kết nối MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ User service connected to MongoDB"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

const db = mongoose.connection;

// Khi DB mở → import users.json nếu rỗng
db.once("open", async () => {
  try {
    const count = await User.countDocuments();
    if (count === 0) {
      const filePath = "./users.json";
      if (fs.existsSync(filePath)) {
        const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        await User.insertMany(data);
        console.log("✅ Imported users.json vào MongoDB");
      } else {
        console.warn("⚠️ Không tìm thấy file users.json để import.");
      }
    } else {
      console.log(`ℹ️ Đã có ${count} user trong database, bỏ qua import.`);
    }
  } catch (err) {
    console.error("❌ Lỗi import users.json:", err);
  }
});

// Chạy server
const PORT = process.env.PORT || 3002;
app.listen(PORT, () => console.log(`🚀 User service chạy ở http://localhost:${PORT}`));
