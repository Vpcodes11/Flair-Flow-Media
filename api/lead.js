import { validateLead } from "./_lib/validate.js";
import { insertSubmission } from "./_lib/db.js";
import { sendEmail } from "./_lib/email.js";
import { verifyTurnstile } from "./_lib/turnstile.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Method not allowed." });
    return;
  }

  if (req.body && req.body.website) {
    res.json({ ok: true });
    return;
  }

  const validated = validateLead(req.body || {});
  if (!validated.ok) {
    res.status(400).json({ ok: false, error: validated.error });
    return;
  }

  const turnstile = await verifyTurnstile(
    req.body["cf-turnstile-response"],
    req.headers["x-forwarded-for"]
  );
  if (!turnstile.ok) {
    res.status(400).json({ ok: false, error: "Captcha failed." });
    return;
  }

  try {
    await insertSubmission(validated.name, validated.email);
    const mailResult = await sendEmail({
      subject: "New Flair Flow Media lead",
      text: `Name: ${validated.name}\nEmail: ${validated.email}\n`,
    });
    if (!mailResult.ok) {
      res.status(200).json({
        ok: true,
        warning: "Saved, but email failed to send.",
      });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: "Internal server error." });
  }
}
