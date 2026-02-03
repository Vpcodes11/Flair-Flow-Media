import express from "express";
import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";
import session from "express-session";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import morgan from "morgan";
import sqlite3 from "sqlite3";
import nodemailer from "nodemailer";
import sgMail from "@sendgrid/mail";
import { Pool } from "pg";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_PASS_HASH = process.env.ADMIN_PASS_HASH || "";
const SESSION_SECRET = process.env.SESSION_SECRET || "change_me";
const DATABASE_URL = process.env.DATABASE_URL || "";
const EMAIL_PROVIDER = process.env.EMAIL_PROVIDER || "smtp";
const TURNSTILE_SECRET = process.env.TURNSTILE_SECRET || "";
const SENTRY_DSN = process.env.SENTRY_DSN || "";

const db = DATABASE_URL
  ? {
      type: "pg",
      pool: new Pool({
        connectionString: DATABASE_URL,
        ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
      }),
    }
  : {
      type: "sqlite",
      conn: new sqlite3.Database(path.join(__dirname, "submissions.db")),
    };

const initDb = async () => {
  if (db.type === "pg") {
    await db.pool.query(
      `CREATE TABLE IF NOT EXISTS submissions (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    );
    return;
  }
  db.conn.serialize(() => {
    db.conn.run(
      `CREATE TABLE IF NOT EXISTS submissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`
    );
  });
};

await initDb();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(helmet({ contentSecurityPolicy: false }));
app.use(morgan("combined"));
app.use(express.static(__dirname));

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    integrations: [nodeProfilingIntegration()],
    tracesSampleRate: 0.1,
    profilesSampleRate: 0.1,
  });
  app.use(Sentry.Handlers.requestHandler());
  app.use(Sentry.Handlers.tracingHandler());
}
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    },
  })
);

const smtpReady =
  process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;

const transporter = smtpReady
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  : null;

if (EMAIL_PROVIDER === "sendgrid" && process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

const sendEmail = async ({ subject, text }) => {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const to = process.env.SMTP_TO || process.env.SMTP_USER;

  if (EMAIL_PROVIDER === "sendgrid" && process.env.SENDGRID_API_KEY) {
    await sgMail.send({ to, from, subject, text });
    return { ok: true };
  }

  if (transporter) {
    await transporter.sendMail({ from, to, subject, text });
    return { ok: true };
  }

  return { ok: false, warning: "Email provider not configured." };
};

const insertSubmission = async (name, email) => {
  if (db.type === "pg") {
    await db.pool.query("INSERT INTO submissions (name, email) VALUES ($1, $2)", [
      name,
      email,
    ]);
    return;
  }
  await new Promise((resolve, reject) => {
    const stmt = db.conn.prepare(
      "INSERT INTO submissions (name, email) VALUES (?, ?)"
    );
    stmt.run(name, email, (err) => {
      if (err) return reject(err);
      return resolve();
    });
  });
};

const getSubmissions = async () => {
  if (db.type === "pg") {
    const { rows } = await db.pool.query(
      "SELECT id, name, email, created_at FROM submissions ORDER BY created_at DESC"
    );
    return rows;
  }
  return new Promise((resolve, reject) => {
    db.conn.all(
      "SELECT id, name, email, created_at FROM submissions ORDER BY created_at DESC",
      (err, rows) => {
        if (err) return reject(err);
        return resolve(rows);
      }
    );
  });
};

const validateLead = ({ name, email }) => {
  const trimmedName = String(name || "").trim();
  const trimmedEmail = String(email || "").trim().toLowerCase();
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail);

  if (!trimmedName || trimmedName.length > 80) {
    return { ok: false, error: "Please provide a valid name." };
  }
  if (!emailOk || trimmedEmail.length > 120) {
    return { ok: false, error: "Please provide a valid email." };
  }
  return { ok: true, name: trimmedName, email: trimmedEmail };
};

const verifyTurnstile = async (token, ip) => {
  if (!TURNSTILE_SECRET) return { ok: true };
  if (!token) return { ok: false };
  const body = new URLSearchParams({
    secret: TURNSTILE_SECRET,
    response: token,
  });
  if (ip) body.append("remoteip", ip);
  const res = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      body,
    }
  );
  const data = await res.json();
  return { ok: Boolean(data.success) };
};

const leadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

const requireAdmin = (req, res, next) => {
  if (req.session && req.session.isAdmin) return next();
  return res.status(401).json({ ok: false, error: "Unauthorized" });
};

app.post("/api/lead", leadLimiter, async (req, res, next) => {
  if (req.body && req.body.website) {
    return res.json({ ok: true });
  }
  const validated = validateLead(req.body || {});
  if (!validated.ok) {
    return res.status(400).json({ ok: false, error: validated.error });
  }
  try {
    const turnstile = await verifyTurnstile(
      req.body["cf-turnstile-response"],
      req.ip
    );
    if (!turnstile.ok) {
      return res.status(400).json({ ok: false, error: "Captcha failed." });
    }
  } catch (err) {
    return next(err);
  }
  const { name, email } = validated;

  try {
    await insertSubmission(name, email);
    const mailResult = await sendEmail({
      subject: "New Flair Flow Media lead",
      text: `Name: ${name}\nEmail: ${email}\n`,
    });
    if (!mailResult.ok) {
      return res.status(200).json({
        ok: true,
        warning: "Saved, but email failed to send.",
      });
    }
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
});

app.get("/api/health", (req, res) => {
  res.json({ ok: true, uptime: process.uptime() });
});

app.get("/api/leads", requireAdmin, async (req, res, next) => {
  try {
    const rows = await getSubmissions();
    return res.json({ ok: true, rows });
  } catch (err) {
    return next(err);
  }
});

app.get("/api/leads/export", requireAdmin, async (req, res, next) => {
  try {
    const rows = await getSubmissions();
    const header = "id,name,email,created_at";
    const lines = rows.map(
      (row) =>
        `${row.id},"${String(row.name).replaceAll('"', '""')}","${String(
          row.email
        ).replaceAll('"', '""')}",${row.created_at}`
    );
    const csv = [header, ...lines].join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=leads.csv");
    return res.send(csv);
  } catch (err) {
    return next(err);
  }
});

app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "admin.html"));
});

app.post("/admin/login", async (req, res) => {
  const { username, password } = req.body || {};
  if (!ADMIN_PASS_HASH) {
    return res.status(500).json({ ok: false, error: "Admin not configured." });
  }
  if (username !== ADMIN_USER) {
    return res.status(401).json({ ok: false, error: "Invalid credentials." });
  }
  const match = await bcrypt.compare(String(password || ""), ADMIN_PASS_HASH);
  if (!match) {
    return res.status(401).json({ ok: false, error: "Invalid credentials." });
  }
  req.session.isAdmin = true;
  return res.json({ ok: true });
});

app.post("/admin/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

if (SENTRY_DSN) {
  app.use(Sentry.Handlers.errorHandler());
}

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ ok: false, error: "Internal server error." });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
