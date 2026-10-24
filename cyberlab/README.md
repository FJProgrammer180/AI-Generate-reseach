# CyberLab V4 - Database Nyata, Registrasi & Autentikasi

CyberLab V4 mengubah **CTF Analyst Academy** (lab statis di
[`../ctf-analyst-academy/`](../ctf-analyst-academy/)) menjadi workstation
dengan **akun pengguna sungguhan**: registrasi yang benar-benar menulis baris
ke MySQL, login terverifikasi `password_verify()`, sesi PHP yang aman,
dashboard personal, dan progres CTF persisten per akun - divalidasi ulang di
server pada setiap solve.

Seluruh tampilan dan fitur lama dipertahankan apa adanya: 102 challenge,
5 campaign Mystery Archive, terminal simulator, web/SQL/XSS lab, generator
latihan, badge, writeup, dan animasi tab-nya. Berkas-berkas frontend itu
**tidak diduplikasi**; workstation V4 memuat aset asli dari folder sebelah
(lihat bagian 3).

> **Kejujuran status pengujian.** Kode ini ditulis dan diuji di sandbox
> tanpa PHP/MySQL native. Karena itu suite tes dijalankan di atas
> **PHP 8.3 asli (PHP-WASM)** dengan PDO SQLite: kode, query, sesi, dan
> hashing yang sama persis dengan produksi - hanya `DB_DRIVER` yang
> berbeda. Skema MySQL tervalidasi parse dan seluruh query diaudit manual
> untuk kompatibilitas MySQL (native prepare), **tetapi koneksi MySQL
> sungguhan belum pernah dijalankan di lingkungan itu** karena tidak ada
> server MySQL yang bisa diinstal di sana. Langkah 2 di bawah adalah jalur
> MySQL produksi; jalankan `tests/run.php` sekali di mesin Anda (bagian 9)
> sebagai verifikasi akhir.

---

## 1. Kebutuhan sistem & instalasi PHP + MySQL

| Komponen | Versi minimum | Catatan |
|---|---|---|
| PHP | 8.2+ | ekstensi: `pdo`, `pdo_mysql` (produksi) / `pdo_sqlite` (dev), `session`, `mbstring`, `json` |
| MySQL | 8.0+ atau MariaDB 10.4+ | produksi |
| Node.js | 18+ (opsional) | penilaian server untuk 2 challenge kode + ekspor katalog |
| Web server | Apache/Nginx, atau `php -S` untuk dev | document root = `cyberlab/public/` |

Contoh instalasi:

```bash
# Ubuntu/Debian
sudo apt install php-cli php-mysql php-mbstring mysql-server

# Windows (XAMPP): instal XAMPP 8.2+, start Apache + MySQL dari control panel.
# macOS: brew install php mysql
```

Verifikasi: `php -v` dan `php -m | grep -i pdo`.

## 2. Membuat database & mengimpor skema

### Cara A - phpMyAdmin

1. Buka phpMyAdmin, klik tab **Import**, pilih file `database/schema.sql`.
2. File itu membuat database `cyberlab_db` **dan** ketujuh tabelnya
   (`users`, `user_profiles`, `user_progress`, `challenge_submissions`,
   `user_achievements`, `user_settings`, `login_attempts`).

### Cara B - MySQL CLI

```bash
mysql -u root -p < cyberlab/database/schema.sql
```

### Cara C - lewat skrip proyek (MySQL yang databasenya sudah ada, atau SQLite)

```bash
php cyberlab/bin/migrate.php
```

Disarankan membuat user database khusus aplikasi (jangan pakai root):

```sql
CREATE USER 'cyberlab'@'localhost' IDENTIFIED BY 'password-kuat-anda';
GRANT SELECT, INSERT, UPDATE, DELETE ON cyberlab_db.* TO 'cyberlab'@'localhost';
FLUSH PRIVILEGES;
```

> Tidak ada seed akun dan tidak ada password bawaan di mana pun dalam proyek
> ini. Admin pertama dibuat sengaja lewat CLI (bagian 5).

## 3. Konfigurasi environment & aset frontend

```bash
cd cyberlab
cp .env.example .env     # lalu isi DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD
```

Variabel yang dibaca (`app/config/database.php`):

| Variabel | Default | Keterangan |
|---|---|---|
| `DB_DRIVER` | `mysql` | `mysql` produksi, `sqlite` dev/test |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | `127.0.0.1`, `3306`, `cyberlab_db`, `cyberlab`, kosong | kredensial MySQL |
| `DB_SQLITE_PATH` | `storage/cyberlab.sqlite3` | hanya untuk `DB_DRIVER=sqlite` |
| `SESSION_SECURE` | otomatis | `1` untuk memaksa cookie `Secure` di balik HTTPS/proxy |
| `CODE_RUNNER_NODE` | kosong | path binary Node.js untuk menilai challenge kode di server |

`PDO` dikonfigurasi `ERRMODE_EXCEPTION` + **emulated prepares mati**
(prepared statement asli). `.env` tidak pernah di-commit (sudah di
`.gitignore`); yang ter-commit hanya `.env.example` berisi placeholder.

**Aset frontend.** `public/index.php` memuat aset workstation asli
(`assets/css/style.css`, `assets/js/*.js`, `assets/js/data/*.js`). Pilih
salah satu:

- **Di dalam repositori ini (dev):** tidak perlu apa-apa bila memakai router
  bawaan (bagian 4) - router mengalihkannya ke
  `../ctf-analyst-academy/assets`.
- **Deploy mandiri (XAMPP/Apache/Nginx):** jalankan sekali
  `php bin/sync-assets.php` untuk menyalin aset ke `cyberlab/public/assets/`
  (berkas salinan itu sengaja di-gitignore; sumber kebenarannya tetap di
  folder academy), atau buat alias web server `/assets` ke folder tersebut.

Bila dataset challenge berubah, segarkan katalog server:
`node tools/export-catalog.js` (menulis `app/data/challenges.json` dari
dataset JS asli, dalam urutan registrasi browser, lengkap dengan flag dan
aturan jawaban untuk validasi server).

## 4. Menjalankan aplikasi

```bash
# Pengembangan - server bawaan PHP (router mengurus alias aset)
php -S 0.0.0.0:8080 -t cyberlab/public cyberlab/bin/serve-router.php
# buka http://localhost:8080/  -> Anda diarahkan ke login.php
```

Produksi: arahkan document root Apache/Nginx ke `cyberlab/public/`.
Semua folder lain (`app/`, `database/`, `bin/`, `storage/`, `tests/`,
`tools/`) berada **di luar** web root dan masing-masing juga dilindungi
`.htaccess` *deny all* sebagai pertahanan berlapis.

**Tanpa PHP/MySQL sama sekali?** `tests/wasm/serve.mjs` menjalankan halaman
PHP yang sama persis di PHP-WASM + SQLite untuk keperluan demo/preview
(`cd tests/wasm && npm install && npm run serve`). Itu alat bantu dev, bukan
server produksi - datanya hidup di memori proses.

## 5. Mendaftarkan pengguna pertama & membuat admin

1. Buka `register.php`, isi username, email, password
   (min. 10 karakter: huruf kecil + huruf besar + angka), konfirmasi, dan
   persetujuan ketentuan. Akun baru selalu ber-role `user`.
2. Masuk lewat `login.php` (username **atau** email).
3. Admin pertama - sengaja hanya bisa dari shell server:

```bash
php cyberlab/bin/create-admin.php <username> <email>     # buat akun admin baru
php cyberlab/bin/create-admin.php --promote-existing <username-terdaftar>
```

Skrip ini **menolak jalan bila sudah ada administrator** (kecuali diberi
flag `--force` secara eksplisit), meminta password dua kali dengan input
tersembunyi, dan tidak punya password default. Setelah admin pertama ada,
promote/demote/aktivasi dilakukan dari panel `admin.php` - setiap aksi
dicek ulang role-nya dari database di server, dengan perlindungan "admin
terakhir tidak bisa diturunkan/dinonaktifkan" dan "admin tidak bisa
mengutak-atik akunnya sendiri".

## 6. Memverifikasi registrasi benar-benar masuk MySQL

Setelah mendaftar lewat `register.php`:

```sql
USE cyberlab_db;
SELECT id, username, email, role, is_active, created_at, last_login_at,
       LEFT(password_hash, 7) AS hash_prefix FROM users;   -- "$2y$..." = bcrypt password_hash()
SELECT * FROM user_profiles;    -- profil terhubung ke user_id
SELECT * FROM user_progress;    -- baris agregat nol untuk akun baru
SELECT * FROM user_settings;    -- preferensi default
```

Selesaikan satu challenge di workstation, lalu periksa:

```sql
SELECT challenge_id, status, attempt_count, hints_used, points_awarded, xp_awarded, solved_at
FROM challenge_submissions WHERE user_id = <id-anda>;
SELECT total_xp, total_points, current_level, challenges_solved FROM user_progress WHERE user_id = <id-anda>;
SELECT achievement_code, earned_at FROM user_achievements WHERE user_id = <id-anda>;  -- FIRST_BLOOD
```

Angka-angka itu dihitung server dari katalog challenge; browser tidak bisa
menentukan XP/poin/statusnya sendiri.

## 7. Arsitektur & keputusan keamanan (ringkas)

```
cyberlab/
├── public/            index.php (workstation terproteksi), login.php, register.php,
│                      logout.php, profile.php, admin.php, api/{progress,submit,migrate,settings}.php
│                      assets/css/auth.css, assets/js/{auth.js,server-bridge.js}  (+ aset academy via router/sync)
├── app/               bootstrap, config/database.php, lib/ (Session, Csrf, Validator,
│                      Catalog, Scoring), models/ (3 repository PDO), services/
│                      (Auth, Challenge, Achievement, Migration, Admin, CodeRunner),
│                      middleware/AuthGuard, views/layout, data/challenges.json
├── database/          schema.sql (MySQL) + schema.sqlite.sql (dev/test) + migrations/
├── bin/               migrate.php, create-admin.php, sync-assets.php, serve-router.php
├── tools/             export-catalog.js (dataset JS -> katalog server)
└── tests/             run.php (103 pemeriksaan) + wasm/ (http-test.mjs 37, code-runner 7, serve.mjs)
```

Keputusan penting:

- **Flag divalidasi ulang di server** untuk 102 challenge (aturan cermin
  persis dari `CTF.checkAnswer`/`CTF.normalize`). Award (XP dasar per
  difficulty, penalti hint 0/0/−10%/−25%, bonus first-solve +50, no-hint
  +25, perfect +100, kurva level `n×250`) dihitung server dari katalog;
  field `xp/points/user_id` dari browser tidak pernah dibaca.
- **Satu solve dibayar sekali**: transaksi tunggal (submission + progress +
  achievement), `UNIQUE(user_id, challenge_id)`, status solved
  short-circuit, dan *attempt count* wewenang server (menentukan bonus
  perfect). Kegagalan di tengah transaksi me-rollback semuanya.
- **Batas jujur yang melekat pada lab offline**: dataset yang dikirim ke
  browser memuat flag dan teks hint (itulah cara lab bekerja dari
  `file://`). Server menjamin integritas akuntansi (tidak ada total palsu,
  award ganda, atau tulisan lintas-akun) dan membatasi `hintsUsed` ke 0–3
  untuk penalti resmi - bukan kerahasiaan flag dari pemilik browsernya
  sendiri. Untuk deployment kompetitif serius, dataset harus dipindah ke
  server dan flag dikeluarkan dari berkas JS.
- **Challenge kode** (CODE-001/002) dinilai server dengan menjalankan tabel
  tes di `node:vm` (timeout 1 dtk/tes, tanpa `require`/`process`/fs/jaringan)
  bila `CODE_RUNNER_NODE` diisi. Bila tidak, API menjawab jujur
  `code_runner_unavailable` dan **tidak** memberi poin tanpa verifikasi;
  flag challenge tetap diterima seperti challenge lain. `vm` adalah sandbox
  pelatihan, bukan batas keamanan untuk kode musuh - jalankan web tier
  sebagai user tak berhak.
- **Sesi**: cookie `CYBERLABSESSID` `HttpOnly` + `SameSite=Lax` (+`Secure`
  saat HTTPS), strict mode, regenerasi id saat login & ganti password,
  batas absolut 8 jam, logout menghancurkan sesi server dan meng-expire
  cookie. Tidak ada token auth di `localStorage`.
- **Anti-enumerasi + throttling login**: pesan gagal generik yang identik
  untuk "akun tidak ada / password salah / akun nonaktif", verify dummy
  untuk akun tak dikenal, dan kunci sementara setelah 5 kegagalan dalam
  15 menit per identifier/IP (`login_attempts` - tanpa pernah mencatat
  password).
- **CSRF** token per sesi (dibandingkan `hash_equals`) di semua form POST
  dan endpoint JSON; output HTML selalu di-escape (`e()`); semua query
  prepared statement; id target selalu dari sesi, never dari parameter -
  mengubah id di URL/body tidak membuka data pengguna lain.
- **Badge**: 21 dari 22 badge dievaluasi server dari fakta database.
  `GENERATOR_ADEPT` tetap lokal-perangkat (flag latihan prosedural hanya
  ada di perangkat pembuatnya), sama seperti **catatan writeup** dan **XP
  practice** - ketiganya dilabeli jelas di UI dan tidak pernah disamarkan
  sebagai data server.
- **Migrasi localStorage**: setelah login, bridge menawarkan impor progres
  lama dari browser. Server memvalidasi id terhadap katalog, membuang
  duplikat/yang sudah solved, mengabaikan total dari klien, dan menghitung
  ulang semua award (memutar ulang riwayat berdasarkan waktu solve).
  Salinan asli localStorage dicadangkan ke kunci
  `ctf-analyst-academy.progress.v1.backup-cyberlab-v4`, tidak dihapus.

## 8. Troubleshooting koneksi database

| Gejala | Penyebab umum & perbaikan |
|---|---|
| "Koneksi database gagal..." di halaman | Periksa `.env` (DB_HOST/PORT/NAME/USER/PASSWORD), server MySQL berjalan, user punya hak ke `cyberlab_db`. Detail teknis ada di log PHP (`error_log`), sengaja tidak ditampilkan ke pengguna. |
| `Unknown database 'cyberlab_db'` | Impor `database/schema.sql` (membuat databasenya) atau `CREATE DATABASE cyberlab_db ...` dulu, baru `php bin/migrate.php`. |
| `Access denied for user` | Password di `.env` salah atau `GRANT` belum diberikan (lihat bagian 2). |
| `could not find driver` | Ekstensi `pdo_mysql`/`pdo_sqlite` belum aktif: `php -m`, aktifkan di `php.ini`, restart web server. |
| Halaman workstation polos tanpa gaya/data | Aset academy belum tersedia: jalankan `php bin/sync-assets.php` atau gunakan `bin/serve-router.php`. |
| Challenge kode selalu "tidak tersedia" | Isi `CODE_RUNNER_NODE` dengan path Node.js (mis. `/usr/bin/node`) lalu restart. |
| Tetap ter-redirect ke login setelah masuk | Cookie sesi terblokir: cek jam server, `session.save_path` dapat ditulis, dan `SESSION_SECURE` tidak memaksa `Secure` saat situs masih HTTP polos. |

## 9. HTTPS & menjalankan pengujian

**HTTPS (produksi).** Pasang sertifikat (mis. Let's Encrypt) di Apache/Nginx,
paksa redirect HTTP→HTTPS (contoh aturan ada di `public/.htaccess`), lalu
set `SESSION_SECURE=1` bila PHP berada di belakang reverse-proxy agar cookie
sesi selalu ber-flag `Secure`. Aplikasi juga mendeteksi `X-Forwarded-Proto`.

**Pengujian:**

```bash
# Di mesin ber-PHP (membuat DB SQLite in-memory; tidak menyentuh .env Anda):
php cyberlab/tests/run.php

# Tanpa PHP native (PHP-WASM 8.3 + SQLite; yang dipakai menguji rilis ini):
cd cyberlab/tests/wasm && npm install
npm run test:unit          # 103 pemeriksaan layanan & repository
npm run test:http          # 37 pemeriksaan request-cycle (sesi, CSRF, API, isolasi)
npm run test:code-runner   # 7 pemeriksaan grader kode tersandbox

# Regresi lab lama (harus tetap hijau, tidak diubah V4):
node ctf-analyst-academy/tools/verify.js
node ctf-analyst-academy/tools/smoke.js
```

Cakupan `run.php` mencakup seluruh daftar wajib: registrasi sukses/duplikat
(username & email, case-insensitive)/data invalid, hashing, login
sukses/salah/nonaktif/throttle/anti-enumerasi, logout, regenerasi sesi,
CSRF, injeksi SQL (login & pencarian admin), pembaruan profil & settings,
ganti password, progres persisten, pencegahan award ganda, rollback
transaksi (dipaksa gagal di tengah), isolasi antar-pengguna (termasuk
`user_id` selundupan), penjaga admin, perhitungan ulang migrasi, penolakan
kode tanpa runner, paritas skor & jawaban terhadap engine JS (102
challenge), dan kegagalan koneksi database. Hasil terverifikasi saat rilis:
**103/103, 37/37, dan 7/7 lulus** (PHP-WASM 8.3 + SQLite); suite academy
tetap **2305 assertions + 1415 smoke checks** lulus. Yang **belum**
terverifikasi di lingkungan pembuatan: koneksi MySQL sungguhan dan eksekusi
`bin/*` di PHP CLI native (keduanya menunggu mesin ber-PHP/MySQL - jalankan
bagian ini sekali saat instalasi).

## 10. Catatan kebijakan

- **Email yang bisa diubah**: wajib unik; perubahan berlaku segera karena
  lab ini tidak memiliki infrastruktur pengiriman email verifikasi
  (didokumentasikan juga di halaman profil).
- **Data fiktif**: seluruh host/identitas/flag di dalam challenge adalah
  rekaan pelatihan (`.invalid`, rentang dokumentasi) seperti versi
  sebelumnya; yang nyata di V4 hanyalah akun dan progres Anda sendiri.
