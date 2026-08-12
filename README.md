# Jadwal Matrikulasi — Profesi Psikologi Untag Surabaya

Website statis (HTML/CSS/JS) yang menampilkan jadwal matrikulasi **langsung dari Google Sheets**.
Begitu jadwal diupdate di spreadsheet, website otomatis ikut berubah — tanpa perlu upload ulang
apa pun ke GitHub.

## Cara kerjanya

`script.js` mengambil data dari link CSV export Google Sheets setiap kali halaman `index.html`
dibuka (bukan cuma sekali waktu di-deploy). Karena itu:

- **Update jadwal** = cukup edit langsung di Google Sheets-nya. Simpan otomatis di Sheets → refresh
  halaman web → langsung berubah. Tidak perlu commit/push apa pun ke GitHub.
- Sheet yang dipakai: `https://docs.google.com/spreadsheets/d/1Hq7eqmqmB6APv2zGQknvdbuZW7jbj9oL/edit?gid=1868004957`
- Kalau Google Sheets gagal diakses (misalnya sharing setting berubah, atau lagi ada gangguan),
  halaman otomatis jatuh ke `data.json` (cache/cadangan terakhir) supaya tetap ada yang tampil.

## ⚠️ Syarat penting: sharing harus "Anyone with the link"

Supaya website bisa membaca sheet-nya, sharing setting di Google Sheets **harus** diset ke
**"Anyone with the link – Viewer"** (bukan "Restricted"). Cara cek/ubah:

1. Buka sheet-nya → tombol **Share** (kanan atas).
2. Pastikan "General access" = **Anyone with the link**, role **Viewer**.
3. Kalau di-set ke "Restricted", website nggak akan bisa ambil datanya (otomatis fallback ke cache).

## Format spreadsheet yang dibaca

Sheet dibaca apa adanya sesuai struktur yang sudah ada sekarang:

- Baris 1–4 (kolom C): judul, program, fakultas, angkatan — otomatis dipakai jadi judul halaman.
- Baris 6: header tabel (`NO`, `Hari/Tanggal`, `Jam Perkuliahan`, `SIfat Perkuliahan`, `Materi`, `Kelas`, `Dosen`, `ZOOM`, `Operator`).
- Baris data: satu baris = satu sesi. Kalau ada Kelas A & B, baris kedua cukup isi kolom `Kelas`
  saja (baris lain dikosongkan) — sama seperti pola sekarang.
- Kalau dalam satu hari ada 2 sesi (misal WISC pagi + WAIS sore), baris kedua cukup isi
  `Jam Perkuliahan` + `Materi` (+ `Dosen` kalau ada) — tanggal boleh dikosongkan, otomatis
  dianggap tanggal yang sama dengan baris sebelumnya.
- Baris dengan **hanya** tanggal terisi (semua kolom lain kosong) otomatis dianggap **hari libur**.
- Kalau kolom `Materi` mengandung kata "libur" (contoh: "LIBUR HUT KEMERDEKAAN"), baris itu juga
  otomatis ditampilkan sebagai badge libur dengan keterangan tersebut.
- Kolom `ZOOM` bisa diisi teks undangan Zoom lengkap (hasil copy-paste dari Zoom) — link Join,
  Meeting ID, dan Passcode-nya otomatis terbaca dan ditampilkan rapi di kartu sesi.
- `Sifat Perkuliahan` = **Offline** akan otomatis dikasih tampilan beda (badge merah + aksen di
  kartu) supaya gampang dibedakan dari sesi online.

## Ganti ke sheet/tab lain

Kalau nanti pindah ke spreadsheet lain atau tab (gid) lain, tinggal edit 2 baris di atas `script.js`:

```js
const SHEET_ID = "1Hq7eqmqmB6APv2zGQknvdbuZW7jbj9oL";
const SHEET_GID = "1868004957";
```

`SHEET_ID` ada di URL sheet (`.../d/SHEET_ID/edit...`), `SHEET_GID` ada di bagian `#gid=...` saat
tab yang dimaksud sedang aktif/dibuka.

## Isi folder

- `index.html` — halaman jadwal utama (yang dilihat mahasiswa), narik data live dari Google Sheets
- `admin.html` + `admin.js` — editor **cadangan**, cuma dipakai untuk memperbarui `data.json`
  (cache fallback), bukan sumber utama lagi
- `style.css` — tampilan/desain
- `script.js` — fetch + parsing CSV dari Google Sheets, render jadwal, cari sesi berikutnya, dll
- `data.json` — cache/cadangan, dipakai otomatis kalau Google Sheets gagal diakses
- `favicon.ico`, `logo_untag.png` — logo Untag Surabaya

## Deploy ke GitHub Pages

1. Buat repository baru di GitHub, misalnya `jadwal-matrikulasi`.
2. Upload semua file di folder ini ke repo tersebut.
3. **Settings → Pages** → Source: branch `main`, folder `/ (root)` → **Save**.
4. Tunggu 1–2 menit, dapat URL seperti `https://namakamu.github.io/jadwal-matrikulasi/`.
5. Bagikan link itu ke teman-teman sekelas.

Setelah deploy, kamu **tidak perlu upload ulang** file apa pun lagi setiap kali jadwal berubah —
cukup edit di Google Sheets.

## Memperbarui cache cadangan (opsional tapi disarankan)

Sesekali (misalnya tiap ganti minggu), ada baiknya perbarui `data.json` supaya kalau suatu saat
Google Sheets gagal diakses, cache-nya tidak terlalu basi:

1. Buka `admin.html`, klik **"Muat ulang dari file…"** kalau mau mulai dari `data.json` yang ada,
   atau edit manual sesuai jadwal terbaru.
2. Klik **"⬇ Unduh data.json"**.
3. Timpa file `data.json` di repo GitHub, commit.

## Menjalankan lokal (opsional)

```bash
python3 -m http.server 8000
```

Lalu buka `http://localhost:8000`. (Perlu koneksi internet karena tetap fetch ke Google Sheets.)
