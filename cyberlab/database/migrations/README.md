# Migrasi Database CyberLab

Skema **V4 adalah baseline**: buat database baru langsung dari
[`../schema.sql`](../schema.sql) (MySQL/MariaDB) atau
[`../schema.sqlite.sql`](../schema.sqlite.sql) (SQLite untuk dev/test),
atau jalankan `php bin/migrate.php`.

Folder ini disediakan untuk perubahan skema **setelah** baseline V4.
Konvensinya:

1. Satu file per perubahan, diberi nomor urut:
   `0002-tambah-kolom-contoh.mysql.sql` dan padanannya
   `0002-tambah-kolom-contoh.sqlite.sql`.
2. Migrasi harus idempoten sebisa mungkin (`IF NOT EXISTS`, `ALTER ...` yang
   aman dijalankan ulang tidak dijamin di semua versi MySQL - dokumentasikan
   prasyaratnya di header file).
3. Jangan pernah mengubah file migrasi yang sudah diterapkan di server mana
   pun; buat migrasi baru.
4. Setelah mengubah dataset challenge (bukan skema), yang diperbarui adalah
   katalog server: `node tools/export-catalog.js` - itu bukan migrasi SQL.
