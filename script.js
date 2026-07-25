// ============================================================
// Jadwal Matrikulasi — rendering logic
// Reads everything from data.json, so updating the schedule
// never requires touching this file.
// ============================================================

const DOW_ID = ["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"];
const MON_ID = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];

let state = {
  sessions: [],
  meta: {},
  kelasFilter: "all",
  search: ""
};

init();

async function init() {
  try {
    const res = await fetch("data.json", { cache: "no-store" });
    const data = await res.json();
    state.meta = data.meta || {};
    state.sessions = data.sessions || [];
    applyMeta();
    render();
    bindControls();
  } catch (err) {
    document.getElementById("list").innerHTML =
      `<div class="empty-state">Gagal memuat data.json. Pastikan file ada di folder yang sama dengan index.html.</div>`;
    console.error(err);
  }
}

function applyMeta() {
  const m = state.meta;
  document.getElementById("eyebrow").textContent =
    [m.fakultas].filter(Boolean).join(" · ") || "Jadwal Kuliah";
  document.title = `${m.title || "Jadwal Matrikulasi"} — ${m.program || ""}`;
  document.getElementById("title").textContent = m.title || "Jadwal Matrikulasi";
  document.getElementById("subtitle").textContent =
    [m.program, m.angkatan].filter(Boolean).join(" — ");
}

function bindControls() {
  document.getElementById("search").addEventListener("input", (e) => {
    state.search = e.target.value.trim().toLowerCase();
    render();
  });

  document.querySelectorAll(".chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      document.querySelectorAll(".chip").forEach((c) => c.setAttribute("aria-pressed", "false"));
      chip.setAttribute("aria-pressed", "true");
      state.kelasFilter = chip.dataset.kelas;
      render();
    });
  });
}

// ---------- date/time helpers ----------

function parseSessionStart(session) {
  // date: "2026-07-26", time: "13.00 - 16.00 WIB"
  if (!session.date) return null;
  const [y, m, d] = session.date.split("-").map(Number);
  let hh = 0, mm = 0;
  if (session.time) {
    const match = session.time.match(/(\d{1,2})[.:](\d{2})/);
    if (match) { hh = Number(match[1]); mm = Number(match[2]); }
  }
  return new Date(y, m - 1, d, hh, mm);
}

function parseSessionEnd(session) {
  const start = parseSessionStart(session);
  if (!start || !session.time) return start;
  const parts = session.time.match(/(\d{1,2})[.:](\d{2})\s*-\s*(\d{1,2})[.:](\d{2})/);
  if (!parts) return start;
  const end = new Date(start);
  end.setHours(Number(parts[3]), Number(parts[4]), 0, 0);
  return end;
}

function fmtDay(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return { dow: DOW_ID[dt.getDay()], dom: String(d).padStart(2, "0"), mon: MON_ID[m - 1] };
}

// ---------- rendering ----------

function render() {
  renderNextBanner();
  renderList();
}

function renderNextBanner() {
  const now = new Date();
  const upcoming = state.sessions
    .filter((s) => !s.libur)
    .map((s) => ({ s, end: parseSessionEnd(s) }))
    .filter((x) => x.end && x.end >= now)
    .sort((a, b) => a.end - b.end);

  const el = document.getElementById("nextBanner");

  if (upcoming.length === 0) {
    el.className = "next-banner is-empty";
    el.innerHTML = `<p class="nb-label">Sesi berikutnya</p><p class="nb-materi">Tidak ada sesi terjadwal lagi.</p>`;
    return;
  }

  const { s } = upcoming[0];
  const day = fmtDay(s.date);
  const kelas = (s.kelas || []).join(" & ");
  el.className = "next-banner";
  el.innerHTML = `
    <p class="nb-label">Sesi berikutnya · ${day.dow}, ${day.dom} ${day.mon}</p>
    <p class="nb-materi">${escapeHtml(s.materi)}</p>
    <div class="nb-meta">
      <span><b>${escapeHtml(s.dosen || "-")}</b></span>
      <span>${escapeHtml(s.time || "")}</span>
      ${kelas ? `<span>Kelas ${escapeHtml(kelas)}</span>` : ""}
    </div>
    <div class="nb-actions">
      ${s.zoom?.joinUrl ? `<a class="btn btn-primary" href="${s.zoom.joinUrl}" target="_blank" rel="noopener">Join Zoom</a>` : ""}
      <button class="btn btn-ghost" data-scroll-to="${s.id}">Lihat detail</button>
    </div>
  `;
  el.querySelector("[data-scroll-to]")?.addEventListener("click", () => {
    const target = document.getElementById(`session-${s.id}`);
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
    target?.classList.add("is-open");
  });
}

function renderList() {
  const list = document.getElementById("list");
  const now = new Date();

  const filtered = state.sessions.filter((s) => {
    if (state.kelasFilter !== "all" && !s.libur) {
      if (!(s.kelas || []).includes(state.kelasFilter)) return false;
    }
    if (state.search) {
      const hay = `${s.materi} ${s.dosen}`.toLowerCase();
      if (!hay.includes(state.search) && !s.libur) return false;
      if (s.libur) return false; // libur rows don't match text search
    }
    return true;
  });

  // group by date, preserving order of first appearance
  const groups = [];
  const byDate = new Map();
  for (const s of filtered) {
    if (!byDate.has(s.date)) {
      const g = { date: s.date, items: [] };
      byDate.set(s.date, g);
      groups.push(g);
    }
    byDate.get(s.date).items.push(s);
  }

  if (groups.length === 0) {
    list.innerHTML = `<div class="empty-state">Tidak ada jadwal yang cocok dengan pencarian/filter ini.</div>`;
    return;
  }

  list.innerHTML = groups.map((g) => {
    const day = fmtDay(g.date);
    const body = g.items.map((s) => renderSessionOrLibur(s, now)).join("");
    return `
      <div class="day">
        <div class="day-tab">
          <div class="dow">${day.dow}</div>
          <div class="dom">${day.dom}</div>
          <div class="mon">${day.mon} 2026</div>
        </div>
        <div class="day-sessions">${body}</div>
      </div>
    `;
  }).join("");

  list.querySelectorAll(".session-top").forEach((top) => {
    top.addEventListener("click", () => {
      top.closest(".session").classList.toggle("is-open");
    });
  });
}

function renderSessionOrLibur(s, now) {
  if (s.libur) {
    return `<div class="libur-row"><span class="label">LIBUR</span></div>`;
  }

  const end = parseSessionEnd(s);
  const isPast = end && end < now;
  const kelasBadges = (s.kelas || []).map((k) => `<span class="badge kelas">Kelas ${escapeHtml(k)}</span>`).join("");

  return `
    <div class="session${isPast ? " is-past" : ""}" id="session-${s.id}">
      <div class="session-top">
        <div>
          <p class="session-materi">${escapeHtml(s.materi)}</p>
          <div class="session-meta">
            <span class="dosen">${escapeHtml(s.dosen || "-")}</span>
            <span>${escapeHtml(s.time || "")}</span>
            <span>${escapeHtml(s.sifat || "")}</span>
          </div>
        </div>
        <div class="badges">
          ${kelasBadges}
          <span class="chevron">›</span>
        </div>
      </div>
      ${s.zoom ? `
      <div class="session-detail">
        <div class="zoom-row"><span class="k">Topic</span><span class="v">${escapeHtml(s.zoom.topic || "")}</span></div>
        <div class="zoom-row"><span class="k">Meeting ID</span><span class="v">${escapeHtml(s.zoom.meetingId || "")}</span></div>
        <div class="zoom-row"><span class="k">Passcode</span><span class="v">${escapeHtml(s.zoom.passcode || "")}</span></div>
        <div class="detail-actions">
          ${s.zoom.joinUrl ? `<a class="btn btn-primary" href="${s.zoom.joinUrl}" target="_blank" rel="noopener" onclick="event.stopPropagation()">Join Zoom</a>` : ""}
          ${s.zoom.chatUrl ? `<a class="btn btn-ghost" style="border-color:var(--line);color:var(--ink-soft)" href="${s.zoom.chatUrl}" target="_blank" rel="noopener" onclick="event.stopPropagation()">Chat link</a>` : ""}
        </div>
        ${s.operator ? `<p class="op-tag">Operator: ${escapeHtml(s.operator)}</p>` : ""}
      </div>` : ""}
    </div>
  `;
}

function escapeHtml(str) {
  if (str === undefined || str === null) return "";
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
