const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const User = require("../models/userModel");
const nodemailer = require("nodemailer");
require("dotenv").config();
// 🔑 Secret key cho JWT
const JWT_SECRET = process.env.MyJWT_SECRET; // đổi sang biến môi trường trong .env thật

// =================== LOGIN ===================
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: "Thiếu email hoặc password" });

    const user = await User.findOne({ email });
    if (!user)
      return res.status(401).json({ message: "Email không tồn tại" });

    // Nếu password trong DB chưa mã hoá thì so sánh trực tiếp (hoặc dùng bcrypt.compare nếu có hash)
    const isMatch = password === user.password || await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ message: "Sai mật khẩu" });

    // Tạo token
    const token = jwt.sign(
      { id: user._id, email: user.email },
      JWT_SECRET,
      { expiresIn: "1d" }
    );

    // Gửi token qua cookie HTTP-only
    res.cookie("token", token, {
      httpOnly: true,
      secure: false, // bật true nếu chạy HTTPS
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000 // 1 ngày
    });

    res.json({
      message: "Đăng nhập thành công",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        numPosts: user.numPosts,
        numFollowed: user.numFollowed,
        numFollowing: user.numFollowing,
        tags: user.tags,
        link:user.link,
        preference: user.preference
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi server" });
  }
});

// =================== CHECK TOKEN ===================
router.get("/me", (req, res) => {
  const token = req.cookies?.token;
  if (!token) return res.status(401).json({ message: "Chưa đăng nhập" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ message: "Xác thực hợp lệ", user: decoded });
  } catch (err) {
    res.status(401).json({ message: "Token không hợp lệ" });
  }
});
// Dang ki
// routes/authRoutes.js
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, avatar } = req.body;

    if (!name || !email || !password || !avatar) {
      return res.status(400).json({ message: "Missing fields" });
    }

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: "Email already exists" });

    const newUser = new User({ name, email, password, avatar });
    await newUser.save();

    res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// =================== LOGOUT ===================
router.post("/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    sameSite: "lax",
    secure: false, // đổi thành true nếu dùng HTTPS
  });
  res.status(200).json({ message: "Đã đăng xuất" });
});
// ========== FORGOT PASSWORD FLOW (có tự xoá OTP + rate limit) ==========

let otpStore = {}; // { email: { otp, expires, verified, lastSent } }

const transporter = nodemailer.createTransport({
  host: "smtp.hostinger.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// 1️⃣ Gửi OTP qua mail
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({ message: "Email không tồn tại" });

    // 🛑 Chống spam: chỉ cho gửi lại sau 60s
    const now = Date.now();
    if (otpStore[email] && now - otpStore[email].lastSent < 60 * 1000) {
      const wait = Math.ceil(
        (60 * 1000 - (now - otpStore[email].lastSent)) / 1000
      );
      return res.status(429).json({
        message: `Vui lòng chờ ${wait} giây nữa trước khi gửi lại OTP.`,
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    otpStore[email] = {
      otp,
      expires: now + 5 * 60 * 1000,
      lastSent: now,
      verified: false,
    };

    // 🕒 Tự động xoá OTP sau 5 phút
    setTimeout(() => {
      if (otpStore[email] && Date.now() > otpStore[email].expires) {
        delete otpStore[email];
        console.log(`🗑️ OTP for ${email} expired & removed`);
      }
    }, 5 * 60 * 1000 + 1000); // +1s để chắc chắn hết hạn

    const mailOptions = {
      from: `"Cookial Support" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Mã OTP khôi phục mật khẩu - Cookial",
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>Xin chào ${user.name || ""}</h2>
          <p>Mã OTP của bạn là:</p>
          <h1 style="letter-spacing: 4px; color: #e67e22;">${otp}</h1>
          <p>Mã này sẽ hết hạn trong <b>5 phút</b>.</p>
          <p>Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    res.json({ message: "✅ OTP đã được gửi qua email" });
  } catch (err) {
    console.error("❌ Lỗi gửi mail:", err);
    res.status(500).json({ message: "Không gửi được email" });
  }
});

// 2️⃣ Xác minh OTP
router.post("/verify-otp", (req, res) => {
  const { email, otp } = req.body;
  const record = otpStore[email];
  if (!record)
    return res.status(400).json({ message: "OTP không tồn tại hoặc đã hết hạn" });
  if (record.otp !== otp)
    return res.status(400).json({ message: "OTP sai" });
  if (Date.now() > record.expires)
    return res.status(400).json({ message: "OTP hết hạn" });

  otpStore[email].verified = true;
  res.json({ message: "OTP hợp lệ" });
});

// 3️⃣ Đặt lại mật khẩu
router.post("/reset-password", async (req, res) => {
  const { email, password } = req.body;
  const record = otpStore[email];
  if (!record || !record.verified)
    return res.status(400).json({ message: "OTP chưa xác thực" });

  const hashed = await bcrypt.hash(password, 10);
  await User.updateOne({ email }, { password: hashed });

  delete otpStore[email];
  res.json({ message: "Đặt lại mật khẩu thành công" });
});


module.exports = router;

