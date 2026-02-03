export const verifyTurnstile = async (token, ip) => {
  const secret = process.env.TURNSTILE_SECRET || "";
  if (!secret) return { ok: true };
  if (!token) return { ok: false };
  const body = new URLSearchParams({
    secret,
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
