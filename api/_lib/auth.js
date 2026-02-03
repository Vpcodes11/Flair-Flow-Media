import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_PASS_HASH = process.env.ADMIN_PASS_HASH || "";
const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || "";
const ADMIN_JWT_TTL = process.env.ADMIN_JWT_TTL || "12h";

export const loginAdmin = async ({ username, password }) => {
  if (!ADMIN_PASS_HASH || !ADMIN_JWT_SECRET) {
    return { ok: false, error: "Admin not configured." };
  }
  if (username !== ADMIN_USER) {
    return { ok: false, error: "Invalid credentials." };
  }
  const match = await bcrypt.compare(String(password || ""), ADMIN_PASS_HASH);
  if (!match) {
    return { ok: false, error: "Invalid credentials." };
  }
  const token = jwt.sign({ role: "admin" }, ADMIN_JWT_SECRET, {
    expiresIn: ADMIN_JWT_TTL,
  });
  return { ok: true, token };
};

export const getAuthToken = (req) => {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) return null;
  return header.slice(7);
};

export const requireAdmin = (req) => {
  const token = getAuthToken(req);
  if (!token || !ADMIN_JWT_SECRET) return { ok: false };
  try {
    const payload = jwt.verify(token, ADMIN_JWT_SECRET);
    if (payload && payload.role === "admin") {
      return { ok: true, payload };
    }
    return { ok: false };
  } catch (err) {
    return { ok: false };
  }
};
