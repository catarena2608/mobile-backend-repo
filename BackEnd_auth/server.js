const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
require("dotenv").config();

const authRoutes = require("./routes/authRoutes");

const app = express();

app.use(cors({
  origin: "http://localhost:5173",
  credentials: true,
}));
app.use(bodyParser.json());
app.use(cookieParser());

app.use("/api/auth", authRoutes);

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Auth service connected to MongoDB"))
  .catch(err => console.error("❌ MongoDB error:", err));

app.listen(3001, () => console.log("🚀 Auth service running on port 3001"));
