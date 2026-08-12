// ============================================================
// Jadwal Matrikulasi — rendering logic
// Data ditarik LIVE dari Google Sheets (CSV export) tiap halaman
// dibuka. Update sheet-nya = otomatis update di web, tanpa perlu
// sentuh file ini. Kalau sheet gagal diakses, fallback ke data.json
// (cache terakhir) supaya halaman tetap tampil.
// ============================================================

const SHEET_ID = "1Hq7eqmqmB6APv2zGQknvdbuZW7jbj9oL";
const SHEET_GID = "1868004957";
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${SHEET_GID}`;
const SHEET_EDIT_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit?gid=${SHEET_GID}`;

const DOW_ID = ["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"];
const MON_ID = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
const MONTHS_ID = {
  januari: 1, februari: 2, maret: 3, april: 4, mei: 5, juni: 6,
  juli: 7, agustus: 8, september: 9, oktober: 10, november: 11, desember: 12
};

const BOW_ICON_SVG = `<svg class="bow-icon" style="width:15px;transform:translateY(2px)" viewBox="0 0 40 28" aria-hidden="true">
  <path d="M20 14 C20 14 18 4 8 4 C2 4 0 9 3 13 C6 17 14 16 20 14 Z" fill="var(--ochre)" stroke="var(--ink)" stroke-width="1.3" stroke-linejoin="round"/>
  <path d="M20 14 C20 14 22 4 32 4 C38 4 40 9 37 13 C34 17 26 16 20 14 Z" fill="var(--ochre)" stroke="var(--ink)" stroke-width="1.3" stroke-linejoin="round"/>
  <circle cx="20" cy="14" r="3.2" fill="var(--rose)" stroke="var(--ink)" stroke-width="1.1"/>
</svg>`;

const PIN_ICON_SVG = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2c-4 0-7 3-7 7 0 5.25 7 13 7 13s7-7.75 7-13c0-4-3-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"/></svg>`;

let state = {
  sessions: [],
  meta: {},
  search: ""
};

init();

async function init() {
  let loaded = false;

  try {
    const res = await fetch(CSV_URL, { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const text = await res.text();
    if (!text || /^\s*<(!doctype|html)/i.test(text)) {
      throw new Error("Sheet tidak mengembalikan CSV (mungkin belum di-share publik)");
    }
    const parsed = parseSheet(text);
    if (!parsed.sessions.length) throw new Error("Tidak ada baris jadwal yang terbaca");
    state.meta = parsed.meta;
    state.sessions = parsed.sessions;
    loaded = true;
    setSyncNote(`Data langsung dari Google Sheets · dimuat ${nowLabel()}`);
  } catch (err) {
    console.error("Gagal memuat dari Google Sheets:", err);
  }

  if (!loaded) {
    try {
      const res = await fetch("data.json", { cache: "no-store" });
      const data = await res.json();
      state.meta = data.meta || {};
      state.sessions = data.sessions || [];
      loaded = true;
      setSyncNote(`⚠️ Gagal ambil data live, menampilkan cache terakhir · <a href="${SHEET_EDIT_URL}" target="_blank" rel="noopener">buka sheet</a>`);
    } catch (err2) {
      document.getElementById("list").innerHTML =
        `<div class="empty-state">Gagal memuat jadwal dari Google Sheets maupun cache lokal. Cek koneksi internet atau buka <a href="${SHEET_EDIT_URL}" target="_blank" rel="noopener">sheet-nya langsung</a>.</div>`;
      return;
    }
  }

  applyMeta();
  render();
  bindControls();
}

function nowLabel() {
  const d = new Date();
  return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

function setSyncNote(html) {
  const el = document.getElementById("updated");
  if (el) el.innerHTML = html;
}

// ---------- CSV parsing ----------

function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else { inQuotes = false; }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field); field = "";
    } else if (c === "\r") {
      // skip
    } else if (c === "\n") {
      row.push(field); rows.push(row); row = []; field = "";
    } else {
      field += c;
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

function parseIndoDateToISO(str) {
  if (!str) return null;
  const afterComma = str.includes(",") ? str.split(",")[1].trim() : str.trim();
  const parts = afterComma.split(/\s+/);
  if (parts.length < 3) return null;
  const day = parseInt(parts[0], 10);
  const month = MONTHS_ID[(parts[1] || "").toLowerCase()];
  const year = parseInt(parts[2], 10);
  if (!day || !month || !year) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function dowFromISO(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  return DOW_ID[new Date(y, m - 1, d).getDay()];
}

function parseZoomBlock(text) {
  if (!text || !text.trim()) return null;
  const topicMatch = text.match(/Topic:\s*([\s\S]*?)\s*Time:/);
  const timeMatch = text.match(/Time:\s*([\s\S]*?)\s*Join Zoom Meeting/);
  const joinMatch = text.match(/(https:\/\/zoom\.us\/j\/\S+)/);
  const chatMatch = text.match(/(https:\/\/zoom\.us\/launch\/\S+)/);
  const idMatch = text.match(/Meeting ID:\s*([\d\s]+?)\s*Passcode/);
  const passMatch = text.match(/Passcode:\s*(\S+)/);

  const zoom = {
    topic: topicMatch ? topicMatch[1].trim() : "",
    waktu: timeMatch ? timeMatch[1].trim() : "",
    joinUrl: joinMatch ? joinMatch[1].trim().replace(/[.,]+$/, "") : "",
    chatUrl: chatMatch ? chatMatch[1].trim().replace(/[.,]+$/, "") : "",
    meetingId: idMatch ? idMatch[1].replace(/\s+/g, " ").trim() : "",
    passcode: passMatch ? passMatch[1].trim() : ""
  };
  if (!zoom.topic && !zoom.joinUrl && !zoom.meetingId) return null;
  return zoom;
}

function parseSheet(text) {
  const rows = parseCSV(text);

  const meta = {
    title: (rows[0] && rows[0][2] || "Jadwal Matrikulasi").trim(),
    program: (rows[1] && rows[1][2] || "").trim(),
    fakultas: (rows[2] && rows[2][2] || "").trim(),
    angkatan: (rows[3] && rows[3][2] || "").trim(),
    semester: "",
    passcodeDefault: "Untag178"
  };

  let headerIdx = rows.findIndex((r) => r.some((c) => (c || "").includes("Hari/Tanggal")));
  if (headerIdx === -1) headerIdx = 5;
  const dataRows = rows.slice(headerIdx + 1);

  const sessions = [];
  let currentDate = null;
  let currentSifat = "";
  let lastSession = null;
  let counter = 0;

  for (const r of dataRows) {
    const tanggal = (r[2] || "").trim();
    const jam = (r[3] || "").trim();
    const sifat = (r[4] || "").trim();
    const materi = (r[5] || "").trim();
    const kelas = (r[6] || "").trim();
    const dosen = (r[7] || "").trim();
    const zoomRaw = (r[8] || "").trim();
    const operator = (r[9] || "").trim();

    const rowIsEmpty = !tanggal && !jam && !sifat && !materi && !kelas && !dosen && !zoomRaw && !operator;
    if (rowIsEmpty) continue;

    if (tanggal) currentDate = parseIndoDateToISO(tanggal);
    if (sifat) currentSifat = sifat;

    // lone date row with nothing else filled in = holiday / no-class marker
    if (tanggal && !jam && !materi && !kelas) {
      counter++;
      sessions.push({
        id: "s" + counter, no: counter,
        date: currentDate, day: dowFromISO(currentDate),
        libur: true, keterangan: "LIBUR", kelas: [], zoom: null
      });
      lastSession = null;
      continue;
    }

    const isNewSession = Boolean(jam && materi);
    if (isNewSession) {
      counter++;
      const isLiburMateri = /libur/i.test(materi);
      const s = {
        id: "s" + counter, no: counter,
        date: currentDate, day: dowFromISO(currentDate),
        time: /wib/i.test(jam) ? jam : (jam ? jam + " WIB" : ""),
        sifat: sifat || currentSifat || "Online",
        materi,
        dosen,
        operator,
        libur: isLiburMateri,
        keterangan: isLiburMateri ? materi : undefined,
        kelas: kelas ? [kelas] : [],
        zoom: parseZoomBlock(zoomRaw)
      };
      sessions.push(s);
      lastSession = s;
      continue;
    }

    // continuation row (e.g. the "Kelas B" row under a session that already exists)
    if (kelas && lastSession && !lastSession.libur) {
      if (!lastSession.kelas.includes(kelas)) lastSession.kelas.push(kelas);
    }
  }

  return { meta, sessions };
}

// ---------- meta ----------

function applyMeta() {
  const m = state.meta;
  document.getElementById("eyebrow").textContent =
    [m.fakultas].filter(Boolean).join(" · ") || "Jadwal Kuliah";
  document.title = `${m.title || "Jadwal Matrikulasi"} — ${m.program || ""}`;
  document.getElementById("title").textContent = m.title || "Jadwal Matrikulasi";
  document.getElementById("subtitle").textContent =
    [m.program, m.semester, m.angkatan].filter(Boolean).join(" — ");
}

function bindControls() {
  const search = document.getElementById("search");
  if (search) {
    search.addEventListener("input", (e) => {
      state.search = e.target.value.trim().toLowerCase();
      render();
    });
  }
}

// ---------- date/time helpers ----------

function parseSessionStart(session) {
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
  if (!dateStr) return { dow: "", dom: "--", mon: "" };
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
    el.innerHTML = `<p class="nb-label">${BOW_ICON_SVG} Sesi berikutnya</p><p class="nb-materi">Tidak ada sesi terjadwal lagi.</p>`;
    return;
  }

  const { s } = upcoming[0];
  const day = fmtDay(s.date);
  const kelas = (s.kelas || []).join(" & ");
  const isOffline = (s.sifat || "").toLowerCase() === "offline";
  el.className = "next-banner";
  el.innerHTML = `
    <p class="nb-label">${BOW_ICON_SVG} Sesi berikutnya · ${day.dow}, ${day.dom} ${day.mon}</p>
    <p class="nb-materi">${escapeHtml(s.materi)}</p>
    <div class="nb-meta">
      <span><b>${escapeHtml(s.dosen || "-")}</b></span>
      <span>${escapeHtml(s.time || "")}</span>
      ${kelas ? `<span>Kelas ${escapeHtml(kelas)}</span>` : ""}
      ${isOffline ? `<span class="badge sifat-offline">${PIN_ICON_SVG} Offline</span>` : ""}
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
    if (state.search) {
      if (s.libur) return false;
      const hay = `${s.materi} ${s.dosen}`.toLowerCase();
      if (!hay.includes(state.search)) return false;
    }
    return true;
  });

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
  groups.sort((a, b) => (a.date || "").localeCompare(b.date || ""));

  if (groups.length === 0) {
    list.innerHTML = `<div class="empty-state">Tidak ada jadwal yang cocok dengan pencarian ini.</div>`;
    return;
  }

  list.innerHTML = groups.map((g) => {
    const day = fmtDay(g.date);
    const body = g.items.map((s) => renderSessionOrLibur(s, now)).join("");
    const year = g.date ? g.date.split("-")[0] : "";
    return `
      <div class="day">
        <div class="day-tab">
          <div class="dow">${day.dow}</div>
          <div class="dom">${day.dom}</div>
          <div class="mon">${day.mon} ${year}</div>
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
    return `<div class="libur-row"><span class="label">${BOW_ICON_SVG} ${escapeHtml(s.keterangan || "LIBUR")}</span></div>`;
  }

  const end = parseSessionEnd(s);
  const isPast = end && end < now;
  const isOffline = (s.sifat || "").toLowerCase() === "offline";
  const kelasBadges = (s.kelas || []).map((k) => `<span class="badge kelas">Kelas ${escapeHtml(k)}</span>`).join("");
  const sifatBadge = s.sifat
    ? isOffline
      ? `<span class="badge sifat-offline">${PIN_ICON_SVG} ${escapeHtml(s.sifat)}</span>`
      : `<span class="badge sifat-online">${escapeHtml(s.sifat)}</span>`
    : "";

  return `
    <div class="session${isPast ? " is-past" : ""}${isOffline ? " is-offline" : ""}" id="session-${s.id}">
      <div class="session-top">
        <div>
          <p class="session-materi">${escapeHtml(s.materi)}</p>
          <div class="session-meta">
            <span class="dosen">${escapeHtml(s.dosen || "-")}</span>
            <span>${escapeHtml(s.time || "")}</span>
          </div>
        </div>
        <div class="badges">
          ${sifatBadge}
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
      </div>` : (s.operator ? `<div class="session-detail"><p class="op-tag">Operator: ${escapeHtml(s.operator)}</p></div>` : "")}
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
