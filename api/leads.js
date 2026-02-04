import { getSubmissions } from "./_lib/db.js";
import { requireAdmin } from "./_lib/auth.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ ok: false, error: "Method not allowed." });
    return;
  }

  const auth = requireAdmin(req);
  if (!auth.ok) {
    res.status(401).json({ ok: false, error: "Unauthorized" });
    return;
  }

  try {
    const rows = await getSubmissions();
    res.json({ ok: true, rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: "Internal server error." });
  }
}
