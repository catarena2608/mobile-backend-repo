const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
require("dotenv").config();
const fs = require("fs");

const recipeRoutes = require("./routes/recipeRoutes");
const Ingredient = require("./models/ingreModel");

const app = express();

// ------------------- MIDDLEWARE -------------------
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);
app.use(bodyParser.json());
app.use(cookieParser());

// ------------------- ROUTES -------------------
app.use("/api/recipe", recipeRoutes);

// ------------------- CONNECT MONGO -------------------
mongoose
  .connect(process.env.MONGO_URI, { dbName: "recipedb" }) // ✅ trỏ vào DB "recipedb"
  .then(async () => {
    console.log("✅ Recipe service connected to MongoDB");

    // 📦 IMPORT INGREDIENTS JSON nếu collection trống
    const ingreFile = "./recipedb.ingre.json";
    if (fs.existsSync(ingreFile)) {
      const rawData = fs.readFileSync(ingreFile, "utf-8");
      const ingredients = JSON.parse(rawData);

      const count = await Ingredient.countDocuments();
      if (count === 0 && ingredients.length > 0) {
        await Ingredient.insertMany(ingredients);
        console.log(`🥬 Imported ${ingredients.length} ingredients`);
      } else {
        console.log("⚠️ Ingredients already exist, skip import");
      }
    } else {
      console.log("⚠️ recipedb.ingre.json not found, skip import");
    }

    const PORT = process.env.PORT || 5001;
    app.listen(PORT, () =>
      console.log(`🚀 Recipe service running on port ${PORT}`)
    );
  })
  .catch((err) => console.error("❌ MongoDB error:", err));
