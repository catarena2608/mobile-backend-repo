require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");

const app = express();

app.use(cookieParser());
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

// ================== MAP SERVICE ==================
const serviceMap = {
  "/api/auth": "http://localhost:3001",  // Auth service
  "/api/users": "http://localhost:3002", // User service
  "/api/post": "http://localhost:4001", // Post service
};

// ================== JWT MIDDLEWARE ==================
app.use(async (req, res, next) => {
  // ❌ Bỏ qua kiểm tra JWT cho các request Auth
  if (req.originalUrl.startsWith("/api/auth")) return next();

  // ✅ Lấy token (ưu tiên cookie, sau đó là header Authorization)
  const token =
    req.cookies?.token ||
    req.headers["authorization"]?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({ message: "Thiếu token xác thực" });
  }

  try {
    const decoded = jwt.verify(token, process.env.MyJWT_SECRET);
    req.user = decoded; // Lưu payload để gửi tiếp sang service
    next();
  } catch (err) {
    console.error("❌ JWT error:", err.message);
    return res
      .status(403)
      .json({ message: "Token không hợp lệ hoặc đã hết hạn" });
  }
});

// ================== PROXY ==================
app.use("/api", (req, res) => {
  // 1️⃣ Xác định service đích
  let targetBase = null;
  for (const prefix in serviceMap) {
    if (req.originalUrl.startsWith(prefix)) {
      targetBase = serviceMap[prefix];
      break;
    }
  }

  if (!targetBase) {
    console.log(`[Gateway ❌] Không tìm thấy service cho ${req.originalUrl}`);
    return res
      .status(404)
      .json({ message: "Không tìm thấy service phù hợp" });
  }

  // 2️⃣ Giữ nguyên path và query
  const targetUrl = new URL(targetBase + req.originalUrl);

  console.log(
    `[Gateway 🚀] ${req.method} ${req.originalUrl} → ${targetUrl.href}`
  );

  // 3️⃣ Sao chép header
  const headers = { ...req.headers };
  delete headers.host;

  // ⚡ Nếu đã decode JWT, gắn info user vào header
  if (req.user) {
    headers["x-user-id"] = req.user.id || req.user._id;
    headers["x-user-email"] = req.user.email;
  }

  // 4️⃣ Tạo request tới service
  const options = {
    method: req.method,
    headers,
  };

  const proxyReq = http.request(targetUrl, options, (proxyRes) => {
    res.status(proxyRes.statusCode);
    for (const [key, value] of Object.entries(proxyRes.headers)) {
      res.setHeader(key, value);
    }
    proxyRes.pipe(res);
  });

  proxyReq.on("error", (err) => {
    console.error(`[Gateway ❌] ${req.method} ${targetUrl.href} → ${err.message}`);
    if (!res.headersSent) {
      res.status(502).json({ message: "Lỗi kết nối tới service nội bộ" });
    }
  });

  // 5️⃣ Truyền body
  req.pipe(proxyReq);
});

// ================== ROOT ==================
app.get("/", (req, res) => res.send("🌐 API Gateway đang hoạt động! 🚀"));

// ================== START ==================
const PORT = process.env.GATEWAY_PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚪 Gateway chạy ở http://localhost:${PORT}`);
});
