export const validateLead = ({ name, email }) => {
  const trimmedName = String(name || "").trim();
  const trimmedEmail = String(email || "").trim().toLowerCase();
  const emailOk = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(trimmedEmail);

  if (!trimmedName || trimmedName.length > 80) {
    return { ok: false, error: "Please provide a valid name." };
  }
  if (!emailOk || trimmedEmail.length > 120) {
    return { ok: false, error: "Please provide a valid email." };
  }
  return { ok: true, name: trimmedName, email: trimmedEmail };
};
