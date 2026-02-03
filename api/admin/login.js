import { loginAdmin } from "../_lib/auth.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Method not allowed." });
    return;
  }

  const result = await loginAdmin(req.body || {});
  if (!result.ok) {
    res.status(401).json({ ok: false, error: result.error });
    return;
  }

  res.json({ ok: true, token: result.token });
}
