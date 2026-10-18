
require("dotenv").config();

const express = require("express");
const connectDB = require("./src/config/db");
const activityRoutes = require("./src/routes/activityRoutes");
const authRoutes = require("./src/routes/authRoutes");
const protect = require("./src/middleware/authMiddleware");
const movieRoutes = require("./src/routes/movieRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware: parse incoming JSON request bodies
app.use(express.json());

// Health-check endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "CineFile API is running!",
  });
});

app.get("/api/auth/me", protect, (req, res) => {
  res.status(200).json({
    success: true,
    userId: req.user.id,
  });
});

app.use("/api/activities", activityRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/movies", movieRoutes);

// Connect to MongoDB before starting the server
async function startServer() {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`CineFile server running on port ${PORT}`);
  });
}

startServer();
