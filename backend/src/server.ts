import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { authMiddleware } from "./middleware/auth";

// Route imports
import authRoutes from "./routes/auth";
import userRoutes from "./routes/user";
import cardsRoutes from "./routes/cards";
import portfolioRoutes from "./routes/portfolio";
import itemsRoutes from "./routes/items";
import scannerRoutes from "./routes/scanner";
import subscriptionRoutes from "./routes/subscription";
import questsRoutes from "./routes/quests";
import referralRoutes from "./routes/referral";
import wishlistRoutes from "./routes/wishlist";
import shareRoutes from "./routes/share";
import blogRoutes from "./routes/blog";
import leaderboardRoutes from "./routes/leaderboard";
import marketRoutes from "./routes/market";
import feedbackRoutes from "./routes/feedback";
import webhooksRoutes from "./routes/webhooks";
import profilRoutes from "./routes/profil";

const app = express();
const PORT = process.env.PORT || 3001;

// ─── CORS ────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  "https://app.pokeitem.fr",
  "https://www.pokeitem.fr",
  "capacitor://localhost",       // iOS Capacitor
  "http://localhost",            // Android Capacitor
  "http://localhost:3000",       // Next.js dev
  "http://localhost:3001",       // Express dev
  ...(process.env.ALLOWED_ORIGINS?.split(",") || []),
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin || ALLOWED_ORIGINS.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`CORS blocked: ${origin}`);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  })
);

// ─── MIDDLEWARE ───────────────────────────────────────────────
// Webhooks need raw body for signature verification — must come BEFORE express.json()
app.use("/api/webhooks", webhooksRoutes);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Auth middleware on all routes (extracts user if present, doesn't block)
app.use(authMiddleware);

// ─── ROUTES ──────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/cards", cardsRoutes);
app.use("/api/portfolio", portfolioRoutes);
app.use("/api/items", itemsRoutes);
app.use("/api/scanner", scannerRoutes);
app.use("/api/subscription", subscriptionRoutes);
app.use("/api/quests", questsRoutes);
app.use("/api/referral", referralRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/share", shareRoutes);
app.use("/api/blog", blogRoutes);
app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api/market", marketRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/profil", profilRoutes);

// ─── HEALTH CHECK ────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ─── 404 ─────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// ─── START ───────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 PokeItem API running on port ${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`   Allowed origins: ${ALLOWED_ORIGINS.join(", ")}`);
});

export default app;
