import nodemailer from "nodemailer";
import sgMail from "@sendgrid/mail";

const EMAIL_PROVIDER = process.env.EMAIL_PROVIDER || "smtp";

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

export const sendEmail = async ({ subject, text }) => {
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
