// ============================================================
// Admin editor — loads data.json, edits in memory, exports
// an updated data.json for you to commit back to GitHub.
// No server, no login: this is a local editing tool only.
// ============================================================

let data = { meta: {}, sessions: [] };

init();

async function init() {
  try {
    const res = await fetch("data.json", { cache: "no-store" });
    data = await res.json();
  } catch (err) {
    data = { meta: { title: "Jadwal Matrikulasi" }, sessions: [] };
  }
  fillMeta();
  renderEntries();
  bindGlobalControls();
}

function fillMeta() {
  document.getElementById("metaTitle").value = data.meta.title || "";
  document.getElementById("metaProgram").value = data.meta.program || "";
  document.getElementById("metaFakultas").value = data.meta.fakultas || "";
  document.getElementById("metaAngkatan").value = data.meta.angkatan || "";
}

function readMeta() {
  data.meta.title = document.getElementById("metaTitle").value;
  data.meta.program = document.getElementById("metaProgram").value;
  data.meta.fakultas = document.getElementById("metaFakultas").value;
  data.meta.angkatan = document.getElementById("metaAngkatan").value;
}

function bindGlobalControls() {
  document.getElementById("btnAdd").addEventListener("click", addEntry);
  document.getElementById("btnAdd2").addEventListener("click", addEntry);
  document.getElementById("btnDownload").addEventListener("click", downloadJson);
  document.getElementById("btnUpload").addEventListener("click", () => {
    document.getElementById("fileInput").click();
  });
  document.getElementById("fileInput").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    try {
      data = JSON.parse(text);
      fillMeta();
      renderEntries();
      showToast("File dimuat.");
    } catch (err) {
      showToast("File JSON tidak valid.");
    }
  });
}

function addEntry() {
  const newId = "s" + Math.random().toString(36).slice(2, 8);
  data.sessions.push({
    id: newId,
    no: data.sessions.length + 1,
    date: "",
    day: "",
    time: "",
    sifat: "Online",
    materi: "",
    dosen: "",
    operator: "",
    libur: false,
    kelas: ["A", "B"],
    zoom: { topic: "", waktu: "", joinUrl: "", chatUrl: "", meetingId: "", passcode: "Untag178" }
  });
  renderEntries();
  document.getElementById(`entry-${newId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
}

function removeEntry(id) {
  if (!confirm("Hapus sesi ini?")) return;
  data.sessions = data.sessions.filter((s) => s.id !== id);
  renderEntries();
}

function moveEntry(id, dir) {
  const idx = data.sessions.findIndex((s) => s.id === id);
  const newIdx = idx + dir;
  if (newIdx < 0 || newIdx >= data.sessions.length) return;
  const [item] = data.sessions.splice(idx, 1);
  data.sessions.splice(newIdx, 0, item);
  renderEntries();
}

const DOW_ID = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

function dayNameFromDate(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return "";
  return DOW_ID[new Date(y, m - 1, d).getDay()];
}

function renderEntries() {
  const container = document.getElementById("entries");
  container.innerHTML = data.sessions.map((s, i) => entryTemplate(s, i)).join("");

  data.sessions.forEach((s) => {
    const el = document.getElementById(`entry-${s.id}`);
    if (!el) return;

    el.querySelector(".f-libur").addEventListener("change", (e) => {
      s.libur = e.target.checked;
      el.classList.toggle("is-libur", s.libur);
    });
    el.querySelector(".f-date").addEventListener("input", (e) => {
      s.date = e.target.value;
      s.day = dayNameFromDate(s.date);
    });
    el.querySelector(".f-time").addEventListener("input", (e) => (s.time = e.target.value));
    el.querySelector(".f-sifat").addEventListener("input", (e) => (s.sifat = e.target.value));
    el.querySelector(".f-materi").addEventListener("input", (e) => (s.materi = e.target.value));
    el.querySelector(".f-dosen").addEventListener("input", (e) => (s.dosen = e.target.value));
    el.querySelector(".f-operator").addEventListener("input", (e) => (s.operator = e.target.value));

    el.querySelectorAll(".f-kelas").forEach((cb) => {
      cb.addEventListener("change", () => {
        const checked = Array.from(el.querySelectorAll(".f-kelas:checked")).map((c) => c.value);
        s.kelas = checked;
      });
    });

    if (!s.zoom) s.zoom = { topic: "", waktu: "", joinUrl: "", chatUrl: "", meetingId: "", passcode: "Untag178" };
    el.querySelector(".f-zoom-topic").addEventListener("input", (e) => (s.zoom.topic = e.target.value));
    el.querySelector(".f-zoom-waktu").addEventListener("input", (e) => (s.zoom.waktu = e.target.value));
    el.querySelector(".f-zoom-join").addEventListener("input", (e) => (s.zoom.joinUrl = e.target.value));
    el.querySelector(".f-zoom-chat").addEventListener("input", (e) => (s.zoom.chatUrl = e.target.value));
    el.querySelector(".f-zoom-id").addEventListener("input", (e) => (s.zoom.meetingId = e.target.value));
    el.querySelector(".f-zoom-pass").addEventListener("input", (e) => (s.zoom.passcode = e.target.value));

    el.querySelector(".f-up").addEventListener("click", () => moveEntry(s.id, -1));
    el.querySelector(".f-down").addEventListener("click", () => moveEntry(s.id, 1));
    el.querySelector(".f-remove").addEventListener("click", () => removeEntry(s.id));
  });
}

function entryTemplate(s, i) {
  const z = s.zoom || {};
  return `
  <div class="entry${s.libur ? " is-libur" : ""}" id="entry-${s.id}">
    <div class="entry-head">
      <span class="tag">Sesi ${i + 1}${s.date ? " · " + s.date : ""}</span>
      <div class="row-flex">
        <button class="btn btn-ghost btn-small f-up" style="border-color:var(--line);color:var(--ink)" title="Naik">↑</button>
        <button class="btn btn-ghost btn-small f-down" style="border-color:var(--line);color:var(--ink)" title="Turun">↓</button>
        <button class="btn btn-danger btn-small f-remove">Hapus</button>
      </div>
    </div>

    <div class="libur-toggle">
      <input type="checkbox" id="libur-${s.id}" class="f-libur" ${s.libur ? "checked" : ""}>
      <label for="libur-${s.id}">Tandai sebagai hari libur (tanpa sesi)</label>
    </div>

    <div class="grid3">
      <div><label>Tanggal</label><input type="date" class="f-date" value="${s.date || ""}"></div>
      <div><label>Jam</label><input type="text" class="f-time" value="${escapeAttr(s.time)}" placeholder="18.30 - 21.30 WIB"></div>
      <div><label>Sifat perkuliahan</label><input type="text" class="f-sifat" value="${escapeAttr(s.sifat)}" placeholder="Online"></div>
    </div>

    <div class="fields-normal">
      <div class="grid2">
        <div><label>Materi</label><input type="text" class="f-materi" value="${escapeAttr(s.materi)}"></div>
        <div><label>Dosen</label><input type="text" class="f-dosen" value="${escapeAttr(s.dosen)}"></div>
      </div>

      <div class="kelas-toggle">
        <label class="pill"><input type="checkbox" class="f-kelas" value="A" ${(s.kelas || []).includes("A") ? "checked" : ""}> Kelas A</label>
        <label class="pill"><input type="checkbox" class="f-kelas" value="B" ${(s.kelas || []).includes("B") ? "checked" : ""}> Kelas B</label>
      </div>

      <div><label>Operator</label><input type="text" class="f-operator" value="${escapeAttr(s.operator)}"></div>

      <fieldset>
        <legend>Info Zoom</legend>
        <div class="grid2">
          <div><label>Topic</label><input type="text" class="f-zoom-topic" value="${escapeAttr(z.topic)}"></div>
          <div><label>Waktu (tampilan Zoom)</label><input type="text" class="f-zoom-waktu" value="${escapeAttr(z.waktu)}"></div>
        </div>
        <label>Join URL</label><input type="text" class="f-zoom-join" value="${escapeAttr(z.joinUrl)}">
        <label>Chat link</label><input type="text" class="f-zoom-chat" value="${escapeAttr(z.chatUrl)}">
        <div class="grid2">
          <div><label>Meeting ID</label><input type="text" class="f-zoom-id" value="${escapeAttr(z.meetingId)}"></div>
          <div><label>Passcode</label><input type="text" class="f-zoom-pass" value="${escapeAttr(z.passcode)}"></div>
        </div>
      </fieldset>
    </div>
  </div>`;
}

function downloadJson() {
  readMeta();
  data.sessions.forEach((s, i) => (s.no = i + 1));
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "data.json";
  a.click();
  URL.revokeObjectURL(url);
  showToast("data.json diunduh. Timpa file lama di repo lalu commit & push.");
}

function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2600);
}

function escapeAttr(str) {
  if (str === undefined || str === null) return "";
  return String(str).replaceAll('"', "&quot;");
}
