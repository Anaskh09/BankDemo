// server.js
"use strict";

const path = require("path");
const express = require("express");
const session = require("express-session");

const config = require("./src/config");
const db = require("./src/db");

// Routes
const authRoutes = require("./src/routes/auth.routes");
const bankRoutes = require("./src/routes/bank.routes");

const app = express();

// --------------------
// View engine (EJS)
// --------------------
app.set("view engine", "ejs");
app.set("views", config.paths.views);

// --------------------
// Middlewares
// --------------------

// Parse form data (application/x-www-form-urlencoded)
app.use(express.urlencoded({ extended: true }));

// Parse JSON (if you later add API endpoints)
app.use(express.json());

// Static files (CSS, images, client JS)
app.use(express.static(config.paths.public));

// Sessions (login state)
app.use(
  session({
    name: "bankdemo.sid",
    secret: config.session.secret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: config.session.cookie.httpOnly,
      secure: config.session.cookie.secure, // true only with HTTPS
      sameSite: config.session.cookie.sameSite,
      maxAge: config.session.cookie.maxAgeMs,
    },
  })
);

// Make common variables available to all EJS templates
app.use((req, res, next) => {
  res.locals.mode = config.securityMode;       // vuln | secure (for demo banner)
  res.locals.user = req.session.user || null;  // currently logged user
  next();
});

// --------------------
// Routes
// --------------------
app.get("/", (req, res) => {
  // Redirect to dashboard if logged in, else login
  if (req.session.user) return res.redirect("/dashboard");
  return res.redirect("/login");
});

app.use("/", authRoutes);
app.use("/", bankRoutes);

// --------------------
// 404 handler
// --------------------
app.use((req, res) => {
  res.status(404).send("404 - Not Found");
});

// --------------------
// Startup
// --------------------
(async () => {
  try {
    await db.ping();
    console.log("✅ Connected to MySQL successfully.");
  } catch (err) {
    console.error("❌ MySQL connection failed:");
    console.error(err.message || err);
    process.exit(1);
  }

  app.listen(config.port, () => {
    console.log(`🚀 Server running on http://localhost:${config.port}`);
    console.log(`🔐 SECURITY_MODE = ${config.securityMode}`);
  });
})();
