import { getSubmissions } from "../_lib/db.js";
import { requireAdmin } from "../_lib/auth.js";

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
    res.send(csv);
  } catch (err) {
    res.status(500).json({ ok: false, error: "Internal server error." });
  }
}
