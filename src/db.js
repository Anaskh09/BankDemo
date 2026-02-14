"use strict";

const mysql = require("mysql2/promise");
const config = require("./config");

const pool = mysql.createPool({
  host: config.db.host,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  port: config.db.port,
  waitForConnections: true,
  connectionLimit: config.db.connectionLimit,
  queueLimit: 0,
});

async function ping() {
  const conn = await pool.getConnection();
  try {
    await conn.ping();
  } finally {
    conn.release();
  }
}

// For VULN mode (raw SQL string)
async function query(sql) {
  return pool.query(sql); // returns [rows, fields]
}

// For SECURE mode (prepared statements)
async function execute(sql, params = []) {
  return pool.execute(sql, params); // returns [rows, fields]
}

module.exports = {
  pool,
  ping,
  query,
  execute,
};
