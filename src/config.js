"use strict";


const path = require("path");
const dotenv = require("dotenv");

// Load .env (from project root)
dotenv.config({ path: path.join(process.cwd(), ".env") });

function mustGet(name) {
  const v = process.env[name];
  if (!v || String(v).trim() === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return v;
}

function toInt(value, fallback) {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeMode(mode) {
  const m = String(mode || "").toLowerCase().trim();
  if (m === "vuln" || m === "secure") return m;
  return "secure";
}

const config = {
  env: process.env.NODE_ENV || "development",
  port: toInt(process.env.PORT, 3000),

  // Switch demo mode: vuln | secure
  securityMode: normalizeMode(process.env.SECURITY_MODE),

  session: {
    secret: process.env.SESSION_SECRET || "dev-secret-change-me",
    cookie: {
      // In production behind HTTPS, set secure=true
      secure: String(process.env.COOKIE_SECURE || "false").toLowerCase() === "true",
      httpOnly: true,
      sameSite: process.env.COOKIE_SAMESITE || "lax", 
      maxAgeMs: toInt(process.env.SESSION_MAX_AGE_MS, 1000 * 60 * 60), 
    },
  },

  db: {
    host: mustGet("DB_HOST"),
    user: mustGet("DB_USER"),
    password: process.env.DB_PASSWORD ?? "",
    database: mustGet("DB_NAME"),
    port: toInt(process.env.DB_PORT, 3306),
    connectionLimit: toInt(process.env.DB_POOL_LIMIT, 10),
  },

  paths: {
    root: process.cwd(),
    views: path.join(process.cwd(), "views"),
    public: path.join(process.cwd(), "public"),
  },
};

if (config.securityMode === "secure" && config.session.secret === "dev-secret-change-me") {
  console.warn(
    "[WARN] SESSION_SECRET is using a default value. Set SESSION_SECRET in .env for better security."
  );
}

module.exports = config;
