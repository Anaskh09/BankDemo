// src/routes/auth.routes.js
"use strict";

const express = require("express");
const router = express.Router();

const db = require("../db");
const config = require("../config");
const bcrypt = require("bcrypt");

// GET /login
router.get("/login", (req, res) => {
  if (req.session.user) return res.redirect("/dashboard");
  return res.render("login", { error: null });
});

// POST /login
router.post("/login", async (req, res) => {
  const email = (req.body.email || "").trim();
  const password = String(req.body.password || "");

  if (!email || !password) {
    return res.status(400).render("login", { error: "Email et mot de passe requis." });
  }

  try {
    // =========================
    // 🔴 VULNERABLE MODE (SQLi)
    // =========================
    if (config.securityMode === "vuln") {
      // Intentionally insecure for demo:
      // - password_plain in DB
      // - string concatenation -> SQL Injection possible
      const sql =
        "SELECT id, email, role FROM users " +
        "WHERE email='" + email + "' AND password_plain='" + password + "'";

      const [rows] = await db.query(sql);

      if (!rows.length) {
        return res.status(401).render("login", { error: "Incorrect email or password." });
      }

      req.session.user = {
        id: rows[0].id,
        email: rows[0].email,
        role: rows[0].role,
      };

      return res.redirect("/dashboard");
    }

    // =========================
    // 🟢 SECURE MODE
    // =========================
    // Prepared statement + bcrypt hash check
    const [rows] = await db.execute(
      "SELECT id, email, role, password_hash FROM users WHERE email = ? LIMIT 1",
      [email]
    );

    if (!rows.length) {
      return res.status(401).render("login", { error: "Incorrect email or password." });
    }

    const ok = await bcrypt.compare(password, rows[0].password_hash || "");
    if (!ok) {
      return res.status(401).render("login", { error: "Incorrect email or password." });
    }

    req.session.user = {
      id: rows[0].id,
      email: rows[0].email,
      role: rows[0].role,
    };

    return res.redirect("/dashboard");
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).render("login", { error: "Server error. Try again." });
  }
});

// GET /logout
router.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/login"));
});

module.exports = router;
