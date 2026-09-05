# Pemeriksa password sederhana

# 1. Simpan password yang benar
password_benar = "kondisu"

# 2. Minta pengguna memasukkan password
input_user = input("Masukkan password: ")

# 3. Cek apakah password yang dimasukkan benar
if input_user == password_benar:
    print("Akses diterima!")
else:
    print("Akses ditolak. Password salah.")