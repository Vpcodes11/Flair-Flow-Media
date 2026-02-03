import { Pool } from "pg";

const getPool = () => {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL not set.");
  }
  if (!global.__pgPool) {
    global.__pgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
    });
  }
  return global.__pgPool;
};

export const ensureTable = async () => {
  const pool = getPool();
  await pool.query(
    `CREATE TABLE IF NOT EXISTS submissions (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`
  );
};

export const insertSubmission = async (name, email) => {
  const pool = getPool();
  await ensureTable();
  await pool.query("INSERT INTO submissions (name, email) VALUES ($1, $2)", [
    name,
    email,
  ]);
};

export const getSubmissions = async () => {
  const pool = getPool();
  await ensureTable();
  const { rows } = await pool.query(
    "SELECT id, name, email, created_at FROM submissions ORDER BY created_at DESC"
  );
  return rows;
};
