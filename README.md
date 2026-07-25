# Jadwal Matrikulasi — Profesi Psikologi Untag Surabaya

Website statis (HTML/CSS/JS) untuk menampilkan jadwal matrikulasi. Bisa dihosting gratis di GitHub Pages.

## Isi folder

- `index.html` — halaman jadwal utama (yang dilihat mahasiswa)
- `admin.html` — halaman editor untuk mengubah jadwal
- `style.css` — tampilan/desain
- `script.js` — logika halaman utama (baca `data.json`, tampilkan sesi berikutnya, filter kelas, pencarian)
- `admin.js` — logika halaman editor
- `data.json` — **satu-satunya file yang perlu kamu ubah untuk update jadwal**

## Cara deploy ke GitHub Pages

1. Buat repository baru di GitHub, misalnya `jadwal-matrikulasi`.
2. Upload semua file di folder ini ke repo tersebut (drag & drop lewat web GitHub, atau `git push`).
3. Buka **Settings → Pages** di repo tersebut.
4. Di bagian **Source**, pilih branch `main` dan folder `/ (root)`, lalu **Save**.
5. Tunggu 1–2 menit, GitHub akan memberi URL seperti:
   `https://namakamu.github.io/jadwal-matrikulasi/`
6. Bagikan link itu ke teman-teman sekelas.

## Cara update jadwal di kemudian hari

Ada dua cara:

### Cara 1 — Pakai halaman Editor (paling gampang, tanpa coding)

1. Buka `admin.html` di browser (bisa langsung dari komputer, atau dari
   `https://namakamu.github.io/jadwal-matrikulasi/admin.html` setelah di-deploy).
2. Tambah/ubah/hapus sesi lewat form.
3. Klik **"⬇ Unduh data.json"** — file baru akan terunduh ke komputer kamu.
4. Buka repo GitHub kamu, masuk ke file `data.json`, klik ikon pensil (edit),
   hapus isinya, lalu tempel isi file `data.json` yang baru diunduh.
5. Klik **Commit changes**. Halaman `index.html` otomatis memakai data terbaru
   (tunggu ~1 menit setelah commit).

> Catatan: `admin.html` tidak menyimpan apa pun secara otomatis ke server —
> ini murni alat bantu untuk *menghasilkan* file `data.json` baru yang perlu
> kamu commit sendiri ke GitHub. Ini karena GitHub Pages adalah hosting statis
> (tidak ada database/server di baliknya).

### Cara 2 — Edit `data.json` langsung

Buka `data.json` di GitHub (atau editor teks apa pun) dan ubah struktur seperti ini:

```json
{
  "id": "s10",
  "no": 10,
  "date": "2026-08-03",
  "day": "Senin",
  "time": "18.30 - 21.30 WIB",
  "sifat": "Online",
  "materi": "Nama Materi",
  "dosen": "Nama Dosen",
  "operator": "nama_operator",
  "libur": false,
  "kelas": ["A", "B"],
  "zoom": {
    "topic": "Judul meeting",
    "waktu": "Aug 3, 2026 06:30 PM Jakarta",
    "joinUrl": "https://zoom.us/j/xxxxxxxxxx?pwd=xxxxx",
    "chatUrl": "https://zoom.us/launch/jc/xxxxxxxxxx",
    "meetingId": "xxx xxxx xxxx",
    "passcode": "Untag178"
  }
}
```

Untuk hari libur, cukup pakai:

```json
{
  "id": "s11",
  "no": 11,
  "date": "2026-08-04",
  "day": "Selasa",
  "libur": true,
  "kelas": [],
  "zoom": null
}
```

Tambahkan objek baru ke dalam array `"sessions": [ ... ]`, simpan, commit — selesai.

## Menjalankan lokal (opsional, sebelum upload ke GitHub)

Karena halaman ini memuat `data.json` lewat `fetch()`, membuka `index.html`
langsung lewat `file://` di sebagian browser bisa diblokir (CORS). Jalankan
server lokal sederhana dari dalam folder ini:

```bash
python3 -m http.server 8000
```

Lalu buka `http://localhost:8000` di browser.
