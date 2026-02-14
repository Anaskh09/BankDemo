// src/routes/bank.routes.js
"use strict";

const express = require("express");
const router = express.Router();

const db = require("../db");
const config = require("../config");
const requireAuth = require("../middleware/auth");

// =========================
// GET /dashboard (protected)
// =========================
router.get("/dashboard", requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;

    const [rows] = await db.execute(
      `SELECT a.id AS account_id, a.balance
       FROM accounts a
       WHERE a.user_id = ?
       LIMIT 1`,
      [userId]
    );

    const account = rows[0] || { account_id: null, balance: 0 };
    return res.render("dashboard", { account });
  } catch (err) {
    console.error("Dashboard error:", err);
    return res.status(500).send("Server error");
  }
});

// ===================================
// GET /transactions?search= (protected)
// ===================================
router.get("/transactions", requireAuth, async (req, res) => {
  const userId = req.session.user.id;
  const search = String(req.query.search || "").trim();

  try {
    // Get user account_id
    const [accRows] = await db.execute(
      "SELECT id FROM accounts WHERE user_id = ? LIMIT 1",
      [userId]
    );
    const accountId = accRows[0]?.id;
    if (!accountId) return res.render("transactions", { transactions: [], search });

    // 🔴 VULN MODE: SQL injection via `search`
    if (config.securityMode === "vuln") {
      const sql =
        "SELECT id, type, beneficiary, amount, note, created_at FROM transactions " +
        "WHERE account_id=" + accountId + " AND " +
        "(beneficiary LIKE '%" + search + "%' OR note LIKE '%" + search + "%') " +
        "ORDER BY created_at DESC";

      const [rows] = await db.query(sql);
      return res.render("transactions", { transactions: rows, search });
    }

    // 🟢 SECURE MODE: prepared statements
    const like = `%${search}%`;
    const [rows] = await db.execute(
      `SELECT id, type, beneficiary, amount, note, created_at
       FROM transactions
       WHERE account_id = ?
         AND (? = '' OR beneficiary LIKE ? OR note LIKE ?)
       ORDER BY created_at DESC`,
      [accountId, search, like, like]
    );

    return res.render("transactions", { transactions: rows, search });
  } catch (err) {
    console.error("Transactions error:", err);
    return res.status(500).send("Server error");
  }
});

// =========================
// GET /transfer (protected)
// =========================
router.get("/transfer", requireAuth, (req, res) => {
  res.render("transfer", { error: null, success: null });
});

// =========================
// POST /transfer (protected)
// =========================
router.post("/transfer", requireAuth, async (req, res) => {
  const userId = req.session.user.id;
  const beneficiary = String(req.body.beneficiary || "").trim();
  const amount = Number(req.body.amount || 0);
  const note = String(req.body.note || "").trim();

  if (!beneficiary || !Number.isFinite(amount) || amount <= 0) {
    return res.render("transfer", {
      error: "Beneficiary et amount valides requis.",
      success: null,
    });
  }

  try {
    // get account
    const [accRows] = await db.execute(
      "SELECT id, balance FROM accounts WHERE user_id = ? LIMIT 1",
      [userId]
    );
    const account = accRows[0];
    if (!account) {
      return res.render("transfer", { error: "Account not found.", success: null });
    }

    if (account.balance < amount) {
      return res.render("transfer", { error: "Solde insuffisant.", success: null });
    }

    // transaction: debit + insert tx
    await db.execute("UPDATE accounts SET balance = balance - ? WHERE id = ?", [
      amount,
      account.id,
    ]);

    await db.execute(
      `INSERT INTO transactions (account_id, type, beneficiary, amount, note)
       VALUES (?, 'transfer', ?, ?, ?)`,
      [account.id, beneficiary, amount, note]
    );

    return res.render("transfer", { error: null, success: "Transfert effectué (simulation)." });
  } catch (err) {
    console.error("Transfer error:", err);
    return res.render("transfer", { error: "Server error.", success: null });
  }
});

// =========================
// GET /messages (protected)
// =========================
router.get("/messages", requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;

    const [rows] = await db.execute(
      `SELECT m.id, m.content, m.created_at, u.email
       FROM messages m
       JOIN users u ON u.id = m.user_id
       WHERE m.user_id = ?
       ORDER BY m.created_at DESC`,
      [userId]
    );

    // mode already injected in res.locals.mode from server.js
    return res.render("messages", { messages: rows });
  } catch (err) {
    console.error("Messages error:", err);
    return res.status(500).send("Server error");
  }
});

// =========================
// POST /messages (protected)
// =========================
router.post("/messages", requireAuth, async (req, res) => {
  const userId = req.session.user.id;
  const content = String(req.body.content || "").trim();

  if (!content) return res.redirect("/messages");

  try {
    await db.execute("INSERT INTO messages (user_id, content) VALUES (?, ?)", [userId, content]);
    return res.redirect("/messages");
  } catch (err) {
    console.error("Post message error:", err);
    return res.status(500).send("Server error");
  }
});

module.exports = router;
