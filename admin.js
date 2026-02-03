const loginForm = document.getElementById("login-form");
const refreshBtn = document.getElementById("refresh");
const exportLink = document.getElementById("export");
const logoutBtn = document.getElementById("logout");
const rowsWrap = document.getElementById("rows");

const formatDate = (value) => new Date(value).toLocaleString();

const setUnlocked = (isUnlocked) => {
  refreshBtn.disabled = !isUnlocked;
  exportLink.classList.toggle("disabled", !isUnlocked);
  logoutBtn.disabled = !isUnlocked;
};

const renderRows = (rows) => {
  rowsWrap.innerHTML = "";
  if (!rows.length) {
    rowsWrap.innerHTML = `<div class="row"><span>No leads yet.</span></div>`;
    return;
  }
  rows.forEach((row) => {
    const div = document.createElement("div");
    div.className = "row";
    div.innerHTML = `
      <span>${row.id}</span>
      <span>${row.name}</span>
      <span>${row.email}</span>
      <span>${formatDate(row.created_at)}</span>
    `;
    rowsWrap.appendChild(div);
  });
};

const loadLeads = async () => {
  const res = await fetch("/api/leads");
  if (!res.ok) {
    setUnlocked(false);
    renderRows([]);
    return;
  }
  const data = await res.json();
  setUnlocked(true);
  renderRows(data.rows || []);
  exportLink.href = "/api/leads/export";
};

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(loginForm);
  const payload = Object.fromEntries(formData.entries());
  const res = await fetch("/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    renderRows([]);
    setUnlocked(false);
    return;
  }
  loadLeads();
});

refreshBtn.addEventListener("click", () => {
  loadLeads();
});

logoutBtn.addEventListener("click", async () => {
  await fetch("/admin/logout", { method: "POST" });
  setUnlocked(false);
  renderRows([]);
});

loadLeads();
